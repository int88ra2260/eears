'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.includes(name);

    try {
      // 1. et_semesters
      if (!hasTable('et_semesters')) {
      await queryInterface.createTable('et_semesters', {
        id: {
          type: Sequelize.STRING(20),
          primaryKey: true,
          comment: '學期 ID，如 114-1'
        },
        startDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '學期開始日' },
        endDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '學期結束日' },
        snapshotDate: { type: Sequelize.DATEONLY, allowNull: true, comment: '名冊/統計鎖定日' },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }

      // 2. et_student_master
      if (!hasTable('et_student_master')) {
      await queryInterface.createTable('et_student_master', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        studentId: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: '學號'
        },
        name: { type: Sequelize.STRING(100), allowNull: true },
        college: { type: Sequelize.STRING(100), allowNull: true },
        dept: { type: Sequelize.STRING(100), allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }
      // studentId 已在 createTable 設 unique: true，無須再 addIndex

      // 3. et_cefr_levels (lookup)
      if (!hasTable('et_cefr_levels')) {
      await queryInterface.createTable('et_cefr_levels', {
        level: {
          type: Sequelize.STRING(10),
          primaryKey: true,
          comment: 'A1, A2, B1, B2, C1, C2'
        },
        rank: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'A1=1 .. C2=6'
        },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }
      const now = new Date();
      const cefrRows = [
        { level: 'A1', rank: 1, createdAt: now, updatedAt: now },
        { level: 'A2', rank: 2, createdAt: now, updatedAt: now },
        { level: 'B1', rank: 3, createdAt: now, updatedAt: now },
        { level: 'B2', rank: 4, createdAt: now, updatedAt: now },
        { level: 'C1', rank: 5, createdAt: now, updatedAt: now },
        { level: 'C2', rank: 6, createdAt: now, updatedAt: now }
      ];
      try {
        const [countResult] = await queryInterface.sequelize.query(
          'SELECT COUNT(*) as n FROM et_cefr_levels',
          { transaction }
        );
        const count = countResult && countResult[0] && countResult[0].n !== undefined ? Number(countResult[0].n) : 0;
        if (count === 0) await queryInterface.bulkInsert('et_cefr_levels', cefrRows, { transaction });
      } catch (e) {
        if (!e.original || (e.original.code !== 'ER_DUP_ENTRY' && e.original.errno !== 1062)) throw e;
        // 主鍵已存在則略過，繼續後續步驟
      }

      // 4. et_enrollment_snapshots
      if (!hasTable('et_enrollment_snapshots')) {
      await queryInterface.createTable('et_enrollment_snapshots', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        semesterId: {
          type: Sequelize.STRING(20),
          allowNull: false,
          references: { model: 'et_semesters', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        studentId: { type: Sequelize.STRING(50), allowNull: false, comment: '學號' },
        grade: { type: Sequelize.STRING(20), allowNull: true, comment: '該學期年級' },
        status: { type: Sequelize.STRING(20), allowNull: true, comment: '在學/休學/退學' },
        isActive: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: '是否納入統計'
        },
        importBatchId: { type: Sequelize.STRING(50), allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }
      try {
        await queryInterface.addIndex('et_enrollment_snapshots', ['semesterId', 'studentId'], {
          unique: true,
          name: 'uk_et_enrollment_semester_student',
          transaction
        });
      } catch (e) {
        if (e.original && e.original.code !== 'ER_DUP_KEYNAME' && (!e.message || !e.message.includes('Duplicate key name'))) throw e;
      }
      try {
        await queryInterface.addIndex('et_enrollment_snapshots', ['semesterId', 'grade', 'isActive'], {
          name: 'idx_et_enrollment_semester_grade_active',
          transaction
        });
      } catch (e) {
        if (e.original && e.original.code !== 'ER_DUP_KEYNAME' && (!e.message || !e.message.includes('Duplicate key name'))) throw e;
      }

      // 5. et_exam_attempts
      if (!hasTable('et_exam_attempts')) {
      await queryInterface.createTable('et_exam_attempts', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        studentId: { type: Sequelize.STRING(50), allowNull: false },
        testType: { type: Sequelize.STRING(50), allowNull: true, comment: 'BESTEP/TOEIC/IELTS 等' },
        testDate: { type: Sequelize.DATEONLY, allowNull: true },
        source: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'manual_import',
          comment: 'manual_import / official_import / api_sync'
        },
        importBatchId: { type: Sequelize.STRING(50), allowNull: true },
        status: {
          type: Sequelize.STRING(20),
          allowNull: false,
          defaultValue: 'valid',
          comment: 'valid / void / replaced'
        },
        replacedByAttemptId: { type: Sequelize.INTEGER, allowNull: true, comment: '更正鏈' },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }
      const addIndexSafe = async (table, fields, opts) => {
        try {
          await queryInterface.addIndex(table, fields, { ...opts, transaction });
        } catch (e) {
          if (e.original && e.original.code !== 'ER_DUP_KEYNAME' && (!e.message || !e.message.includes('Duplicate key name'))) throw e;
        }
      };
      await addIndexSafe('et_exam_attempts', ['studentId', 'testType', 'testDate'], { name: 'idx_et_attempts_student_type_date' });
      await addIndexSafe('et_exam_attempts', ['importBatchId'], { name: 'idx_et_attempts_batch' });
      await addIndexSafe('et_exam_attempts', ['status'], { name: 'idx_et_attempts_status' });

      // 6. et_exam_attempt_scores
      if (!hasTable('et_exam_attempt_scores')) {
      await queryInterface.createTable('et_exam_attempt_scores', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        attemptId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'et_exam_attempts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        skill: {
          type: Sequelize.STRING(20),
          allowNull: false,
          comment: 'LISTENING/READING/SPEAKING/WRITING'
        },
        rawScore: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        cefr: { type: Sequelize.STRING(10), allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }
      await addIndexSafe('et_exam_attempt_scores', ['attemptId', 'skill'], { unique: true, name: 'uk_et_attempt_scores_attempt_skill' });
      await addIndexSafe('et_exam_attempt_scores', ['skill'], { name: 'idx_et_attempt_scores_skill' });
      await addIndexSafe('et_exam_attempt_scores', ['cefr'], { name: 'idx_et_attempt_scores_cefr' });

      // 7. et_semester_student_best_skills
      if (!hasTable('et_semester_student_best_skills')) {
      await queryInterface.createTable('et_semester_student_best_skills', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        semesterId: {
          type: Sequelize.STRING(20),
          allowNull: false,
          references: { model: 'et_semesters', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        studentId: { type: Sequelize.STRING(50), allowNull: false },
        skill: { type: Sequelize.STRING(20), allowNull: false },
        attemptId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'et_exam_attempts', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        rawScore: { type: Sequelize.DECIMAL(8, 2), allowNull: true },
        cefr: { type: Sequelize.STRING(10), allowNull: true },
        cefrRank: { type: Sequelize.INTEGER, allowNull: true },
        computedAt: { type: Sequelize.DATE, allowNull: true },
        createdAt: { allowNull: false, type: Sequelize.DATE },
        updatedAt: { allowNull: false, type: Sequelize.DATE }
      }, { transaction });
      }
      await addIndexSafe('et_semester_student_best_skills', ['semesterId', 'studentId', 'skill'], { unique: true, name: 'uk_et_best_semester_student_skill' });
      await addIndexSafe('et_semester_student_best_skills', ['semesterId'], { name: 'idx_et_best_semester' });

      await transaction.commit();
      console.log('✅ English test tracking tables created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating english test tracking tables:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('et_semester_student_best_skills', { transaction });
      await queryInterface.dropTable('et_exam_attempt_scores', { transaction });
      await queryInterface.dropTable('et_exam_attempts', { transaction });
      await queryInterface.dropTable('et_enrollment_snapshots', { transaction });
      await queryInterface.dropTable('et_cefr_levels', { transaction });
      await queryInterface.dropTable('et_student_master', { transaction });
      await queryInterface.dropTable('et_semesters', { transaction });
      await transaction.commit();
      console.log('✅ English test tracking tables dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping english test tracking tables:', error);
      throw error;
    }
  }
};
