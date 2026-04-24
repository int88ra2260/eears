const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const UserScope = sequelize.define('UserScope', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  scopeType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'event',
  },
  scopeValue: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  source: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
}, {
  tableName: 'user_scopes',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'scopeType', 'scopeValue'] },
    { fields: ['scopeType', 'scopeValue'] },
    { fields: ['updatedBy'] },
  ],
});

module.exports = UserScope;

