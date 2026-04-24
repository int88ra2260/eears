'use strict';

const TABLES = {
  SEMESTERS: 'et_semesters',
  ENROLLMENT_SNAPSHOTS: 'et_enrollment_snapshots',
  EXAM_ATTEMPTS: 'et_exam_attempts',
  EXAM_ATTEMPT_SKILL_SCORES: 'et_exam_attempt_skill_scores',
  SEMESTER_STUDENT_BEST_SKILLS: 'et_semester_student_best_skills'
};

const EXAM_TYPES = ['BESTEP', 'TOEIC', 'TOEIC_SW', 'IELTS', 'TOEFL_IBT', 'GEPT'];
const ATTEMPT_STATUS = ['valid', 'invalid', 'draft'];
const ATTEMPT_SOURCE_TYPES = ['manual', 'excel_import'];
const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

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

async function removeColumnIfExists(queryInterface, tableName, columnName, transaction) {
  const schema = await queryInterface.describeTable(tableName);
  if (schema[columnName]) {
    await queryInterface.removeColumn(tableName, columnName, { transaction });
  }
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
      // 1) et_semesters
      if (!(await tableExists(queryInterface, TABLES.SEMESTERS))) {
        await queryInterface.createTable(TABLES.SEMESTERS, {
          id: {
            type: Sequelize.STRING(20),
            primaryKey: true,
            comment: '學期 ID（相容舊系統）'
          },
          code: { type: Sequelize.STRING(20), allowNull: false, unique: true },
          name: { type: Sequelize.STRING(100), allowNull: false },
          startDate: { type: Sequelize.DATEONLY, allowNull: true },
          endDate: { type: Sequelize.DATEONLY, allowNull: true },
          isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      } else {
        await addColumnIfMissing(queryInterface, TABLES.SEMESTERS, 'code', {
          type: Sequelize.STRING(20),
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTERS, 'name', {
          type: Sequelize.STRING(100),
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTERS, 'isActive', {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true
        }, transaction);
        await addIndexSafe(
          queryInterface,
          TABLES.SEMESTERS,
          ['code'],
          { unique: true, name: 'uk_et_semesters_code' },
          transaction
        );
      }

      // 2) et_enrollment_snapshots
      if (!(await tableExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS))) {
        await queryInterface.createTable(TABLES.ENROLLMENT_SNAPSHOTS, {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          semesterId: {
            type: Sequelize.STRING(20),
            allowNull: false,
            references: { model: TABLES.SEMESTERS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT'
          },
          studentId: { type: Sequelize.STRING(50), allowNull: false },
          studentName: { type: Sequelize.STRING(100), allowNull: true },
          department: { type: Sequelize.STRING(100), allowNull: true },
          college: { type: Sequelize.STRING(100), allowNull: true },
          grade: { type: Sequelize.STRING(20), allowNull: true },
          className: { type: Sequelize.STRING(50), allowNull: true },
          isDomestic: { type: Sequelize.BOOLEAN, allowNull: true },
          isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          sourceType: { type: Sequelize.STRING(30), allowNull: true },
          sourceBatchId: { type: Sequelize.STRING(50), allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      } else {
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'studentName', { type: Sequelize.STRING(100), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'department', { type: Sequelize.STRING(100), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'college', { type: Sequelize.STRING(100), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'className', { type: Sequelize.STRING(50), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'isDomestic', { type: Sequelize.BOOLEAN, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'sourceType', { type: Sequelize.STRING(30), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'sourceBatchId', { type: Sequelize.STRING(50), allowNull: true }, transaction);
      }
      await addIndexSafe(
        queryInterface,
        TABLES.ENROLLMENT_SNAPSHOTS,
        ['semesterId', 'studentId'],
        { unique: true, name: 'uk_et_enrollment_semester_student_v2' },
        transaction
      );

      // 3) et_exam_attempts
      if (!(await tableExists(queryInterface, TABLES.EXAM_ATTEMPTS))) {
        await queryInterface.createTable(TABLES.EXAM_ATTEMPTS, {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          studentId: { type: Sequelize.STRING(50), allowNull: false },
          examType: { type: Sequelize.ENUM(...EXAM_TYPES), allowNull: false },
          examDate: { type: Sequelize.DATEONLY, allowNull: true },
          sourceType: {
            type: Sequelize.ENUM(...ATTEMPT_SOURCE_TYPES),
            allowNull: false,
            defaultValue: 'manual'
          },
          sourceBatchId: { type: Sequelize.STRING(50), allowNull: true },
          rawPayload: { type: Sequelize.JSON, allowNull: true },
          status: {
            type: Sequelize.ENUM(...ATTEMPT_STATUS),
            allowNull: false,
            defaultValue: 'valid'
          },
          createdBy: { type: Sequelize.STRING(50), allowNull: true },
          updatedBy: { type: Sequelize.STRING(50), allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      } else {
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'examType', {
          type: Sequelize.ENUM(...EXAM_TYPES),
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'examDate', {
          type: Sequelize.DATEONLY,
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'sourceType', {
          type: Sequelize.ENUM(...ATTEMPT_SOURCE_TYPES),
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'sourceBatchId', {
          type: Sequelize.STRING(50),
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'rawPayload', {
          type: Sequelize.JSON,
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'createdBy', {
          type: Sequelize.STRING(50),
          allowNull: true
        }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.EXAM_ATTEMPTS, 'updatedBy', {
          type: Sequelize.STRING(50),
          allowNull: true
        }, transaction);
      }
      await addIndexSafe(
        queryInterface,
        TABLES.EXAM_ATTEMPTS,
        ['studentId', 'examType', 'examDate'],
        { name: 'idx_et_attempts_student_exam_type_date' },
        transaction
      );
      await addIndexSafe(
        queryInterface,
        TABLES.EXAM_ATTEMPTS,
        ['sourceType', 'sourceBatchId'],
        { name: 'idx_et_attempts_source_batch' },
        transaction
      );

      // 4) et_exam_attempt_skill_scores (new core table)
      if (!(await tableExists(queryInterface, TABLES.EXAM_ATTEMPT_SKILL_SCORES))) {
        await queryInterface.createTable(TABLES.EXAM_ATTEMPT_SKILL_SCORES, {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          attemptId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: TABLES.EXAM_ATTEMPTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          skill: { type: Sequelize.ENUM(...SKILLS), allowNull: false },
          rawScore: { type: Sequelize.FLOAT, allowNull: true },
          rawLevel: { type: Sequelize.STRING(30), allowNull: true },
          cefr: { type: Sequelize.STRING(10), allowNull: true },
          cefrRank: { type: Sequelize.INTEGER, allowNull: true },
          isInferred: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
          inferenceVersion: { type: Sequelize.STRING(30), allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(
        queryInterface,
        TABLES.EXAM_ATTEMPT_SKILL_SCORES,
        ['attemptId', 'skill'],
        { unique: true, name: 'uk_et_attempt_skill_scores_attempt_skill' },
        transaction
      );

      // 5) et_semester_student_best_skills (cache shape)
      if (!(await tableExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS))) {
        await queryInterface.createTable(TABLES.SEMESTER_STUDENT_BEST_SKILLS, {
          id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
          semesterId: {
            type: Sequelize.STRING(20),
            allowNull: false,
            references: { model: TABLES.SEMESTERS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          studentId: { type: Sequelize.STRING(50), allowNull: false },
          bestListeningCefr: { type: Sequelize.STRING(10), allowNull: true },
          bestListeningCefrRank: { type: Sequelize.INTEGER, allowNull: true },
          bestReadingCefr: { type: Sequelize.STRING(10), allowNull: true },
          bestReadingCefrRank: { type: Sequelize.INTEGER, allowNull: true },
          bestSpeakingCefr: { type: Sequelize.STRING(10), allowNull: true },
          bestSpeakingCefrRank: { type: Sequelize.INTEGER, allowNull: true },
          bestWritingCefr: { type: Sequelize.STRING(10), allowNull: true },
          bestWritingCefrRank: { type: Sequelize.INTEGER, allowNull: true },
          computedAt: { type: Sequelize.DATE, allowNull: true },
          computeVersion: { type: Sequelize.STRING(30), allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      } else {
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestListeningCefr', { type: Sequelize.STRING(10), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestListeningCefrRank', { type: Sequelize.INTEGER, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestReadingCefr', { type: Sequelize.STRING(10), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestReadingCefrRank', { type: Sequelize.INTEGER, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestSpeakingCefr', { type: Sequelize.STRING(10), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestSpeakingCefrRank', { type: Sequelize.INTEGER, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestWritingCefr', { type: Sequelize.STRING(10), allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestWritingCefrRank', { type: Sequelize.INTEGER, allowNull: true }, transaction);
        await addColumnIfMissing(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'computeVersion', { type: Sequelize.STRING(30), allowNull: true }, transaction);
      }
      await removeIndexSafe(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'uk_et_best_semester_student_skill', transaction);
      await addIndexSafe(
        queryInterface,
        TABLES.SEMESTER_STUDENT_BEST_SKILLS,
        ['semesterId', 'studentId'],
        { unique: true, name: 'uk_et_best_skills_semester_student' },
        transaction
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // rollback for new table
      if (await tableExists(queryInterface, TABLES.EXAM_ATTEMPT_SKILL_SCORES)) {
        await queryInterface.dropTable(TABLES.EXAM_ATTEMPT_SKILL_SCORES, { transaction });
      }

      // rollback columns added to et_exam_attempts
      if (await tableExists(queryInterface, TABLES.EXAM_ATTEMPTS)) {
        await removeIndexSafe(queryInterface, TABLES.EXAM_ATTEMPTS, 'idx_et_attempts_student_exam_type_date', transaction);
        await removeIndexSafe(queryInterface, TABLES.EXAM_ATTEMPTS, 'idx_et_attempts_source_batch', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'examType', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'examDate', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'sourceType', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'sourceBatchId', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'rawPayload', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'createdBy', transaction);
        await removeColumnIfExists(queryInterface, TABLES.EXAM_ATTEMPTS, 'updatedBy', transaction);
      }

      // rollback columns added to et_enrollment_snapshots
      if (await tableExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS)) {
        await removeIndexSafe(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'uk_et_enrollment_semester_student_v2', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'studentName', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'department', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'college', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'className', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'isDomestic', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'sourceType', transaction);
        await removeColumnIfExists(queryInterface, TABLES.ENROLLMENT_SNAPSHOTS, 'sourceBatchId', transaction);
      }

      // rollback columns added to et_semesters
      if (await tableExists(queryInterface, TABLES.SEMESTERS)) {
        await removeIndexSafe(queryInterface, TABLES.SEMESTERS, 'uk_et_semesters_code', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTERS, 'code', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTERS, 'name', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTERS, 'isActive', transaction);
      }

      // rollback cache columns/index
      if (await tableExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS)) {
        await removeIndexSafe(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'uk_et_best_skills_semester_student', transaction);
        await addIndexSafe(
          queryInterface,
          TABLES.SEMESTER_STUDENT_BEST_SKILLS,
          ['semesterId', 'studentId', 'skill'],
          { unique: true, name: 'uk_et_best_semester_student_skill' },
          transaction
        );
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestListeningCefr', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestListeningCefrRank', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestReadingCefr', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestReadingCefrRank', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestSpeakingCefr', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestSpeakingCefrRank', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestWritingCefr', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'bestWritingCefrRank', transaction);
        await removeColumnIfExists(queryInterface, TABLES.SEMESTER_STUDENT_BEST_SKILLS, 'computeVersion', transaction);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
