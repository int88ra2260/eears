// models/Class.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Class = sequelize.define('Class', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '班級名稱'
  },
  semester: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '學期，如 114-1'
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '系所'
  },
  teacherName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '老師姓名'
  }
}, {
  tableName: 'classes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['name', 'semester']
    },
    {
      fields: ['semester']
    }
  ]
});

module.exports = Class;
