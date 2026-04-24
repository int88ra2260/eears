// models/SurveySettings.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveySettings = sequelize.define('SurveySettings', {
  id: { 
    type: DataTypes.INTEGER, 
    primaryKey: true, 
    autoIncrement: true 
  },
  
  // 問卷ID
  surveyId: { 
    type: DataTypes.STRING(100), 
    allowNull: false, 
    unique: true 
  },
  
  // 問卷名稱
  surveyName: { 
    type: DataTypes.STRING(200), 
    allowNull: false 
  },
  
  // 是否啟用
  isEnabled: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false, 
    defaultValue: true 
  },
  
  // 問卷描述
  description: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  },
  
  // 相關活動類型
  relatedEventTypes: { 
    type: DataTypes.JSON, 
    allowNull: true 
  },
  
  // 問卷開始時間
  startDate: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  
  // 問卷結束時間
  endDate: { 
    type: DataTypes.DATE, 
    allowNull: true 
  },
  
  // 是否強制填寫
  isRequired: { 
    type: DataTypes.BOOLEAN, 
    allowNull: false, 
    defaultValue: true 
  },
  
  // 設定備註
  notes: { 
    type: DataTypes.TEXT, 
    allowNull: true 
  }
}, {
  tableName: 'survey_settings',
  timestamps: true
});

module.exports = SurveySettings;
