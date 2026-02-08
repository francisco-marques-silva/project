const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const Work = sequelize.define('Work', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  doi: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  pmid: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  title_normalized: {
    type: DataTypes.STRING,
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
    type: DataTypes.STRING(500),
    allowNull: true
  },
  extra_data: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  fingerprint: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  scopus_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  wos_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  publication_type: {
    type: DataTypes.STRING(100),
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
  issn: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'works',
  timestamps: true,
  underscored: true
});

module.exports = Work;
