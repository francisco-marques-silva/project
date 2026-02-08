const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const Search = sequelize.define('Search', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  project_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  query_text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  results_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  imported_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  search_metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  year_start: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  year_end: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  max_results: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'completed'
  }
}, {
  tableName: 'searches',
  timestamps: true,
  underscored: true
});

module.exports = Search;
