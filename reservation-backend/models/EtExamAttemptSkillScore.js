const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtExamAttemptSkillScore = sequelize.define('EtExamAttemptSkillScore', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  attemptId: { type: DataTypes.INTEGER, allowNull: false },
  skill: {
    type: DataTypes.ENUM('listening', 'reading', 'speaking', 'writing'),
    allowNull: false
  },
  rawScore: { type: DataTypes.FLOAT, allowNull: true },
  rawLevel: { type: DataTypes.STRING(30), allowNull: true },
  cefr: { type: DataTypes.STRING(10), allowNull: true },
  cefrRank: { type: DataTypes.INTEGER, allowNull: true },
  isInferred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  inferenceVersion: { type: DataTypes.STRING(30), allowNull: true }
}, {
  tableName: 'et_exam_attempt_skill_scores',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['attemptId', 'skill'], name: 'uk_et_attempt_skill_scores_attempt_skill' }
  ]
});

module.exports = EtExamAttemptSkillScore;
