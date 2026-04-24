const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ExamAttempt = sequelize.define('ExamAttempt', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  studentPk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'student_pk' },
  studentId: { type: DataTypes.STRING(20), allowNull: false, field: 'student_id' },
  semesterId: { type: DataTypes.STRING(12), allowNull: true, field: 'semester_id' },
  registrationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'registration_id' },
  sourceType: {
    type: DataTypes.ENUM('BESTEP', 'EXTERNAL', 'LEGACY_ET', 'MANUAL'),
    allowNull: false,
    defaultValue: 'MANUAL',
    field: 'source_type'
  },
  sourceRef: { type: DataTypes.STRING(80), allowNull: true, field: 'source_ref' },
  examVendor: { type: DataTypes.STRING(40), allowNull: true, field: 'exam_vendor' },
  examScope: { type: DataTypes.ENUM('LR', 'SW', 'ALL'), allowNull: false, defaultValue: 'ALL', field: 'exam_scope' },
  examDate: { type: DataTypes.DATEONLY, allowNull: false, field: 'exam_date' },
  status: {
    type: DataTypes.ENUM('valid', 'invalid', 'duplicate', 'pending_review'),
    allowNull: false,
    defaultValue: 'valid'
  },
  rawPayload: { type: DataTypes.JSON, allowNull: true, field: 'raw_payload' },
  dedupeKey: { type: DataTypes.STRING(64), allowNull: false, field: 'dedupe_key' }
}, {
  tableName: 'exam_attempts',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['student_pk', 'semester_id'], name: 'idx_exam_attempts_student_pk_semester' },
    { fields: ['student_id', 'exam_date'], name: 'idx_exam_attempts_student_id_date' },
    { unique: true, fields: ['dedupe_key'], name: 'uk_exam_attempts_dedupe_key' }
  ]
});

module.exports = ExamAttempt;
