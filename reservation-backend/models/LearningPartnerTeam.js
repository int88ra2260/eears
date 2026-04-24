// models/LearningPartnerTeam.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const LearningPartnerTeam = sequelize.define('LearningPartnerTeam', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  teamName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '團體名稱（選填）'
  },
  representativeStudentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '代表者學號（填寫表單的學生）'
  },
  teamSize: {
    type: DataTypes.TINYINT,
    allowNull: false,
    comment: '報名人數（3~4）',
    validate: {
      min: 3,
      max: 4
    }
  },
  status: {
    type: DataTypes.ENUM('pending_approval', 'approved', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending_approval',
    comment: '團體狀態'
  },
  activeFlag: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否為有效團體（1=有效=pending_approval/approved, 0=無效=expired/cancelled）'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '過期時間（createdAt + 24小時）'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '全員同意完成的時間'
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消時間'
  },
  cancelledReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '取消原因'
  }
}, {
  tableName: 'learning_partner_teams',
  timestamps: true,
  indexes: [
    { fields: ['status', 'createdAt'] },
    { fields: ['expiresAt'] },
    { fields: ['representativeStudentId'] }
  ]
});

module.exports = LearningPartnerTeam;
