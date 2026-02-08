const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const Dataset = sequelize.define('Dataset', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  file_type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'unknown'
  },
  data: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  raw_content: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  file_size: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'datasets',
  timestamps: true,
  underscored: true
});

module.exports = Dataset;
