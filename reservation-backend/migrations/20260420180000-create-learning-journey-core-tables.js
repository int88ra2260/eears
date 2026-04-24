'use strict';

const TABLES = {
  STUDENTS: 'students',
  STUDENT_SEMESTER_PROFILES: 'student_semester_profiles',
  EXAM_REGISTRATIONS: 'exam_registrations',
  EXAM_ATTEMPTS: 'exam_attempts',
  EXAM_ATTEMPT_SKILL_SCORES: 'exam_attempt_skill_scores',
  ACTIVITY_PARTICIPATIONS: 'activity_participations',
  MIGRATION_BATCH: 'migration_batch',
  MIGRATION_CHECKPOINT: 'migration_checkpoint',
  MIGRATION_QUARANTINE: 'migration_quarantine'
};

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
    const duplicatedEntry = mysqlCode === 'ER_DUP_ENTRY' || message.includes('Duplicate entry');
    if (!duplicatedIndex && !duplicatedEntry) {
      throw error;
    }
  }
}

async function removeIndexSafe(queryInterface, tableName, indexName, transaction) {
  try {
    await queryInterface.removeIndex(tableName, indexName, { transaction });
  } catch (error) {
    const message = (error && error.message) || '';
    const mysqlCode = error && error.original && error.original.code;
    const noSuchIndex = mysqlCode === 'ER_CANT_DROP_FIELD_OR_KEY' || message.includes('check that column/key exists');
    if (!noSuchIndex) {
      throw error;
    }
  }
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (!(await tableExists(queryInterface, TABLES.STUDENTS))) {
        await queryInterface.createTable(TABLES.STUDENTS, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          student_id: { type: Sequelize.STRING(20), allowNull: false },
          name_zh: { type: Sequelize.STRING(120), allowNull: false },
          name_en: { type: Sequelize.STRING(120), allowNull: true },
          department_code: { type: Sequelize.STRING(20), allowNull: true },
          department_name: { type: Sequelize.STRING(120), allowNull: true },
          college_code: { type: Sequelize.STRING(20), allowNull: true },
          grade: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
          enrollment_year: { type: Sequelize.SMALLINT.UNSIGNED, allowNull: true },
          status: { type: Sequelize.ENUM('active', 'inactive', 'graduated', 'suspended'), allowNull: false, defaultValue: 'active' },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.STUDENTS, ['student_id'], { unique: true, name: 'uk_students_student_id' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.EXAM_REGISTRATIONS))) {
        await queryInterface.createTable(TABLES.EXAM_REGISTRATIONS, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          legacy_registration_id: { type: Sequelize.BIGINT.UNSIGNED, allowNull: true },
          student_pk: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.STUDENTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          student_id: { type: Sequelize.STRING(20), allowNull: false },
          semester_id: { type: Sequelize.STRING(12), allowNull: false },
          registration_channel: { type: Sequelize.ENUM('cultivation', 'admin_import', 'system'), allowNull: false, defaultValue: 'cultivation' },
          exam_scope: { type: Sequelize.ENUM('LR', 'SW', 'ALL', 'NONE'), allowNull: false, defaultValue: 'ALL' },
          status: { type: Sequelize.ENUM('pending', 'success', 'failed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
          applied_at: { type: Sequelize.DATE, allowNull: true },
          approved_at: { type: Sequelize.DATE, allowNull: true },
          failure_reason: { type: Sequelize.TEXT, allowNull: true },
          meta_json: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.EXAM_REGISTRATIONS, ['student_pk', 'semester_id'], { name: 'idx_exam_registrations_student_semester' }, transaction);
      await addIndexSafe(queryInterface, TABLES.EXAM_REGISTRATIONS, ['student_id', 'semester_id', 'registration_channel'], { unique: true, name: 'uk_exam_reg_student_sem_channel' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.EXAM_ATTEMPTS))) {
        await queryInterface.createTable(TABLES.EXAM_ATTEMPTS, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          student_pk: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.STUDENTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          student_id: { type: Sequelize.STRING(20), allowNull: false },
          semester_id: { type: Sequelize.STRING(12), allowNull: true },
          registration_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: TABLES.EXAM_REGISTRATIONS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          source_type: { type: Sequelize.ENUM('BESTEP', 'EXTERNAL', 'LEGACY_ET', 'MANUAL'), allowNull: false, defaultValue: 'MANUAL' },
          source_ref: { type: Sequelize.STRING(80), allowNull: true },
          exam_vendor: { type: Sequelize.STRING(40), allowNull: true },
          exam_scope: { type: Sequelize.ENUM('LR', 'SW', 'ALL'), allowNull: false, defaultValue: 'ALL' },
          exam_date: { type: Sequelize.DATEONLY, allowNull: false },
          status: { type: Sequelize.ENUM('valid', 'invalid', 'duplicate', 'pending_review'), allowNull: false, defaultValue: 'valid' },
          raw_payload: { type: Sequelize.JSON, allowNull: true },
          dedupe_key: { type: Sequelize.STRING(64), allowNull: false },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.EXAM_ATTEMPTS, ['student_pk', 'semester_id'], { name: 'idx_exam_attempts_student_pk_semester' }, transaction);
      await addIndexSafe(queryInterface, TABLES.EXAM_ATTEMPTS, ['student_id', 'exam_date'], { name: 'idx_exam_attempts_student_id_date' }, transaction);
      await addIndexSafe(queryInterface, TABLES.EXAM_ATTEMPTS, ['dedupe_key'], { unique: true, name: 'uk_exam_attempts_dedupe_key' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.EXAM_ATTEMPT_SKILL_SCORES))) {
        await queryInterface.createTable(TABLES.EXAM_ATTEMPT_SKILL_SCORES, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          attempt_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.EXAM_ATTEMPTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          skill: { type: Sequelize.ENUM('listening', 'reading', 'speaking', 'writing'), allowNull: false },
          raw_score: { type: Sequelize.DECIMAL(7, 2), allowNull: true },
          raw_level: { type: Sequelize.STRING(20), allowNull: true },
          cefr_level: { type: Sequelize.ENUM('A1', 'A2', 'B1', 'B2', 'C1', 'C2'), allowNull: true },
          cefr_rank: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
          is_inferred: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          mapping_version: { type: Sequelize.STRING(20), allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.EXAM_ATTEMPT_SKILL_SCORES, ['attempt_id', 'skill'], { unique: true, name: 'uk_exam_attempt_skill_scores_attempt_skill' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.STUDENT_SEMESTER_PROFILES))) {
        await queryInterface.createTable(TABLES.STUDENT_SEMESTER_PROFILES, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          student_pk: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.STUDENTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          student_id: { type: Sequelize.STRING(20), allowNull: false },
          semester_id: { type: Sequelize.STRING(12), allowNull: false },
          is_rostered: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          roster_source: { type: Sequelize.ENUM('et_snapshot', 'manual', 'migrated'), allowNull: false, defaultValue: 'migrated' },
          attempt_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
          best_attained: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          latest_attained: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          best_snapshot_json: { type: Sequelize.JSON, allowNull: true },
          latest_snapshot_json: { type: Sequelize.JSON, allowNull: true },
          data_quality_flag: { type: Sequelize.ENUM('ok', 'missing_scores', 'conflict'), allowNull: false, defaultValue: 'ok' },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.STUDENT_SEMESTER_PROFILES, ['student_pk', 'semester_id'], { unique: true, name: 'uk_ssp_student_pk_semester' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.ACTIVITY_PARTICIPATIONS))) {
        await queryInterface.createTable(TABLES.ACTIVITY_PARTICIPATIONS, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          student_pk: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.STUDENTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          student_id: { type: Sequelize.STRING(20), allowNull: false },
          semester_id: { type: Sequelize.STRING(12), allowNull: true },
          event_id: { type: Sequelize.STRING(40), allowNull: false },
          activity_type: { type: Sequelize.ENUM('ET', 'EC', 'IF'), allowNull: false },
          attendance_status: { type: Sequelize.ENUM('registered', 'attended', 'absent', 'cancelled'), allowNull: false, defaultValue: 'registered' },
          participated_at: { type: Sequelize.DATE, allowNull: true },
          source_ref: { type: Sequelize.STRING(80), allowNull: false, defaultValue: 'unknown' },
          meta_json: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.ACTIVITY_PARTICIPATIONS, ['student_id', 'event_id', 'source_ref'], { unique: true, name: 'uk_ap_student_event_source' }, transaction);
      await addIndexSafe(queryInterface, TABLES.ACTIVITY_PARTICIPATIONS, ['student_pk', 'semester_id'], { name: 'idx_ap_student_pk_semester' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.MIGRATION_BATCH))) {
        await queryInterface.createTable(TABLES.MIGRATION_BATCH, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          batch_key: { type: Sequelize.STRING(64), allowNull: false },
          migration_name: { type: Sequelize.STRING(100), allowNull: false },
          status: { type: Sequelize.ENUM('running', 'completed', 'failed', 'partial', 'rolled_back'), allowNull: false, defaultValue: 'running' },
          started_at: { type: Sequelize.DATE, allowNull: false },
          finished_at: { type: Sequelize.DATE, allowNull: true },
          summary_json: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.MIGRATION_BATCH, ['batch_key'], { unique: true, name: 'uk_migration_batch_key' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.MIGRATION_CHECKPOINT))) {
        await queryInterface.createTable(TABLES.MIGRATION_CHECKPOINT, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          batch_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.MIGRATION_BATCH, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          step_name: { type: Sequelize.STRING(100), allowNull: false },
          checkpoint_data: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.MIGRATION_CHECKPOINT, ['batch_id', 'step_name'], { unique: true, name: 'uk_migration_checkpoint_batch_step' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.MIGRATION_QUARANTINE))) {
        await queryInterface.createTable(TABLES.MIGRATION_QUARANTINE, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          batch_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: TABLES.MIGRATION_BATCH, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          source_table: { type: Sequelize.STRING(100), allowNull: false },
          source_key: { type: Sequelize.STRING(120), allowNull: true },
          reason: { type: Sequelize.STRING(255), allowNull: false },
          payload_json: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.MIGRATION_QUARANTINE, ['batch_id', 'source_table'], { name: 'idx_migration_quarantine_batch_source' }, transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const dropOrder = [
        TABLES.MIGRATION_QUARANTINE,
        TABLES.MIGRATION_CHECKPOINT,
        TABLES.MIGRATION_BATCH,
        TABLES.ACTIVITY_PARTICIPATIONS,
        TABLES.STUDENT_SEMESTER_PROFILES,
        TABLES.EXAM_ATTEMPT_SKILL_SCORES,
        TABLES.EXAM_ATTEMPTS,
        TABLES.EXAM_REGISTRATIONS,
        TABLES.STUDENTS
      ];

      for (const tableName of dropOrder) {
        if (await tableExists(queryInterface, tableName)) {
          if (tableName === TABLES.ACTIVITY_PARTICIPATIONS) {
            await removeIndexSafe(queryInterface, tableName, 'uk_ap_student_event_source', transaction);
            await removeIndexSafe(queryInterface, tableName, 'idx_ap_student_pk_semester', transaction);
          }
          if (tableName === TABLES.STUDENT_SEMESTER_PROFILES) {
            await removeIndexSafe(queryInterface, tableName, 'uk_ssp_student_pk_semester', transaction);
          }
          if (tableName === TABLES.EXAM_ATTEMPTS) {
            await removeIndexSafe(queryInterface, tableName, 'idx_exam_attempts_student_pk_semester', transaction);
            await removeIndexSafe(queryInterface, tableName, 'idx_exam_attempts_student_id_date', transaction);
            await removeIndexSafe(queryInterface, tableName, 'uk_exam_attempts_dedupe_key', transaction);
          }
          if (tableName === TABLES.EXAM_ATTEMPT_SKILL_SCORES) {
            await removeIndexSafe(queryInterface, tableName, 'uk_exam_attempt_skill_scores_attempt_skill', transaction);
          }
          if (tableName === TABLES.EXAM_REGISTRATIONS) {
            await removeIndexSafe(queryInterface, tableName, 'idx_exam_registrations_student_semester', transaction);
            await removeIndexSafe(queryInterface, tableName, 'uk_exam_reg_student_sem_channel', transaction);
          }
          if (tableName === TABLES.STUDENTS) {
            await removeIndexSafe(queryInterface, tableName, 'uk_students_student_id', transaction);
          }
          if (tableName === TABLES.MIGRATION_BATCH) {
            await removeIndexSafe(queryInterface, tableName, 'uk_migration_batch_key', transaction);
          }
          if (tableName === TABLES.MIGRATION_CHECKPOINT) {
            await removeIndexSafe(queryInterface, tableName, 'uk_migration_checkpoint_batch_step', transaction);
          }
          if (tableName === TABLES.MIGRATION_QUARANTINE) {
            await removeIndexSafe(queryInterface, tableName, 'idx_migration_quarantine_batch_source', transaction);
          }
          await queryInterface.dropTable(tableName, { transaction });
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
