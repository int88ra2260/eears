const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtSemester = sequelize.define('EtSemester', {
  id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
    comment: '學期 ID，如 114-1'
  },
  startDate: { type: DataTypes.DATEONLY, allowNull: true },
  endDate: { type: DataTypes.DATEONLY, allowNull: true },
  snapshotDate: { type: DataTypes.DATEONLY, allowNull: true, comment: '名冊/統計鎖定日' }
}, {
  tableName: 'et_semesters',
  timestamps: true
});

module.exports = EtSemester;
