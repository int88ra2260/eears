const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SystemLog = sequelize.define(
  'SystemLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    requestId: { type: DataTypes.STRING(64), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'http' },
    method: { type: DataTypes.STRING(10), allowNull: true },
    path: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.INTEGER, allowNull: true },
    durationMs: { type: DataTypes.INTEGER, allowNull: true },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    role: { type: DataTypes.STRING(32), allowNull: true },
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    userAgent: { type: DataTypes.STRING(500), allowNull: true },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: 'system_logs',
    timestamps: false,
    updatedAt: false,
  }
);

module.exports = SystemLog;

