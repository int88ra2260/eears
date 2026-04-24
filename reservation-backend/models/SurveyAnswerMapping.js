const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveyAnswerMapping = sequelize.define(
  'SurveyAnswerMapping',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    surveyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    surveyVersionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    sourceQuestionKey: { type: DataTypes.STRING(120), allowNull: false },
    targetQuestionKey: { type: DataTypes.STRING(120), allowNull: false },
    sourceLabel: { type: DataTypes.STRING(255), allowNull: true },
    targetLabel: { type: DataTypes.STRING(255), allowNull: true },
    mappingType: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'manual' },
    confidenceScore: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
    isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    approvedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: 'survey_answer_mappings', timestamps: true }
);

module.exports = SurveyAnswerMapping;
