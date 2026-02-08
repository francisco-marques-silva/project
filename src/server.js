require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./core/config');
const { testConnection } = require('./core/database');

// Import routes
const authRoutes = require('./api/auth');
const databaseRoutes = require('./api/databases');
const spreadsheetRoutes = require('./api/spreadsheets');
const analysisRoutes = require('./api/analysis');
const dashboardRoutes = require('./api/dashboard');
const configRoutes = require('./api/config');
const backupRoutes = require('./api/backup');
const dataAnalysisRoutes = require('./api/dataAnalysis');

const app = express();

// ===== Middleware =====
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ===== Initialize models (lazy, once for Vercel) =====
let modelsLoaded = false;
let modelsError = null;
async function ensureModels() {
  if (modelsLoaded) return true;
  if (modelsError) return false;
  try {
    await testConnection();
    require('./models');
    const { sequelize } = require('./core/database');
    await sequelize.sync({ alter: false });
    modelsLoaded = true;
    console.log('✅ Models loaded and synced successfully.');
    return true;
  } catch (error) {
    modelsError = error.message;
    console.error('❌ Failed to initialize models:', error.message);
    return false;
  }
}

// Middleware to ensure models are loaded before handling requests
app.use(async (req, res, next) => {
  const ok = await ensureModels();
  if (!ok) {
    return res.status(503).json({ 
      error: 'Database connection failed. Please check POSTGRES_URL configuration.',
      detail: modelsError 
    });
  }
  next();
});

// ===== Static files (local only - Vercel serves these directly) =====
if (!process.env.VERCEL) {
  app.use(express.static(path.join(__dirname, '..', 'frontend')));
}

// ===== API Routes =====
app.use('/api/auth', authRoutes);
app.use('/api/databases', databaseRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/data-analysis', dataAnalysisRoutes);

// ===== Health checks =====
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// ===== Frontend routes (local only - Vercel handles these via vercel.json) =====
if (!process.env.VERCEL) {
  app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html')));
  app.get('/portal', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'portal.html')));
  app.get('/search-review', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'search-review.html')));
  app.get('/data-analysis', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'data-analysis.html')));

  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Endpoint not found' });
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
  });
}

// ===== Error handling =====
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ===== Start server (only when running locally, not on Vercel) =====
if (process.env.VERCEL !== '1') {
  async function startServer() {
    try {
      const dbOk = await testConnection();
      if (!dbOk) {
        console.error('Failed to connect to database. Check POSTGRES_URL in .env');
        process.exit(1);
      }

      require('./models');
      modelsLoaded = true;
      console.log('✅ Models loaded successfully.');

      const PORT = config.port;
      app.listen(PORT, () => {
        console.log(`\n🚀 Research Portal running at http://localhost:${PORT}`);
        console.log(`📊 Dashboard: http://localhost:${PORT}/portal`);
        console.log(`🔍 Search & Review: http://localhost:${PORT}/search-review`);
        console.log(`📈 Data Analysis: http://localhost:${PORT}/data-analysis`);
        console.log(`❤️  Health check: http://localhost:${PORT}/health\n`);
      });
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  startServer();
}

// Export for Vercel serverless
module.exports = app;
