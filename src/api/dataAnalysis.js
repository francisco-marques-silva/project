const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth/service');
const { Dataset } = require('../models');
const multer = require('multer');
const XLSX = require('xlsx');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/data-analysis/datasets
router.get('/datasets', authMiddleware, async (req, res) => {
  try {
    const datasets = await Dataset.findAll({
      where: { user_id: req.userId },
      attributes: ['id', 'name', 'description', 'row_count', 'columns', 'source', 'created_at', 'updated_at'],
      order: [['updated_at', 'DESC']]
    });
    res.json({ datasets });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/data-analysis/datasets/:id
router.get('/datasets/:id', authMiddleware, async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    res.json({ dataset });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/data-analysis/upload
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const columns = data.length > 0 ? Object.keys(data[0]) : [];

    const dataset = await Dataset.create({
      user_id: req.userId,
      name: req.body.name || req.file.originalname,
      description: req.body.description || '',
      data,
      columns,
      row_count: data.length,
      source: 'upload'
    });

    res.status(201).json({
      dataset: {
        id: dataset.id,
        name: dataset.name,
        row_count: dataset.row_count,
        columns: dataset.columns
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/data-analysis/datasets/:id
router.delete('/datasets/:id', authMiddleware, async (req, res) => {
  try {
    const dataset = await Dataset.findOne({
      where: { id: req.params.id, user_id: req.userId }
    });
    if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
    
    await dataset.destroy();
    res.json({ message: 'Dataset deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
