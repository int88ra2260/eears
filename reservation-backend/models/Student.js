const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Student = sequelize.define('Student', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  studentId: { type: DataTypes.STRING(20), allowNull: false, unique: true, field: 'student_id' },
  nameZh: { type: DataTypes.STRING(120), allowNull: false, field: 'name_zh' },
  nameEn: { type: DataTypes.STRING(120), allowNull: true, field: 'name_en' },
  departmentCode: { type: DataTypes.STRING(20), allowNull: true, field: 'department_code' },
  departmentName: { type: DataTypes.STRING(120), allowNull: true, field: 'department_name' },
  collegeCode: { type: DataTypes.STRING(20), allowNull: true, field: 'college_code' },
  grade: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
  enrollmentYear: { type: DataTypes.SMALLINT.UNSIGNED, allowNull: true, field: 'enrollment_year' },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'graduated', 'suspended'),
    allowNull: false,
    defaultValue: 'active'
  }
}, {
  tableName: 'students',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['student_id'], name: 'uk_students_student_id' }
  ]
});

module.exports = Student;
