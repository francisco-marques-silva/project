const express = require('express');
const router = express.Router();
const config = require('../core/config');
const { getAvailableSearchers } = require('../search');
const { getAvailableProviders } = require('../analysis/llmCaller');

// GET /api/config/status
router.get('/status', (req, res) => {
  const status = {
    llm: {
      openai: !!config.llm.openai.apiKey,
      anthropic: !!config.llm.anthropic.apiKey,
      gemini: !!config.llm.gemini.apiKey
    },
    databases: {
      pubmed: true,
      scopus: !!config.databases.scopus.apiKey,
      wos: !!config.databases.wos.apiKey,
      embase: !!config.databases.embase.apiKey
    },
    database: !!config.database.url
  };
  res.json({ status });
});

// GET /api/config/llm-providers
router.get('/llm-providers', (req, res) => {
  const providers = getAvailableProviders();
  res.json({ providers });
});

// GET /api/config/databases
router.get('/databases', (req, res) => {
  const databases = getAvailableSearchers();
  res.json({ databases });
});

module.exports = router;
