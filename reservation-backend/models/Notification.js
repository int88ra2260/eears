// models/Notification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Notification = sequelize.define(
  'Notification',
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      // Must match Users.id (INTEGER signed) for MySQL FK compatibility
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
    },
    // notification + email 共用同一份資料輸入時，可把重點資料保留在 data 供前端展示/追查
    data: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    // 用於和 requestLogger/audit 對帳（相同 requestId 會出現在 error/system logs 等）
    requestId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    relatedEntityType: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    relatedEntityId: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: 'notifications',
    timestamps: false,
    updatedAt: false,
  }
);

module.exports = Notification;

