const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AuditLog = sequelize.define(
  'AuditLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    module: { type: DataTypes.STRING(80), allowNull: false },
    entityType: { type: DataTypes.STRING(80), allowNull: true },
    entityId: { type: DataTypes.STRING(64), allowNull: true },
    action: { type: DataTypes.STRING(64), allowNull: false },
    operatorId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    operatorRole: { type: DataTypes.STRING(32), allowNull: true },
    operatorName: { type: DataTypes.STRING(255), allowNull: true },
    targetSummary: { type: DataTypes.STRING(500), allowNull: true },
    beforeData: { type: DataTypes.JSON, allowNull: true },
    afterData: { type: DataTypes.JSON, allowNull: true },
    changedFields: { type: DataTypes.JSON, allowNull: true },
    requestId: { type: DataTypes.STRING(64), allowNull: true },
    traceId: { type: DataTypes.STRING(64), allowNull: true },
    changeReason: { type: DataTypes.STRING(255), allowNull: true },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'success' },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: 'audit_logs',
    timestamps: false,
    updatedAt: false,
  }
);

module.exports = AuditLog;
