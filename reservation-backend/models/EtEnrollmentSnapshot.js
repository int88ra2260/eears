const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtEnrollmentSnapshot = sequelize.define('EtEnrollmentSnapshot', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  semesterId: { type: DataTypes.STRING(20), allowNull: false },
  studentId: { type: DataTypes.STRING(50), allowNull: false },
  studentName: { type: DataTypes.STRING(100), allowNull: true },
  department: { type: DataTypes.STRING(100), allowNull: true },
  college: { type: DataTypes.STRING(100), allowNull: true },
  grade: { type: DataTypes.STRING(20), allowNull: true, comment: '該學期年級' },
  className: { type: DataTypes.STRING(50), allowNull: true },
  isDomestic: { type: DataTypes.BOOLEAN, allowNull: true },
  status: { type: DataTypes.STRING(20), allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  importBatchId: { type: DataTypes.STRING(50), allowNull: true },
  sourceType: { type: DataTypes.STRING(30), allowNull: true },
  sourceBatchId: { type: DataTypes.STRING(50), allowNull: true }
}, {
  tableName: 'et_enrollment_snapshots',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['semesterId', 'studentId'], name: 'uk_et_enrollment_semester_student' },
    { fields: ['semesterId', 'grade', 'isActive'], name: 'idx_et_enrollment_semester_grade_active' }
  ]
});

module.exports = EtEnrollmentSnapshot;
