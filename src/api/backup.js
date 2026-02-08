const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth/service');
const { Project, Record, Work, Search, ScreeningEvent } = require('../models');

// POST /api/backup/export
router.post('/export', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId;

    const projects = await Project.findAll({ where: { user_id: userId } });
    const projectIds = projects.map(p => p.id);

    const searches = await Search.findAll({ where: { user_id: userId } });
    const records = await Record.findAll({
      where: { project_id: projectIds },
      include: [{ model: Work, as: 'work' }]
    });
    const screeningEvents = await ScreeningEvent.findAll({
      where: { user_id: userId }
    });

    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projects: projects.map(p => p.toJSON()),
      searches: searches.map(s => s.toJSON()),
      records: records.map(r => ({
        ...r.toJSON(),
        work: r.work?.toJSON()
      })),
      screeningEvents: screeningEvents.map(se => se.toJSON())
    };

    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/backup/import
router.post('/import', authMiddleware, async (req, res) => {
  try {
    const { projects, records } = req.body;
    
    if (!projects) {
      return res.status(400).json({ error: 'Invalid backup format' });
    }

    let imported = { projects: 0, records: 0 };

    for (const projectData of projects) {
      const project = await Project.create({
        user_id: req.userId,
        name: projectData.name + ' (imported)',
        description: projectData.description,
        research_question: projectData.research_question
      });
      imported.projects++;
    }

    res.json({ message: 'Import completed', imported });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
