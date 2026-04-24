const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MigrationCheckpoint = sequelize.define('MigrationCheckpoint', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  batchId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false, field: 'batch_id' },
  stepName: { type: DataTypes.STRING(100), allowNull: false, field: 'step_name' },
  stageName: { type: DataTypes.STRING(100), allowNull: true, field: 'stage_name' },
  status: {
    type: DataTypes.ENUM('running', 'completed', 'failed', 'skipped'),
    allowNull: false,
    defaultValue: 'running'
  },
  startedAt: { type: DataTypes.DATE, allowNull: true, field: 'started_at' },
  finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
  cursor: { type: DataTypes.STRING(120), allowNull: true },
  lastProcessedId: { type: DataTypes.STRING(120), allowNull: true, field: 'last_processed_id' },
  processedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'processed_count' },
  insertedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'inserted_count' },
  updatedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'updated_count' },
  skippedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'skipped_count' },
  duplicateCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'duplicate_count' },
  quarantinedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'quarantined_count' },
  errorCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'error_count' },
  message: { type: DataTypes.STRING(500), allowNull: true },
  payloadJson: { type: DataTypes.JSON, allowNull: true, field: 'payload_json' },
  checkpointData: { type: DataTypes.JSON, allowNull: true, field: 'checkpoint_data' }
}, {
  tableName: 'migration_checkpoint',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['batch_id', 'step_name'], name: 'uk_migration_checkpoint_batch_step' }]
});

module.exports = MigrationCheckpoint;
