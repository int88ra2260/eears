const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const RolePermission = sequelize.define('RolePermission', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  },
  role: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  permission: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
}, {
  tableName: 'role_permissions',
  timestamps: true,
  indexes: [
    { unique: true, fields: ['role', 'permission'] },
    { fields: ['permission'] },
  ],
});

module.exports = RolePermission;

