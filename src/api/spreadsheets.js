const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../auth/service');
const { Project, ProjectArticle, ScreeningEvent, Search } = require('../models');
const { parseSpreadsheetBuffer, generateXLSX } = require('../services/spreadsheet');
const dbService = require('../services/dbService');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/spreadsheets/list — list user's projects
router.get('/list', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.findAll({
      where: { user_id: req.userId },
      order: [['updated_at', 'DESC']]
    });

    const enriched = await Promise.all(projects.map(async (p) => {
      const articleCount = await ProjectArticle.count({ where: { project_id: p.id } });
      const screeningCount = await ScreeningEvent.count({ where: { project_id: p.id } });
      return {
        ...p.toJSON(),
        article_count: articleCount,
        screening_count: screeningCount
      };
    }));

    res.json({ spreadsheets: enriched });
  } catch (error) {
    console.error('GET /list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spreadsheets/:id — get project details with articles
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const search = req.query.search || '';

    const result = await dbService.getProjectArticles(project.id, { page, limit, search });

    const articles = result.articles.map(a => ({
      id: a.id,
      title: a.title || '',
      abstract: a.abstract || '',
      authors: a.authors || '',
      journal: a.journal || '',
      year: a.year,
      doi: a.doi || '',
      pmid: a.pmid || '',
      source: a.source || '',
      screening_status: a.screening_status || 'pending',
      is_duplicate: a.is_duplicate,
      keywords: a.keywords || '',
      publication_type: a.publication_type || '',
      url: a.url || '',
      volume: a.volume || '',
      issue: a.issue || '',
      pages: a.pages || '',
      language: a.language || '',
      issn: a.issn || '',
      notes: a.notes || '',
      work_id: a.work_id
    }));

    res.json({
      project: project.toJSON(),
      articles,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages
    });
  } catch (error) {
    console.error('GET /:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spreadsheets/article/:articleId/screening — get AI screening results for an article
router.get('/article/:articleId/screening', authMiddleware, async (req, res) => {
  try {
    const events = await ScreeningEvent.findAll({
      where: { article_id: req.params.articleId },
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.json({
      screenings: events.map(e => {
        const raw = e.raw_response || {};
        return {
          id: e.id,
          decision: e.decision,
          reasoning: e.reasoning || e.reason,
          model_name: e.model_name,
          inclusion_evaluation: raw.inclusion_evaluation || [],
          exclusion_evaluation: raw.exclusion_evaluation || [],
          prompt_tokens: e.prompt_tokens,
          completion_tokens: e.completion_tokens,
          total_tokens: e.total_tokens,
          created_at: e.created_at
        };
      })
    });
  } catch (error) {
    console.error('GET /article/:articleId/screening error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/spreadsheets/create — create a new project
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { name, description, research_question } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });

    const project = await Project.create({
      user_id: req.userId,
      name,
      description: description || '',
      research_question: research_question || ''
    });

    res.status(201).json({ project: project.toJSON(), message: 'Project created successfully' });
  } catch (error) {
    console.error('POST /create error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/spreadsheets/upload — upload XLSX/CSV
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const projectId = req.body.projectId;
    if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

    const project = await Project.findOne({
      where: { id: projectId, user_id: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { articles } = parseSpreadsheetBuffer(req.file.buffer, req.file.originalname);

    const result = await dbService.addUploadedArticles(projectId, articles);

    res.json({
      message: `Imported ${result.savedCount} articles (${result.duplicateCount} duplicates skipped)`,
      totalParsed: result.total,
      savedCount: result.savedCount,
      duplicateCount: result.duplicateCount
    });
  } catch (error) {
    console.error('POST /upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/spreadsheets/:id/download — download project articles as XLSX
router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const articles = await ProjectArticle.findAll({
      where: { project_id: project.id },
      order: [['created_at', 'ASC']]
    });

    // Get screening events for enrichment
    const screeningEvents = await ScreeningEvent.findAll({
      where: { project_id: project.id }
    });

    const screeningMap = {};
    for (const se of screeningEvents) {
      const key = se.article_id;
      if (key && (!screeningMap[key] || se.createdAt > screeningMap[key].createdAt)) {
        screeningMap[key] = se;
      }
    }

    const exportData = articles.map(a => {
      const se = screeningMap[a.id];
      return {
        title: a.title,
        abstract: a.abstract,
        authors: a.authors,
        journal: a.journal,
        year: a.year,
        doi: a.doi,
        pmid: a.pmid,
        publication_type: a.publication_type,
        keywords: a.keywords,
        volume: a.volume,
        issue: a.issue,
        pages: a.pages,
        issn: a.issn,
        language: a.language,
        url: a.url,
        screening_status: a.screening_status,
        ai_decision: se?.decision || '',
        ai_confidence: se?.confidence || '',
        ai_reasoning: se?.reasoning || se?.reason || ''
      };
    });

    const buffer = generateXLSX(exportData);
    const filename = `${project.name.replace(/[^a-z0-9]/gi, '_')}_articles.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('GET /download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/spreadsheets/:id/update — project actions (add/delete article, update project)
router.post('/:id/update', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { action, articleId, recordId, articleData } = req.body;

    // Support both articleId and recordId for backward compat
    const targetId = articleId || recordId;

    if (action === 'delete' && targetId) {
      await dbService.deleteArticle(targetId, project.id);
      return res.json({ message: 'Article removed' });
    }

    if (action === 'add' && articleData) {
      const article = await dbService.addManualArticle(project.id, articleData);
      return res.json({ message: 'Article added', article: article.toJSON() });
    }

    if (action === 'update-project') {
      const { name, description, research_question } = req.body;
      if (name) project.name = name;
      if (description !== undefined) project.description = description;
      if (research_question !== undefined) project.research_question = research_question;
      await project.save();
      return res.json({ message: 'Project updated', project: project.toJSON() });
    }

    res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('POST /update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/spreadsheets/:id — delete a project (CASCADE handles children)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    // CASCADE delete handles: screening_events, project_articles, searches, search_results
    await project.destroy();

    res.json({ message: 'Project and all associated data deleted' });
  } catch (error) {
    console.error('DELETE /:id error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
