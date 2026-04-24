const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveyResponseAnswer = sequelize.define(
  'SurveyResponseAnswer',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    // 注意：既有資料庫可能存在 signed INT 的 survey_responses.id，這裡用 INTEGER 提高相容性
    responseId: { type: DataTypes.INTEGER, allowNull: false },
    questionKey: { type: DataTypes.STRING(120), allowNull: false },
    questionType: { type: DataTypes.STRING(60), allowNull: true },
    answerText: { type: DataTypes.TEXT, allowNull: true },
    answerJson: { type: DataTypes.JSON, allowNull: true },
    scoreValue: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  },
  {
    tableName: 'survey_response_answers',
    timestamps: true,
  }
);

module.exports = SurveyResponseAnswer;
