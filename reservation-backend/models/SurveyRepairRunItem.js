const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveyRepairRunItem = sequelize.define(
  'SurveyRepairRunItem',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    runId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    entityType: { type: DataTypes.STRING(60), allowNull: false },
    entityId: { type: DataTypes.STRING(120), allowNull: false },
    actionType: { type: DataTypes.STRING(60), allowNull: false },
    beforeJson: { type: DataTypes.JSON, allowNull: true },
    afterJson: { type: DataTypes.JSON, allowNull: true },
    resultStatus: { type: DataTypes.STRING(30), allowNull: false, defaultValue: 'skipped' },
    message: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: 'survey_repair_run_items', timestamps: true }
);

module.exports = SurveyRepairRunItem;
