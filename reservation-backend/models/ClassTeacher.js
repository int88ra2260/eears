// models/ClassTeacher.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ClassTeacher = sequelize.define('ClassTeacher', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  classId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '班級 ID'
  },
  teacherId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '老師 ID'
  },
  semester: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '學期'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '關聯是否有效'
  }
}, {
  tableName: 'class_teachers',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['classId', 'teacherId', 'semester']
    },
    {
      fields: ['teacherId']
    },
    {
      fields: ['semester']
    },
    {
      fields: ['isActive']
    }
  ]
});

module.exports = ClassTeacher;
