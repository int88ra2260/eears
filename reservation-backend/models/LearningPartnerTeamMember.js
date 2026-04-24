// models/LearningPartnerTeamMember.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const LearningPartnerTeamMember = sequelize.define('LearningPartnerTeamMember', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
  studentId: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '學號'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '姓名'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Email（從個人報名記錄取得）'
  },
  isRepresentative: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否為代表（填表人）'
  },
  personalRegistrationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '對應的個人報名記錄 ID',
    references: {
      model: 'english_test_registrations',
      key: 'id'
    }
  },
  approvalStatus: {
    type: DataTypes.ENUM('pending', 'approved', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '同意狀態'
  },
  activeFlag: {
    type: DataTypes.TINYINT(1),
    allowNull: false,
    defaultValue: 1,
    comment: '是否為有效成員（1=有效=pending/approved, 0=無效=expired）'
  },
  approvalToken: {
    type: DataTypes.STRING(255),
    allowNull: true,
    unique: true,
    comment: '授權 token（UUID，一次性使用）'
  },
  approvalTokenExpiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Token 過期時間（createdAt + 24小時）'
  },
  approvedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '同意時間'
  },
  approvalIp: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '同意時的 IP（IPv4 或 IPv6）'
  },
  approvalUserAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '同意時的 User-Agent'
  }
}, {
  tableName: 'learning_partner_team_members',
  timestamps: true,
  indexes: [
    { fields: ['teamId'] },
    { fields: ['approvalToken'], unique: true },
    { fields: ['personalRegistrationId'] },
    { fields: ['studentId', 'activeFlag'] }
  ]
});

module.exports = LearningPartnerTeamMember;
