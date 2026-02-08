const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const ProjectArticle = sequelize.define('ProjectArticle', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  project_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  work_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  source: {
    type: DataTypes.STRING(50),
    defaultValue: 'manual'
  },
  search_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  abstract: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  authors: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  journal: {
    type: DataTypes.STRING,
    allowNull: true
  },
  doi: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pmid: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  keywords: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  url: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  volume: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  issue: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  pages: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  publication_type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  issn: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  extra_metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  is_duplicate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  duplicate_of_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  screening_status: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'project_articles',
  timestamps: true,
  underscored: true
});

module.exports = ProjectArticle;
