// models/ClassMembership.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ClassMembership = sequelize.define('ClassMembership', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  semester: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '學期，如 114-1'
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '班級 ID'
  },
  studentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '學號'
  },
  studentName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '學生姓名'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '系所'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '電子郵件'
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '年級'
  }
}, {
  tableName: 'class_memberships',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['semester', 'classId', 'studentId']
    },
    {
      fields: ['semester', 'classId']
    },
    {
      fields: ['studentId']
    }
  ]
});

module.exports = ClassMembership;
