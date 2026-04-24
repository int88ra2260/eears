const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const MigrationQuarantine = sequelize.define('MigrationQuarantine', {
  id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
  batchId: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, field: 'batch_id' },
  stageName: { type: DataTypes.STRING(100), allowNull: true, field: 'stage_name' },
  sourceType: { type: DataTypes.STRING(60), allowNull: true, field: 'source_type' },
  sourceRef: { type: DataTypes.STRING(120), allowNull: true, field: 'source_ref' },
  studentId: { type: DataTypes.STRING(20), allowNull: true, field: 'student_id' },
  reasonCode: { type: DataTypes.STRING(60), allowNull: true, field: 'reason_code' },
  reasonMessage: { type: DataTypes.STRING(500), allowNull: true, field: 'reason_message' },
  rawPayload: { type: DataTypes.JSON, allowNull: true, field: 'raw_payload' },
  sourceTable: { type: DataTypes.STRING(100), allowNull: false, field: 'source_table' },
  sourceKey: { type: DataTypes.STRING(120), allowNull: true, field: 'source_key' },
  reason: { type: DataTypes.STRING(255), allowNull: false },
  payloadJson: { type: DataTypes.JSON, allowNull: true, field: 'payload_json' }
}, {
  tableName: 'migration_quarantine',
  underscored: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [{ fields: ['batch_id', 'source_table'], name: 'idx_migration_quarantine_batch_source' }]
});

module.exports = MigrationQuarantine;
