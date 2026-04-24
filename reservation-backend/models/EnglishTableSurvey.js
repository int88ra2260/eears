// models/EnglishTableSurveyResponse.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EnglishTableSurveyResponse = sequelize.define('EnglishTableSurveyResponse', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  
  // 基本資料
  studentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  semester: {
    type: DataTypes.STRING(10),
    allowNull: false,
  },
  name: { 
    type: DataTypes.STRING(50), 
    allowNull: false 
  },
  email: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  grade: { 
    type: DataTypes.STRING(191), 
    allowNull: false 
  },
  department: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  
  // 李克特量表問題 (1-5分)
  q1: { type: DataTypes.INTEGER, allowNull: false },
  q2: { type: DataTypes.INTEGER, allowNull: false },
  q3: { type: DataTypes.INTEGER, allowNull: false },
  q4: { type: DataTypes.INTEGER, allowNull: false },
  q5: { type: DataTypes.INTEGER, allowNull: false },
  q6: { type: DataTypes.INTEGER, allowNull: false },
  q7: { type: DataTypes.INTEGER, allowNull: false },
  q8: { type: DataTypes.INTEGER, allowNull: false },
  q9: { type: DataTypes.INTEGER, allowNull: false },
  q10: { type: DataTypes.INTEGER, allowNull: false },
  q11: { type: DataTypes.INTEGER, allowNull: false },
  q12: { type: DataTypes.INTEGER, allowNull: false },
  q13: { type: DataTypes.INTEGER, allowNull: false },
  q14: { type: DataTypes.INTEGER, allowNull: false },
  q15: { type: DataTypes.INTEGER, allowNull: false },
  q16: { type: DataTypes.INTEGER, allowNull: false },
  q17: { type: DataTypes.INTEGER, allowNull: false },
  q18: { type: DataTypes.INTEGER, allowNull: false },
  
  // 選填聯絡信箱
  interviewEmail: { 
    type: DataTypes.STRING(100), 
    allowNull: true 
  }
}, {
  tableName: 'english_table_survey_responses',
  timestamps: true
});

module.exports = EnglishTableSurveyResponse;
