// models/Settings.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../db');

class Settings extends Model {}

Settings.init({
  key: {
    type: DataTypes.STRING,
    primaryKey: true,
    allowNull: false
  },
  value: {
    type: DataTypes.STRING,
    allowNull: true
  },
  valueBool: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  }
}, {
  sequelize,
  modelName: 'Settings',
  tableName: 'settings',
  timestamps: false
});

module.exports = Settings; 