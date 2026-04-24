const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MigrationBatch = sequelize.define('MigrationBatch', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  batchKey: { type: DataTypes.STRING(64), allowNull: false, field: 'batch_key', unique: true },
  migrationName: { type: DataTypes.STRING(100), allowNull: false, field: 'migration_name' },
  batchType: { type: DataTypes.STRING(80), allowNull: true, field: 'batch_type' },
  dryRun: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'dry_run' },
  status: {
    type: DataTypes.ENUM('running', 'completed', 'failed', 'partial', 'rolled_back'),
    allowNull: false,
    defaultValue: 'running'
  },
  startedAt: { type: DataTypes.DATE, allowNull: false, field: 'started_at' },
  finishedAt: { type: DataTypes.DATE, allowNull: true, field: 'finished_at' },
  processedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'processed_count' },
  insertedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'inserted_count' },
  updatedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'updated_count' },
  skippedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'skipped_count' },
  duplicateCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'duplicate_count' },
  quarantinedCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'quarantined_count' },
  errorCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'error_count' },
  warningCount: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'warning_count' },
  message: { type: DataTypes.STRING(500), allowNull: true },
  stageListJson: { type: DataTypes.JSON, allowNull: true, field: 'stage_list_json' },
  summaryJson: { type: DataTypes.JSON, allowNull: true, field: 'summary_json' }
}, {
  tableName: 'migration_batch',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ unique: true, fields: ['batch_key'], name: 'uk_migration_batch_key' }]
});

module.exports = MigrationBatch;
