const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const JobRun = sequelize.define('JobRun', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  jobName: { type: DataTypes.STRING(100), allowNull: false, field: 'job_name' },
  semesterId: { type: DataTypes.STRING(12), allowNull: true, field: 'semester_id' },
  status: {
    type: DataTypes.ENUM('running', 'success', 'failed', 'skipped'),
    allowNull: false,
    defaultValue: 'running'
  },
  startedAt: { type: DataTypes.DATE, allowNull: false, field: 'started_at' },
  finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
  durationMs: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, field: 'duration_ms' },
  triggeredBy: { type: DataTypes.STRING(40), allowNull: false, defaultValue: 'manual', field: 'triggered_by' },
  requestId: { type: DataTypes.STRING(64), allowNull: true, field: 'request_id' },
  summaryJson: { type: DataTypes.JSON, allowNull: true, field: 'summary_json' },
  errorMessage: { type: DataTypes.TEXT, allowNull: true, field: 'error_message' }
}, {
  tableName: 'job_runs',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['job_name', 'semester_id', 'started_at'], name: 'idx_job_runs_job_semester_started' },
    { fields: ['status', 'started_at'], name: 'idx_job_runs_status_started' },
    { fields: ['request_id'], name: 'idx_job_runs_request_id' }
  ]
});

module.exports = JobRun;
