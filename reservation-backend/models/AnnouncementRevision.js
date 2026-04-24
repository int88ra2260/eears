const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const AnnouncementRevision = sequelize.define(
  'AnnouncementRevision',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    announcementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    versionNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: { type: DataTypes.STRING(200), allowNull: false },
    summary: { type: DataTypes.TEXT, allowNull: true },
    content: { type: DataTypes.TEXT('long'), allowNull: false },
    coverImage: { type: DataTypes.STRING(500), allowNull: true },
    seoTitle: { type: DataTypes.STRING(200), allowNull: true },
    seoDescription: { type: DataTypes.STRING(500), allowNull: true },
    editedBy: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    tableName: 'AnnouncementRevisions',
    timestamps: true,
  }
);

module.exports = AnnouncementRevision;
