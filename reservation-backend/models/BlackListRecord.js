// models/BlackListRecord.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');

const BlackListRecord = sequelize.define('BlackListRecord', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  reason: {
    type: DataTypes.STRING(255),
    allowNull: true
  }
}, {
  tableName: 'blacklist_records',
  timestamps: false,
});

User.hasMany(BlackListRecord, { foreignKey: 'userId' });
BlackListRecord.belongsTo(User, { foreignKey: 'userId' });

module.exports = BlackListRecord;
