const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const Spreadsheet = sequelize.define('Spreadsheet', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  articles: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  article_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  has_analysis: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'spreadsheets',
  timestamps: true,
  underscored: true
});

module.exports = Spreadsheet;
