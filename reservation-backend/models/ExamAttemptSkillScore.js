const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ExamAttemptSkillScore = sequelize.define('ExamAttemptSkillScore', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  attemptId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'attempt_id' },
  skill: { type: DataTypes.ENUM('listening', 'reading', 'speaking', 'writing'), allowNull: false },
  rawScore: { type: DataTypes.DECIMAL(7, 2), allowNull: true, field: 'raw_score' },
  rawLevel: { type: DataTypes.STRING(20), allowNull: true, field: 'raw_level' },
  cefrLevel: { type: DataTypes.ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2'), allowNull: true, field: 'cefr_level' },
  cefrRank: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true, field: 'cefr_rank' },
  isInferred: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_inferred' },
  mappingVersion: { type: DataTypes.STRING(20), allowNull: true, field: 'mapping_version' }
}, {
  tableName: 'exam_attempt_skill_scores',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['attempt_id', 'skill'], name: 'uk_exam_attempt_skill_scores_attempt_skill' }
  ]
});

module.exports = ExamAttemptSkillScore;
