const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ExamRegistration = sequelize.define('ExamRegistration', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  legacyRegistrationId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'legacy_registration_id' },
  studentPk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'student_pk' },
  studentId: { type: DataTypes.STRING(20), allowNull: false, field: 'student_id' },
  semesterId: { type: DataTypes.STRING(12), allowNull: false, field: 'semester_id' },
  registrationChannel: {
    type: DataTypes.ENUM('cultivation', 'admin_import', 'system'),
    allowNull: false,
    defaultValue: 'cultivation',
    field: 'registration_channel'
  },
  examScope: {
    type: DataTypes.ENUM('LR', 'SW', 'ALL', 'NONE'),
    allowNull: false,
    defaultValue: 'ALL',
    field: 'exam_scope'
  },
  status: {
    type: DataTypes.ENUM('pending', 'success', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  appliedAt: { type: DataTypes.DATE, allowNull: true, field: 'applied_at' },
  approvedAt: { type: DataTypes.DATE, allowNull: true, field: 'approved_at' },
  failureReason: { type: DataTypes.TEXT, allowNull: true, field: 'failure_reason' },
  metaJson: { type: DataTypes.JSON, allowNull: true, field: 'meta_json' }
}, {
  tableName: 'exam_registrations',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['student_pk', 'semester_id'], name: 'idx_exam_registrations_student_semester' },
    { unique: true, fields: ['student_id', 'semester_id', 'registration_channel'], name: 'uk_exam_reg_student_sem_channel' }
  ]
});

module.exports = ExamRegistration;
