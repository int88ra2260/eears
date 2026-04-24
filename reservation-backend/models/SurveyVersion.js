const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveyVersion = sequelize.define(
  'SurveyVersion',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    surveyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    versionNumber: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    schemaJson: { type: DataTypes.JSON, allowNull: false },
    changeSummary: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'draft' },
    isPublished: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    publishedAt: { type: DataTypes.DATE, allowNull: true },
    publishedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: 'survey_versions',
    timestamps: true,
  }
);

module.exports = SurveyVersion;
