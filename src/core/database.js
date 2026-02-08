const { Sequelize } = require('sequelize');
const config = require('./config');

// Explicit require so Vercel's bundler includes pg in the build
const pg = require('pg');

// Disable SSL rejection at pg driver level for Supabase/Vercel pooled connections
if (config.database.url && !config.database.url.includes('localhost')) {
  pg.defaults.ssl = { rejectUnauthorized: false };
}

// Remove sslmode from URL to avoid conflicts with dialectOptions
let dbUrl = config.database.url;
if (dbUrl) {
  dbUrl = dbUrl.replace(/[?&]sslmode=[^&]*/g, '');
  // Clean up trailing ? if sslmode was the only param
  dbUrl = dbUrl.replace(/\?$/, '');
}

const sequelize = new Sequelize(dbUrl, {
  dialect: config.database.dialect,
  logging: config.database.logging,
  pool: config.database.pool,
  dialectOptions: config.database.dialectOptions
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error.message);
    return false;
  }
}

module.exports = { sequelize, testConnection };
