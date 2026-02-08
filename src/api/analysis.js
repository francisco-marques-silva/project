const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../auth/service');
const llmCaller = require('../analysis/llmCaller');
const { Project, ProjectArticle, ScreeningEvent } = require('../models');

// GET /api/analysis/providers
router.get('/providers', authMiddleware, (req, res) => {
  try {
    const providers = llmCaller.getAvailableProviders();
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/analysis/models
router.get('/models', authMiddleware, (req, res) => {
  try {
    const models = llmCaller.getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analysis/test-connection
router.post('/test-connection', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.body;
    if (!provider) return res.status(400).json({ error: 'Provider is required' });

    const p = llmCaller.getProvider(provider);
    if (!p) return res.status(404).json({ error: `Provider '${provider}' not found` });
    if (!p.isAvailable()) return res.status(400).json({ error: `Provider '${provider}' not configured` });

    const result = await p.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analysis/preview-prompt
router.post('/preview-prompt', authMiddleware, async (req, res) => {
  try {
    const { article, pico_question, inclusion_criteria, exclusion_criteria } = req.body;
    if (!article || !pico_question) {
      return res.status(400).json({ error: 'Article and PICO question are required' });
    }

    const prompt = llmCaller.buildScreeningPrompt(article, {
      pico_question, inclusion_criteria, exclusion_criteria
    });
    res.json({ prompt });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analysis/single — screen a single article (test)
router.post('/single', authMiddleware, async (req, res) => {
  try {
    const { article, provider, model, pico_question, inclusion_criteria, exclusion_criteria } = req.body;
    if (!article || !provider || !pico_question) {
      return res.status(400).json({ error: 'Article, provider, and PICO question are required' });
    }

    const result = await llmCaller.screenArticle(
      article,
      { pico_question, inclusion_criteria, exclusion_criteria },
      provider, model
    );
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analysis/screen — screen a single article and save
router.post('/screen', authMiddleware, async (req, res) => {
  try {
    const { article, provider, model, pico_question, inclusion_criteria, exclusion_criteria, projectId, articleId } = req.body;
    if (!article || !provider || !pico_question) {
      return res.status(400).json({ error: 'Article, provider, and PICO question are required' });
    }

    const result = await llmCaller.screenArticle(
      article,
      { pico_question, inclusion_criteria, exclusion_criteria },
      provider, model
    );

    if (projectId) {
      await ScreeningEvent.create({
        project_id: projectId,
        article_id: articleId || null,
        user_id: req.userId,
        actor_type: 'ai',
        screener_type: 'ai',
        model_name: result.model,
        decision: result.decision,
        reasoning: result.reasoning || result.rationale,
        reason: result.reasoning || result.rationale,
        pico_question,
        inclusion_criteria,
        exclusion_criteria,
        prompt_used: result.prompt,
        raw_response: {
          content: result.rawResponse,
          usage: result.usage,
          inclusion_evaluation: result.inclusion_evaluation,
          exclusion_evaluation: result.exclusion_evaluation
        },
        prompt_tokens: result.usage?.promptTokens || null,
        completion_tokens: result.usage?.completionTokens || null,
        total_tokens: result.usage?.totalTokens || null
      });

      if (articleId) {
        await ProjectArticle.update(
          { screening_status: result.decision },
          { where: { id: articleId } }
        );
      }
    }

    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/analysis/batch-screen — SSE batch screening
router.post('/batch-screen', authMiddleware, async (req, res) => {
  try {
    const { projectId, provider, model, pico_question, inclusion_criteria, exclusion_criteria } = req.body;
    if (!projectId || !provider || !pico_question) {
      return res.status(400).json({ error: 'projectId, provider, and pico_question are required' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const batchId = uuidv4();

    const articles = await ProjectArticle.findAll({
      where: { project_id: projectId, screening_status: 'pending' }
    });

    const total = articles.length;
    let completed = 0, included = 0, excluded = 0;

    res.write(`data: ${JSON.stringify({ type: 'start', total, batchId })}\n\n`);

    for (const article of articles) {
      try {
        if (!article.title) { completed++; continue; }

        const result = await llmCaller.screenArticle(
          { title: article.title, abstract: article.abstract, authors: article.authors, journal: article.journal, year: article.year },
          { pico_question, inclusion_criteria, exclusion_criteria },
          provider, model
        );

        await ScreeningEvent.create({
          project_id: projectId,
          article_id: article.id,
          user_id: req.userId,
          actor_type: 'ai',
          screener_type: 'ai',
          model_name: result.model,
          decision: result.decision,
          reasoning: result.reasoning || result.rationale,
          reason: result.reasoning || result.rationale,
          pico_question, inclusion_criteria, exclusion_criteria,
          prompt_used: result.prompt,
          raw_response: {
            content: result.rawResponse,
            usage: result.usage,
            inclusion_evaluation: result.inclusion_evaluation,
            exclusion_evaluation: result.exclusion_evaluation
          },
          prompt_tokens: result.usage?.promptTokens || null,
          completion_tokens: result.usage?.completionTokens || null,
          total_tokens: result.usage?.totalTokens || null,
          analysis_batch_id: batchId
        });

        await article.update({ screening_status: result.decision });

        completed++;
        if (result.decision === 'include') included++;
        if (result.decision === 'exclude') excluded++;

        res.write(`data: ${JSON.stringify({
          type: 'progress', completed, total, included, excluded,
          current: {
            articleId: article.id,
            title: article.title,
            decision: result.decision,
            rationale: result.rationale || result.reasoning,
            inclusion_evaluation: result.inclusion_evaluation,
            exclusion_evaluation: result.exclusion_evaluation,
            usage: result.usage
          }
        })}\n\n`);
      } catch (err) {
        completed++;
        res.write(`data: ${JSON.stringify({
          type: 'error', completed, total, articleId: article.id, error: err.message
        })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', total, completed, included, excluded, batchId })}\n\n`);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'fatal_error', error: error.message })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
