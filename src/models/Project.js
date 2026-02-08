const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const Project = sequelize.define('Project', {
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
  research_question: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'active'
  }
}, {
  tableName: 'projects',
  timestamps: true,
  underscored: true
});

module.exports = Project;
