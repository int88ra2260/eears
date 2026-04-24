const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SystemSettings = sequelize.define('SystemSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false
  },
  surveyEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'SystemSettings',
  timestamps: true
});

module.exports = SystemSettings;