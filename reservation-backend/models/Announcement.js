// models/Announcement.js — 前台最新公告 / 後台內容管理（產品化狀態欄位 + 軟刪除）
const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const { ANNOUNCEMENT_STATUS } = require('../constants/announcementConstants');

const Announcement = sequelize.define(
  'Announcement',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING(180),
      allowNull: false,
      unique: true,
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT('long'),
      allowNull: false,
    },
    /** @deprecated 對外 API 請優先使用 coverImageUrl 別名（與此欄位同源） */
    coverImage: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    coverImageAlt: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    /**
     * 產品化狀態（與 isPublished 並存：寫入時由 service 同步）
     * draft | scheduled | published | unpublished | archived
     */
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: ANNOUNCEMENT_STATUS.DRAFT,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    scheduledPublishAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    unpublishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isPinned: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    category: {
      type: DataTypes.STRING(64),
      allowNull: false,
      defaultValue: 'general',
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    authorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    authorNameSnapshot: {
      type: DataTypes.STRING(120),
      allowNull: true,
    },
    seoTitle: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    seoDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    ogImageUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    lastEditedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    audienceType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'all',
    },
    shouldSendNotification: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    shouldSendEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    notificationStatus: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    emailStatus: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
  },
  {
    tableName: 'Announcements',
    timestamps: true,
    paranoid: true,
    deletedAt: 'deletedAt',
  }
);

module.exports = Announcement;
