// models/EventViolation.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./User');
const Event = require('./Event');

const EventViolation = sequelize.define('EventViolation', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '活動ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '使用者ID'
  },
  violationType: {
    type: DataTypes.ENUM('擾亂秩序', '未遵守規定', '預約未到', '無故缺席', '其他'),
    allowNull: false,
    comment: '違規類型'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '違規描述'
  },
  recordedBy: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '記錄者（管理員或工讀生）'
  },
  recordedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '記錄時間'
  }
}, {
  tableName: 'event_violations',
  timestamps: false,
});

// 建立關聯
User.hasMany(EventViolation, { foreignKey: 'userId' });
EventViolation.belongsTo(User, { foreignKey: 'userId' });

Event.hasMany(EventViolation, { foreignKey: 'eventId' });
EventViolation.belongsTo(Event, { foreignKey: 'eventId' });

module.exports = EventViolation;
