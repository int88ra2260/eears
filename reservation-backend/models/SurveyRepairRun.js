const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveyRepairRun = sequelize.define(
  'SurveyRepairRun',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    repairType: { type: DataTypes.STRING(60), allowNull: false },
    mode: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'dry_run' },
    status: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'pending' },
    requestedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approvedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    startedAt: { type: DataTypes.DATE, allowNull: true },
    completedAt: { type: DataTypes.DATE, allowNull: true },
    requestPayloadJson: { type: DataTypes.JSON, allowNull: true },
    summaryJson: { type: DataTypes.JSON, allowNull: true },
    resultJson: { type: DataTypes.JSON, allowNull: true },
    errorJson: { type: DataTypes.JSON, allowNull: true },
  },
  { tableName: 'survey_repair_runs', timestamps: true }
);

module.exports = SurveyRepairRun;
