'use strict';

const TABLE = 'job_runs';

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.table_name));
  return normalized.includes(tableName);
}

async function addIndexSafe(queryInterface, tableName, fields, options, transaction) {
  try {
    await queryInterface.addIndex(tableName, fields, { ...options, transaction });
  } catch (error) {
    const message = (error && error.message) || '';
    const mysqlCode = error && error.original && error.original.code;
    const duplicatedIndex = mysqlCode === 'ER_DUP_KEYNAME' || message.includes('Duplicate key name');
    if (!duplicatedIndex) throw error;
  }
}

async function removeIndexSafe(queryInterface, tableName, indexName, transaction) {
  try {
    await queryInterface.removeIndex(tableName, indexName, { transaction });
  } catch (error) {
    const message = (error && error.message) || '';
    const mysqlCode = error && error.original && error.original.code;
    const noSuchIndex = mysqlCode === 'ER_CANT_DROP_FIELD_OR_KEY' || message.includes('check that column/key exists');
    if (!noSuchIndex) throw error;
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (!(await tableExists(queryInterface, TABLE))) {
        await queryInterface.createTable(TABLE, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          job_name: { type: Sequelize.STRING(100), allowNull: false },
          semester_id: { type: Sequelize.STRING(12), allowNull: true },
          status: {
            type: Sequelize.ENUM('running', 'success', 'failed', 'skipped'),
            allowNull: false,
            defaultValue: 'running'
          },
          started_at: { type: Sequelize.DATE, allowNull: false },
          finished_at: { type: Sequelize.DATE, allowNull: true },
          duration_ms: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
          triggered_by: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'manual' },
          request_id: { type: Sequelize.STRING(64), allowNull: true },
          summary_json: { type: Sequelize.JSON, allowNull: true },
          error_message: { type: Sequelize.TEXT, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }

      await addIndexSafe(queryInterface, TABLE, ['job_name', 'semester_id', 'started_at'], {
        name: 'idx_job_runs_job_semester_started'
      }, transaction);
      await addIndexSafe(queryInterface, TABLE, ['status', 'started_at'], {
        name: 'idx_job_runs_status_started'
      }, transaction);
      await addIndexSafe(queryInterface, TABLE, ['request_id'], {
        name: 'idx_job_runs_request_id'
      }, transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (await tableExists(queryInterface, TABLE)) {
        await removeIndexSafe(queryInterface, TABLE, 'idx_job_runs_job_semester_started', transaction);
        await removeIndexSafe(queryInterface, TABLE, 'idx_job_runs_status_started', transaction);
        await removeIndexSafe(queryInterface, TABLE, 'idx_job_runs_request_id', transaction);
        await queryInterface.dropTable(TABLE, { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
