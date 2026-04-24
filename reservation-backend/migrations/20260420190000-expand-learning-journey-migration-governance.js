'use strict';

const TABLES = {
  MIGRATION_BATCH: 'migration_batch',
  MIGRATION_CHECKPOINT: 'migration_checkpoint',
  MIGRATION_QUARANTINE: 'migration_quarantine'
};

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.table_name));
  return normalized.includes(tableName);
}

async function addColumnIfMissing(queryInterface, tableName, columnName, definition, transaction) {
  const schema = await queryInterface.describeTable(tableName);
  if (!schema[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition, { transaction });
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (await tableExists(queryInterface, TABLES.MIGRATION_BATCH)) {
        await queryInterface.changeColumn(TABLES.MIGRATION_BATCH, 'status', {
          type: Sequelize.ENUM('running', 'completed', 'failed', 'partial', 'rolled_back'),
          allowNull: false,
          defaultValue: 'running'
        }, { transaction });
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'batch_type', { type: Sequelize.STRING(80), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'dry_run', { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'processed_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'inserted_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'updated_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'skipped_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'duplicate_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'quarantined_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'error_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'warning_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'message', { type: Sequelize.STRING(500), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_BATCH, 'stage_list_json', { type: Sequelize.JSON, allowNull: true }, transaction);
      }

      if (await tableExists(queryInterface, TABLES.MIGRATION_CHECKPOINT)) {
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'stage_name', { type: Sequelize.STRING(100), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'status', { type: Sequelize.ENUM('running', 'completed', 'failed', 'skipped'), allowNull: false, defaultValue: 'running' }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'started_at', { type: Sequelize.DATE, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'finished_at', { type: Sequelize.DATE, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'cursor', { type: Sequelize.STRING(120), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'last_processed_id', { type: Sequelize.STRING(120), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'processed_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'inserted_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'updated_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'skipped_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'duplicate_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'quarantined_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'error_count', { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'message', { type: Sequelize.STRING(500), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_CHECKPOINT, 'payload_json', { type: Sequelize.JSON, allowNull: true }, transaction);
      }

      if (await tableExists(queryInterface, TABLES.MIGRATION_QUARANTINE)) {
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'stage_name', { type: Sequelize.STRING(100), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'source_type', { type: Sequelize.STRING(60), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'source_ref', { type: Sequelize.STRING(120), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'student_id', { type: Sequelize.STRING(20), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'reason_code', { type: Sequelize.STRING(60), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'reason_message', { type: Sequelize.STRING(500), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.MIGRATION_QUARANTINE, 'raw_payload', { type: Sequelize.JSON, allowNull: true }, transaction);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (await tableExists(queryInterface, TABLES.MIGRATION_BATCH)) {
        const schema = await queryInterface.describeTable(TABLES.MIGRATION_BATCH);
        const cols = ['batch_type', 'dry_run', 'processed_count', 'inserted_count', 'updated_count', 'skipped_count', 'duplicate_count', 'quarantined_count', 'error_count', 'warning_count', 'message', 'stage_list_json'];
        for (const col of cols) {
          if (schema[col]) {
            await queryInterface.removeColumn(TABLES.MIGRATION_BATCH, col, { transaction });
          }
        }
      }

      if (await tableExists(queryInterface, TABLES.MIGRATION_CHECKPOINT)) {
        const schema = await queryInterface.describeTable(TABLES.MIGRATION_CHECKPOINT);
        const cols = ['stage_name', 'status', 'started_at', 'finished_at', 'cursor', 'last_processed_id', 'processed_count', 'inserted_count', 'updated_count', 'skipped_count', 'duplicate_count', 'quarantined_count', 'error_count', 'message', 'payload_json'];
        for (const col of cols) {
          if (schema[col]) {
            await queryInterface.removeColumn(TABLES.MIGRATION_CHECKPOINT, col, { transaction });
          }
        }
        try {
          await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_migration_checkpoint_status;', { transaction });
        } catch (e) {
          // mysql ignore
        }
      }

      if (await tableExists(queryInterface, TABLES.MIGRATION_QUARANTINE)) {
        const schema = await queryInterface.describeTable(TABLES.MIGRATION_QUARANTINE);
        const cols = ['stage_name', 'source_type', 'source_ref', 'student_id', 'reason_code', 'reason_message', 'raw_payload'];
        for (const col of cols) {
          if (schema[col]) {
            await queryInterface.removeColumn(TABLES.MIGRATION_QUARANTINE, col, { transaction });
          }
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
