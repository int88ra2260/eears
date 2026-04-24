// models/EnglishClubSurveyResponse.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EnglishClubSurveyResponse = sequelize.define('EnglishClubSurveyResponse', {
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
  department: { 
    type: DataTypes.STRING(100), 
    allowNull: false 
  },
  year: { 
    type: DataTypes.STRING(30), 
    allowNull: false 
  },
  
  // 複選題答案（存儲為 JSON 陣列）
  reasonAttend: { 
    type: DataTypes.JSON, 
    allowNull: false 
  },
  informationChannel: { 
    type: DataTypes.JSON, 
    allowNull: false 
  },
  abilityImproved: { 
    type: DataTypes.JSON, 
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
  
  // 開放式問題
  abilityDescription: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  otherComments: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  tableName: 'english_club_survey_responses',
  timestamps: true
});

module.exports = EnglishClubSurveyResponse;
