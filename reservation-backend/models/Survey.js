const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Survey = sequelize.define(
  'Survey',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    surveyKey: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    code: { type: DataTypes.STRING(120), allowNull: true, unique: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.STRING(80), allowNull: true },
    targetType: { type: DataTypes.STRING(80), allowNull: true },
    activityType: { type: DataTypes.STRING(120), allowNull: true },
    targetLevel: { type: DataTypes.STRING(80), allowNull: true },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'active' },
    currentPublishedVersionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    currentVersionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    createdBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    updatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: 'surveys',
    timestamps: true,
  }
);

module.exports = Survey;
