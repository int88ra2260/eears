const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EmailLog = sequelize.define(
  'EmailLog',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    to: { type: DataTypes.STRING(255), allowNull: true },
    subject: { type: DataTypes.STRING(500), allowNull: true },
    template: { type: DataTypes.STRING(120), allowNull: false },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'success' },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
    relatedEntityType: { type: DataTypes.STRING(80), allowNull: true },
    relatedEntityId: { type: DataTypes.STRING(64), allowNull: true },
    requestId: { type: DataTypes.STRING(64), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
  },
  {
    tableName: 'email_logs',
    timestamps: false,
    updatedAt: false,
  }
);

module.exports = EmailLog;

