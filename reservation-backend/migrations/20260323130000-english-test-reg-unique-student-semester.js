'use strict';

/**
 * 報名改為 (studentId, semester) 唯一，允許跨學期多筆。
 * 先刪除同學期重複列（保留 id 最大＝通常最新），再移除舊 uk_student_id，加上 uk_student_semester。
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const dialect = queryInterface.sequelize.getDialect();

      // 刪除同 studentId + semester 重複列（保留 id 最大）
      if (dialect === 'mysql') {
        await queryInterface.sequelize.query(
          `
          DELETE e1 FROM english_test_registrations e1
          INNER JOIN english_test_registrations e2
            ON e1.studentId = e2.studentId
            AND COALESCE(e1.semester, '') = COALESCE(e2.semester, '')
            AND e1.id < e2.id
          `,
          { transaction: t }
        );
      } else {
        // SQLite / Postgres：簡化為僅加索引，由應用層去重（避免方言差異）
        console.warn('[migration] 非 MySQL，略過重複列刪除，請手動檢查 english_test_registrations');
      }

      // 移除舊的 uk_student_id（若存在）
      try {
        await queryInterface.removeConstraint('english_test_registrations', 'uk_student_id', { transaction: t });
      } catch (e) {
        if (!String(e.message || '').includes('check constraint') && !String(e.message || '').includes('Unknown')) {
          console.warn('[migration] remove uk_student_id:', e.message);
        }
      }

      // 非唯一索引 studentId 仍可用於查詢
      try {
        await queryInterface.addIndex('english_test_registrations', ['studentId'], {
          name: 'idx_student_id_nonunique',
          unique: false,
          transaction: t
        });
      } catch (e) {
        if (!String(e.message || '').includes('exists') && !String(e.message || '').includes('Duplicate')) {
          throw e;
        }
      }

      try {
        await queryInterface.addConstraint('english_test_registrations', {
          fields: ['studentId', 'semester'],
          type: 'unique',
          name: 'uk_student_semester',
          transaction: t
        });
      } catch (e) {
        if (String(e.message || '').includes('Duplicate') || String(e.message || '').includes('already exists')) {
          console.warn('[migration] uk_student_semester 已存在');
        } else {
          throw e;
        }
      }

      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const t = await queryInterface.sequelize.transaction();
    try {
      try {
        await queryInterface.removeConstraint('english_test_registrations', 'uk_student_semester', { transaction: t });
      } catch (e) {
        console.warn('[migration] down remove uk_student_semester:', e.message);
      }
      try {
        await queryInterface.addConstraint('english_test_registrations', {
          fields: ['studentId'],
          type: 'unique',
          name: 'uk_student_id',
          transaction: t
        });
      } catch (e) {
        console.warn('[migration] down restore uk_student_id:', e.message);
      }
      await t.commit();
    } catch (err) {
      await t.rollback();
      throw err;
    }
  }
};
