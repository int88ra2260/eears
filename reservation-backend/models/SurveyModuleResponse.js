const { DataTypes } = require('sequelize');
const sequelize = require('../db');

/** 統一作答表（與 legacy english_* 表並存；新提交會雙寫） */
const SurveyModuleResponse = sequelize.define(
  'SurveyModuleResponse',
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    surveyId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    surveyVersionId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    semesterId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ruleId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    studentId: { type: DataTypes.STRING(80), allowNull: true },
    studentName: { type: DataTypes.STRING(120), allowNull: true },
    studentEmail: { type: DataTypes.STRING(200), allowNull: true },
    eventId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reservationId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    eventType: { type: DataTypes.STRING(120), allowNull: true },
    activityType: { type: DataTypes.STRING(120), allowNull: true },
    semesterKey: { type: DataTypes.STRING(64), allowNull: true },
    /** 與 semesterKey 對齊之學期代碼（ROC，如 114-2）；gating／統計以此為準 */
    semester: { type: DataTypes.STRING(10), allowNull: false },
    submittedAt: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'completed' },
    submissionStatus: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'submitted' },
    source: { type: DataTypes.STRING(60), allowNull: true },
    answersJson: { type: DataTypes.JSON, allowNull: false },
    metadataJson: { type: DataTypes.JSON, allowNull: true },
  },
  {
    tableName: 'survey_responses',
    timestamps: true,
  }
);

module.exports = SurveyModuleResponse;
