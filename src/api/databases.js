const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth/service');
const { getSearcher, getAvailableSearchers } = require('../search');
const dbService = require('../services/dbService');
const { UserSearchHistory } = require('../models');

// GET /api/databases/available
router.get('/available', authMiddleware, (req, res) => {
  try {
    const databases = getAvailableSearchers();
    res.json({ databases });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/databases/publication-types
router.get('/publication-types', authMiddleware, (req, res) => {
  res.json({
    types: [
      'Journal Article', 'Review', 'Systematic Review', 'Meta-Analysis',
      'Randomized Controlled Trial', 'Clinical Trial', 'Case Reports',
      'Letter', 'Editorial', 'Comment', 'Guideline', 'Practice Guideline',
      'Observational Study', 'Comparative Study'
    ]
  });
});

// POST /api/databases/search
router.post('/search', authMiddleware, async (req, res) => {
  try {
    const { query, databases: dbList, yearStart, yearEnd, maxResults, projectId, publicationTypes } = req.body;

    if (!query) return res.status(400).json({ error: 'Search query is required' });
    if (!projectId) return res.status(400).json({ error: 'Project ID is required' });

    const selectedDbs = dbList || ['pubmed'];
    const results = {};
    let totalArticles = 0;

    for (const dbName of selectedDbs) {
      const searcher = getSearcher(dbName);
      if (!searcher) {
        results[dbName] = { error: `Database '${dbName}' not found`, articles: [] };
        continue;
      }
      if (!searcher.isAvailable()) {
        results[dbName] = { error: `Database '${dbName}' not configured (API key missing)`, articles: [] };
        continue;
      }

      try {
        const searchResult = await searcher.search(query, {
          yearStart: yearStart ? parseInt(yearStart) : undefined,
          yearEnd: yearEnd ? parseInt(yearEnd) : undefined,
          maxResults: maxResults ? parseInt(maxResults) : 100,
          publicationTypes
        });

        const saveResult = await dbService.saveSearchResults(
          projectId,
          req.userId,
          {
            database: dbName,
            query,
            yearStart,
            yearEnd,
            maxResults,
            filters: { publicationTypes }
          },
          searchResult.articles
        );

        results[dbName] = {
          totalFound: searchResult.totalCount,
          retrieved: searchResult.articles.length,
          savedNew: saveResult.savedCount,
          duplicates: saveResult.duplicateCount,
          articles: searchResult.articles.slice(0, 20),
          searchId: saveResult.search.id
        };

        totalArticles += searchResult.articles.length;
      } catch (error) {
        console.error(`Search error [${dbName}]:`, error);
        results[dbName] = { error: error.message, articles: [] };
      }
    }

    res.json({ query, totalArticles, results });
  } catch (error) {
    console.error('POST /search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/databases/history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const history = await UserSearchHistory.findAll({
      where: { user_id: req.userId },
      order: [['last_searched_at', 'DESC']],
      limit: 100
    });
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/databases/history/:id
router.delete('/history/:id', authMiddleware, async (req, res) => {
  try {
    const entry = await UserSearchHistory.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!entry) return res.status(404).json({ error: 'History entry not found' });
    await entry.destroy();
    res.json({ message: 'History entry deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
