const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtCefrLevel = sequelize.define('EtCefrLevel', {
  level: {
    type: DataTypes.STRING(10),
    primaryKey: true,
    comment: 'A1, A2, B1, B2, C1, C2'
  },
  rank: { type: DataTypes.INTEGER, allowNull: false, comment: 'A1=1 .. C2=6' }
}, {
  tableName: 'et_cefr_levels',
  timestamps: true
});

module.exports = EtCefrLevel;
