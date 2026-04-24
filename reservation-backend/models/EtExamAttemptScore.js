const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtExamAttemptScore = sequelize.define('EtExamAttemptScore', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  attemptId: { type: DataTypes.INTEGER, allowNull: false },
  skill: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: 'LISTENING/READING/SPEAKING/WRITING'
  },
  rawScore: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
  cefr: { type: DataTypes.STRING(10), allowNull: true }
}, {
  tableName: 'et_exam_attempt_scores',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['attemptId', 'skill'], name: 'uk_et_attempt_scores_attempt_skill' },
    { fields: ['skill'], name: 'idx_et_attempt_scores_skill' },
    { fields: ['cefr'], name: 'idx_et_attempt_scores_cefr' }
  ]
});

module.exports = EtExamAttemptScore;
