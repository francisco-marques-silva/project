const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const UserSearchHistory = sequelize.define('UserSearchHistory', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  query_text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  query_normalized: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  databases: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  search_params: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  results_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  unique_results_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  search_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  last_searched_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_search_history',
  timestamps: true,
  underscored: true
});

module.exports = UserSearchHistory;
