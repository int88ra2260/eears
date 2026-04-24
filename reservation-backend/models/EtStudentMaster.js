const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtStudentMaster = sequelize.define('EtStudentMaster', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  studentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '學號'
  },
  name: { type: DataTypes.STRING(100), allowNull: true },
  college: { type: DataTypes.STRING(100), allowNull: true },
  dept: { type: DataTypes.STRING(100), allowNull: true }
}, {
  tableName: 'et_student_master',
  timestamps: true,
  indexes: [{ unique: true, fields: ['studentId'], name: 'uk_et_student_master_student_id' }]
});

module.exports = EtStudentMaster;
