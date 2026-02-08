const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const SearchResult = sequelize.define('SearchResult', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  search_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  work_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source_record_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  raw_data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'search_results',
  timestamps: true,
  underscored: true
});

module.exports = SearchResult;
