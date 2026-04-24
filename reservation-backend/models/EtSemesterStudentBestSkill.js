const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const EtSemesterStudentBestSkill = sequelize.define('EtSemesterStudentBestSkill', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  semesterId: { type: DataTypes.STRING(20), allowNull: false },
  studentId: { type: DataTypes.STRING(50), allowNull: false },
  // 舊結構欄位（保留相容）
  skill: { type: DataTypes.STRING(20), allowNull: true },
  attemptId: { type: DataTypes.INTEGER, allowNull: true },
  rawScore: { type: DataTypes.DECIMAL(8, 2), allowNull: true },
  cefr: { type: DataTypes.STRING(10), allowNull: true },
  cefrRank: { type: DataTypes.INTEGER, allowNull: true },
  // 新 cache 結構欄位
  bestListeningCefr: { type: DataTypes.STRING(10), allowNull: true },
  bestListeningCefrRank: { type: DataTypes.INTEGER, allowNull: true },
  bestReadingCefr: { type: DataTypes.STRING(10), allowNull: true },
  bestReadingCefrRank: { type: DataTypes.INTEGER, allowNull: true },
  bestSpeakingCefr: { type: DataTypes.STRING(10), allowNull: true },
  bestSpeakingCefrRank: { type: DataTypes.INTEGER, allowNull: true },
  bestWritingCefr: { type: DataTypes.STRING(10), allowNull: true },
  bestWritingCefrRank: { type: DataTypes.INTEGER, allowNull: true },
  computedAt: { type: DataTypes.DATE, allowNull: true },
  computeVersion: { type: DataTypes.STRING(30), allowNull: true }
}, {
  tableName: 'et_semester_student_best_skills',
  timestamps: true,
  indexes: [
    { fields: ['semesterId'], name: 'idx_et_best_semester' }
  ]
});

module.exports = EtSemesterStudentBestSkill;
