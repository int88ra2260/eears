const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SurveyAdminAuditLog = sequelize.define(
  'SurveyAdminAuditLog',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    actorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    action: { type: DataTypes.STRING(80), allowNull: false },
    entityType: { type: DataTypes.STRING(80), allowNull: false },
    entityId: { type: DataTypes.STRING(120), allowNull: true },
    beforeJson: { type: DataTypes.JSON, allowNull: true },
    afterJson: { type: DataTypes.JSON, allowNull: true },
    summary: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: 'survey_admin_audit_logs',
    timestamps: true,
  }
);

module.exports = SurveyAdminAuditLog;
