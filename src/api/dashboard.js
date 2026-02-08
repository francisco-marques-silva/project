const express = require('express');
const router = express.Router();
const { Sequelize } = require('sequelize');
const { authMiddleware } = require('../auth/service');
const { Project, ProjectArticle, Search, ScreeningEvent, UserSearchHistory } = require('../models');

// GET /api/dashboard/stats
router.get('/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const projectIds = (await Project.findAll({
      where: { user_id: userId },
      attributes: ['id']
    })).map(p => p.id);

    const [projectCount, searchCount, articleCount, screeningCount, historyCount] = await Promise.all([
      Project.count({ where: { user_id: userId } }),
      Search.count({ where: { user_id: userId } }),
      projectIds.length > 0 ? ProjectArticle.count({ where: { project_id: projectIds } }) : 0,
      ScreeningEvent.count({ where: { user_id: userId } }),
      UserSearchHistory.count({ where: { user_id: userId } })
    ]);

    res.json({
      stats: {
        projects: projectCount,
        searches: searchCount,
        articles: articleCount,
        screenings: screeningCount,
        apiRequests: historyCount
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user.toSafeJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/activity
router.get('/activity', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = parseInt(req.query.limit) || 20;

    const recentSearches = await Search.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 10,
      include: [{ model: Project, as: 'project', attributes: ['name'] }]
    });

    const recentScreenings = await ScreeningEvent.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 10
    });

    const recentProjects = await Project.findAll({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']],
      limit: 5
    });

    const activities = [];

    for (const s of recentSearches) {
      activities.push({
        type: 'search',
        description: `Searched "${s.query_text || ''}" on ${s.source}`,
        details: `${s.results_count} results in project "${s.project?.name || 'Unknown'}"`,
        timestamp: s.created_at
      });
    }

    for (const se of recentScreenings) {
      activities.push({
        type: 'screening',
        description: `AI screening (${se.model_name || 'unknown'})`,
        details: `Decision: ${se.decision}`,
        timestamp: se.created_at
      });
    }

    for (const p of recentProjects) {
      activities.push({
        type: 'project',
        description: `Project "${p.name}"`,
        details: p.description?.substring(0, 100) || '',
        timestamp: p.updated_at
      });
    }

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ activities: activities.slice(0, limit) });
  } catch (error) {
    console.error('Dashboard activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/dashboard/token-usage — aggregated token usage per model
router.get('/token-usage', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;
    const where = { user_id: userId };
    if (req.query.from) where.created_at = { ...(where.created_at || {}), [Sequelize.Op.gte]: new Date(req.query.from) };
    if (req.query.to) {
      const toDate = new Date(req.query.to);
      toDate.setHours(23, 59, 59, 999);
      where.created_at = { ...(where.created_at || {}), [Sequelize.Op.lte]: toDate };
    }
    const results = await ScreeningEvent.findAll({
      where,
      attributes: [
        'model_name',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('prompt_tokens')), 'total_prompt'],
        [Sequelize.fn('SUM', Sequelize.col('completion_tokens')), 'total_completion'],
        [Sequelize.fn('SUM', Sequelize.col('total_tokens')), 'total_all']
      ],
      group: ['model_name'],
      order: [[Sequelize.fn('SUM', Sequelize.col('total_tokens')), 'DESC']]
    });

    res.json({
      usage: results.map(r => ({
        model: r.model_name || 'unknown',
        count: parseInt(r.getDataValue('count')) || 0,
        prompt_tokens: parseInt(r.getDataValue('total_prompt')) || 0,
        completion_tokens: parseInt(r.getDataValue('total_completion')) || 0,
        total_tokens: parseInt(r.getDataValue('total_all')) || 0
      }))
    });
  } catch (error) {
    console.error('Token usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
