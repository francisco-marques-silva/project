const { Sequelize } = require('sequelize');
const config = require('./config');

const sequelize = new Sequelize(config.database.url, {
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
