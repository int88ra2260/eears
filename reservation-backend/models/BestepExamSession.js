// models/BestepExamSession.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BestepExamSession = sequelize.define('BestepExamSession', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  semester: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: '學期（如 114-1）'
  },
  lrExamDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'LR（聽讀）場次考試日期'
  },
  swExamDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'SW（說寫）場次考試日期'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '場次說明'
  }
}, {
  tableName: 'bestep_exam_sessions',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['semester'],
      name: 'uk_semester'
    }
  ]
});

module.exports = BestepExamSession;
