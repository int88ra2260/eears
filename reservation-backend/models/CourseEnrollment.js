const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const CourseEnrollment = sequelize.define('CourseEnrollment', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  courseId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'course_id' },
  studentPk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'student_pk' },
  studentId: { type: DataTypes.STRING(20), allowNull: false, field: 'student_id' },
  studentName: { type: DataTypes.STRING(120), allowNull: true, field: 'student_name' },
  semesterId: { type: DataTypes.STRING(12), allowNull: false, field: 'semester_id' },
  enrollmentStatus: {
    type: DataTypes.ENUM('enrolled', 'completed', 'withdrawn', 'failed', 'unknown'),
    allowNull: false,
    defaultValue: 'enrolled',
    field: 'enrollment_status'
  },
  finalScore: { type: DataTypes.DECIMAL(6, 2), allowNull: true, field: 'final_score' },
  passStatus: {
    type: DataTypes.ENUM('passed', 'failed', 'in_progress', 'unknown'),
    allowNull: false,
    defaultValue: 'unknown',
    field: 'pass_status'
  },
  sourceRef: { type: DataTypes.STRING(120), allowNull: true, field: 'source_ref' },
  rawPayload: { type: DataTypes.JSON, allowNull: true, field: 'raw_payload' }
}, {
  tableName: 'course_enrollments',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['course_id', 'student_id'], name: 'uk_course_enrollments_course_student' },
    { fields: ['student_id', 'semester_id'], name: 'idx_course_enrollments_student_semester' },
    { fields: ['student_pk', 'semester_id'], name: 'idx_course_enrollments_student_pk_semester' }
  ]
});

module.exports = CourseEnrollment;
