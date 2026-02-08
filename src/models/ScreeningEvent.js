const { DataTypes } = require('sequelize');
const { sequelize } = require('../core/database');
const { v4: uuidv4 } = require('uuid');

const ScreeningEvent = sequelize.define('ScreeningEvent', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true,
    defaultValue: () => uuidv4()
  },
  project_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  article_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  record_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  actor_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'ai'
  },
  actor_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  screener_type: {
    type: DataTypes.STRING(50),
    defaultValue: 'ai'
  },
  model_name: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  decision: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  confidence: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reasoning: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  labels: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  prompt_version: {
    type: DataTypes.STRING,
    allowNull: true
  },
  input_hash: {
    type: DataTypes.STRING,
    allowNull: true
  },
  event_metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  pico_question: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  inclusion_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  exclusion_criteria: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  prompt_used: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  raw_response: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  analysis_batch_id: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  prompt_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  completion_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  total_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'screening_events',
  timestamps: true,
  underscored: true
});

module.exports = ScreeningEvent;
