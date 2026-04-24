const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const StudentSemesterProfile = sequelize.define('StudentSemesterProfile', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  studentPk: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'student_pk' },
  studentId: { type: DataTypes.STRING(20), allowNull: false, field: 'student_id' },
  semesterId: { type: DataTypes.STRING(12), allowNull: false, field: 'semester_id' },
  isRostered: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'is_rostered' },
  rosterSource: {
    type: DataTypes.ENUM('et_snapshot', 'manual', 'migrated'),
    allowNull: false,
    defaultValue: 'migrated',
    field: 'roster_source'
  },
  attemptCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'attempt_count' },
  bestAttained: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'best_attained' },
  latestAttained: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'latest_attained' },
  bestSnapshotJson: { type: DataTypes.JSON, allowNull: true, field: 'best_snapshot_json' },
  latestSnapshotJson: { type: DataTypes.JSON, allowNull: true, field: 'latest_snapshot_json' },
  dataQualityFlag: {
    type: DataTypes.ENUM('ok', 'missing_scores', 'conflict'),
    allowNull: false,
    defaultValue: 'ok',
    field: 'data_quality_flag'
  }
}, {
  tableName: 'student_semester_profiles',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['student_pk', 'semester_id'], name: 'uk_ssp_student_pk_semester' }
  ]
});

module.exports = StudentSemesterProfile;
