'use strict';

const TABLES = {
  STUDENTS: 'students',
  COURSES: 'courses',
  COURSE_ENROLLMENTS: 'course_enrollments',
  COURSE_OUTCOME_MAPPINGS: 'course_outcome_mappings'
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
    if (!duplicatedIndex && !duplicatedEntry) throw error;
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
      if (!(await tableExists(queryInterface, TABLES.COURSES))) {
        await queryInterface.createTable(TABLES.COURSES, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          semester_id: { type: Sequelize.STRING(12), allowNull: false },
          course_code: { type: Sequelize.STRING(40), allowNull: false },
          course_name: { type: Sequelize.STRING(200), allowNull: false },
          department_code: { type: Sequelize.STRING(40), allowNull: true },
          department_name: { type: Sequelize.STRING(160), allowNull: true },
          instructor_name: { type: Sequelize.STRING(160), allowNull: true },
          credits: { type: Sequelize.DECIMAL(4, 1), allowNull: true },
          course_type: { type: Sequelize.STRING(40), allowNull: true },
          source_ref: { type: Sequelize.STRING(120), allowNull: true },
          meta_json: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.COURSES, ['semester_id', 'course_code'], { unique: true, name: 'uk_courses_semester_code' }, transaction);
      await addIndexSafe(queryInterface, TABLES.COURSES, ['semester_id', 'department_code'], { name: 'idx_courses_semester_department' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.COURSE_ENROLLMENTS))) {
        await queryInterface.createTable(TABLES.COURSE_ENROLLMENTS, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          course_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.COURSES, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          student_pk: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: true,
            references: { model: TABLES.STUDENTS, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL'
          },
          student_id: { type: Sequelize.STRING(20), allowNull: false },
          student_name: { type: Sequelize.STRING(120), allowNull: true },
          semester_id: { type: Sequelize.STRING(12), allowNull: false },
          enrollment_status: {
            type: Sequelize.ENUM('enrolled', 'completed', 'withdrawn', 'failed', 'unknown'),
            allowNull: false,
            defaultValue: 'enrolled'
          },
          final_score: { type: Sequelize.DECIMAL(6, 2), allowNull: true },
          pass_status: {
            type: Sequelize.ENUM('passed', 'failed', 'in_progress', 'unknown'),
            allowNull: false,
            defaultValue: 'unknown'
          },
          source_ref: { type: Sequelize.STRING(120), allowNull: true },
          raw_payload: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.COURSE_ENROLLMENTS, ['course_id', 'student_id'], { unique: true, name: 'uk_course_enrollments_course_student' }, transaction);
      await addIndexSafe(queryInterface, TABLES.COURSE_ENROLLMENTS, ['student_id', 'semester_id'], { name: 'idx_course_enrollments_student_semester' }, transaction);
      await addIndexSafe(queryInterface, TABLES.COURSE_ENROLLMENTS, ['student_pk', 'semester_id'], { name: 'idx_course_enrollments_student_pk_semester' }, transaction);

      if (!(await tableExists(queryInterface, TABLES.COURSE_OUTCOME_MAPPINGS))) {
        await queryInterface.createTable(TABLES.COURSE_OUTCOME_MAPPINGS, {
          id: { type: Sequelize.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
          course_id: {
            type: Sequelize.BIGINT.UNSIGNED,
            allowNull: false,
            references: { model: TABLES.COURSES, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
          },
          outcome_key: { type: Sequelize.STRING(64), allowNull: false },
          outcome_label: { type: Sequelize.STRING(200), allowNull: false },
          outcome_type: {
            type: Sequelize.ENUM('competency', 'cefr', 'program', 'other'),
            allowNull: false,
            defaultValue: 'other'
          },
          target_level: { type: Sequelize.STRING(40), allowNull: true },
          weight: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
          meta_json: { type: Sequelize.JSON, allowNull: true },
          created_at: { allowNull: false, type: Sequelize.DATE },
          updated_at: { allowNull: false, type: Sequelize.DATE }
        }, { transaction });
      }
      await addIndexSafe(queryInterface, TABLES.COURSE_OUTCOME_MAPPINGS, ['course_id', 'outcome_key'], { unique: true, name: 'uk_course_outcomes_course_key' }, transaction);
      await addIndexSafe(queryInterface, TABLES.COURSE_OUTCOME_MAPPINGS, ['outcome_type', 'outcome_key'], { name: 'idx_course_outcomes_type_key' }, transaction);

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (await tableExists(queryInterface, TABLES.COURSE_OUTCOME_MAPPINGS)) {
        await removeIndexSafe(queryInterface, TABLES.COURSE_OUTCOME_MAPPINGS, 'uk_course_outcomes_course_key', transaction);
        await removeIndexSafe(queryInterface, TABLES.COURSE_OUTCOME_MAPPINGS, 'idx_course_outcomes_type_key', transaction);
        await queryInterface.dropTable(TABLES.COURSE_OUTCOME_MAPPINGS, { transaction });
      }
      if (await tableExists(queryInterface, TABLES.COURSE_ENROLLMENTS)) {
        await removeIndexSafe(queryInterface, TABLES.COURSE_ENROLLMENTS, 'uk_course_enrollments_course_student', transaction);
        await removeIndexSafe(queryInterface, TABLES.COURSE_ENROLLMENTS, 'idx_course_enrollments_student_semester', transaction);
        await removeIndexSafe(queryInterface, TABLES.COURSE_ENROLLMENTS, 'idx_course_enrollments_student_pk_semester', transaction);
        await queryInterface.dropTable(TABLES.COURSE_ENROLLMENTS, { transaction });
      }
      if (await tableExists(queryInterface, TABLES.COURSES)) {
        await removeIndexSafe(queryInterface, TABLES.COURSES, 'uk_courses_semester_code', transaction);
        await removeIndexSafe(queryInterface, TABLES.COURSES, 'idx_courses_semester_department', transaction);
        await queryInterface.dropTable(TABLES.COURSES, { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
