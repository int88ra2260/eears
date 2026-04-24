const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const UserPermissionOverride = sequelize.define('UserPermissionOverride', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  permission: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  value: {
    type: DataTypes.ENUM('allow', 'deny'),
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
  tableName: 'user_permission_overrides',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['userId', 'permission'] },
    { fields: ['permission'] },
    { fields: ['updatedBy'] },
  ],
});

module.exports = UserPermissionOverride;

