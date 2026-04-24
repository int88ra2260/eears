// models/BestepTeamRanking.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const BestepTeamRanking = sequelize.define('BestepTeamRanking', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  teamId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '團體 ID',
    references: {
      model: 'learning_partner_teams',
      key: 'id'
    }
  },
  semester: {
    type: DataTypes.STRING(20),
    allowNull: false,
    comment: '學期（如 114-1）'
  },
  avgScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    comment: '隊伍平均分（聽+讀+說+寫的平均）'
  },
  rank: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '名次（支援並列，如第1名有3隊並列，則下一名次為第4名）'
  },
  rewardAmount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '獎勵金額（每人，單位：元）'
  },
  calculatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '計算時間'
  }
}, {
  tableName: 'bestep_team_rankings',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['teamId', 'semester'],
      name: 'uk_team_semester'
    },
    {
      fields: ['semester'],
      name: 'idx_semester'
    },
    {
      fields: ['semester', 'rank'],
      name: 'idx_rank'
    }
  ]
});

module.exports = BestepTeamRanking;
