const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Course = sequelize.define('Course', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  semesterId: { type: DataTypes.STRING(12), allowNull: false, field: 'semester_id' },
  courseCode: { type: DataTypes.STRING(40), allowNull: false, field: 'course_code' },
  courseName: { type: DataTypes.STRING(200), allowNull: false, field: 'course_name' },
  departmentCode: { type: DataTypes.STRING(40), allowNull: true, field: 'department_code' },
  departmentName: { type: DataTypes.STRING(160), allowNull: true, field: 'department_name' },
  instructorName: { type: DataTypes.STRING(160), allowNull: true, field: 'instructor_name' },
  credits: { type: DataTypes.DECIMAL(4, 1), allowNull: true },
  courseType: { type: DataTypes.STRING(40), allowNull: true, field: 'course_type' },
  sourceRef: { type: DataTypes.STRING(120), allowNull: true, field: 'source_ref' },
  metaJson: { type: DataTypes.JSON, allowNull: true, field: 'meta_json' }
}, {
  tableName: 'courses',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['semester_id', 'course_code'], name: 'uk_courses_semester_code' },
    { fields: ['semester_id', 'department_code'], name: 'idx_courses_semester_department' }
  ]
});

module.exports = Course;
