'use strict';

/**
 * 學期化填答：
 * - survey_responses（SurveyModuleResponse）：新增 semester，唯一鍵 (studentId, surveyId, semester)
 * - english_table_survey_responses / english_club_survey_responses：新增 semester，改為 (studentId, semester) 唯一
 *
 * 既有資料：semester 以 114-1 回填（對應原「單一學期」寫死情境），不刪除列。
 * 須在 20260410120000-create-survey-product-module-tables 之後執行。
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, INTEGER } = Sequelize;

    async function dropUniqueIndexOnColumn(table, columnName) {
      const qi = queryInterface.sequelize;
      const dialect = qi.getDialect();
      if (dialect === 'mysql' || dialect === 'mariadb') {
        const [rows] = await qi.query(
          `SHOW INDEX FROM \`${table}\` WHERE Column_name = :col AND Non_unique = 0`,
          { replacements: { col: columnName } }
        );
        for (const r of rows || []) {
          const keyName = r.Key_name;
          if (keyName && keyName !== 'PRIMARY') {
            await queryInterface.removeIndex(table, keyName);
          }
        }
        return;
      }
      if (dialect === 'sqlite') {
        const [rows] = await qi.query(`PRAGMA index_list('${table}')`);
        for (const idx of rows || []) {
          const [info] = await qi.query(`PRAGMA index_info('${idx.name}')`);
          const cols = (info || []).map((x) => x.name);
          if (cols.length === 1 && cols[0] === columnName && idx.unique) {
            await queryInterface.removeIndex(table, idx.name);
          }
        }
      }
    }

    const legacyTables = ['english_table_survey_responses', 'english_club_survey_responses'];
    for (const table of legacyTables) {
      const desc = await queryInterface.describeTable(table).catch(() => null);
      if (!desc) continue;
      if (!desc.semester) {
        await queryInterface.addColumn(table, 'semester', {
          type: STRING(10),
          allowNull: true,
        });
      }
      await queryInterface.sequelize.query(`
        UPDATE \`${table}\` SET semester = '114-1' WHERE semester IS NULL OR semester = ''
      `);
      await queryInterface.changeColumn(table, 'semester', {
        type: STRING(10),
        allowNull: false,
      });
      await dropUniqueIndexOnColumn(table, 'studentId');
      await queryInterface.addConstraint(table, {
        fields: ['studentId', 'semester'],
        type: 'unique',
        name: `${table}_uniq_student_semester`,
      });
    }

    const sr = await queryInterface.describeTable('survey_responses').catch(() => null);
    if (sr && !sr.semester) {
      await queryInterface.addColumn('survey_responses', 'semester', {
        type: STRING(10),
        allowNull: true,
      });
    }
    if (sr) {
      let desc = await queryInterface.describeTable('survey_responses');
      /** 舊庫可能先有同名表但欄位不完整（略過 20260410120000 的 createTable） */
      if (!desc.surveyId) {
        await queryInterface.addColumn('survey_responses', 'surveyId', {
          type: INTEGER.UNSIGNED,
          allowNull: true,
        });
      }
      if (!desc.surveyVersionId) {
        await queryInterface.addColumn('survey_responses', 'surveyVersionId', {
          type: INTEGER.UNSIGNED,
          allowNull: true,
        });
      }
      if (!desc.semesterKey) {
        await queryInterface.addColumn('survey_responses', 'semesterKey', {
          type: STRING(64),
          allowNull: true,
        });
      }
      desc = await queryInterface.describeTable('survey_responses');
      const hasSemesterKey = Boolean(desc.semesterKey);
      const hasSurveyId = Boolean(desc.surveyId);
      const dialect = queryInterface.sequelize.getDialect();
      if (dialect === 'mysql' || dialect === 'mariadb') {
        if (hasSemesterKey) {
          await queryInterface.sequelize.query(`
            UPDATE survey_responses
            SET semester = CASE
              WHEN semesterKey IS NOT NULL AND semesterKey REGEXP '^[0-9]{3}-[12]$' THEN semesterKey
              ELSE '114-1'
            END
            WHERE semester IS NULL OR semester = ''
          `);
        } else {
          await queryInterface.sequelize.query(`
            UPDATE survey_responses
            SET semester = '114-1'
            WHERE semester IS NULL OR semester = ''
          `);
        }
      } else if (hasSemesterKey) {
        const [rows] = await queryInterface.sequelize.query(
          "SELECT id, semesterKey FROM survey_responses WHERE semester IS NULL OR semester = ''"
        );
        const { isValidSemester } = require('../utils/semester');
        for (const r of rows || []) {
          const sk = r.semesterKey;
          const sem = isValidSemester(sk) ? sk : '114-1';
          await queryInterface.sequelize.query('UPDATE survey_responses SET semester = ? WHERE id = ?', {
            replacements: [sem, r.id],
          });
        }
      } else {
        await queryInterface.sequelize.query(`
          UPDATE survey_responses SET semester = '114-1' WHERE semester IS NULL OR semester = ''
        `);
      }
      await queryInterface.changeColumn('survey_responses', 'semester', {
        type: STRING(10),
        allowNull: false,
      });
      await queryInterface.removeIndex('survey_responses', 'survey_responses_survey_student_idx').catch(() => {});
      if (hasSurveyId) {
        await queryInterface.addConstraint('survey_responses', {
          fields: ['studentId', 'surveyId', 'semester'],
          type: 'unique',
          name: 'uniq_student_survey_semester',
        });
      } else {
        await queryInterface.addConstraint('survey_responses', {
          fields: ['studentId', 'semester'],
          type: 'unique',
          name: 'uniq_student_semester_survey_responses',
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const { STRING } = Sequelize;
    const legacyTables = ['english_table_survey_responses', 'english_club_survey_responses'];

    const sr = await queryInterface.describeTable('survey_responses').catch(() => null);
    if (sr && sr.semester) {
      await queryInterface.removeConstraint('survey_responses', 'uniq_student_survey_semester').catch(() => {});
      await queryInterface.removeConstraint('survey_responses', 'uniq_student_semester_survey_responses').catch(
        () => {}
      );
      await queryInterface.addIndex('survey_responses', ['surveyId', 'studentId'], {
        name: 'survey_responses_survey_student_idx',
      }).catch(() => {});
      await queryInterface.removeColumn('survey_responses', 'semester');
    }

    for (const table of legacyTables) {
      const desc = await queryInterface.describeTable(table).catch(() => null);
      if (!desc || !desc.semester) continue;
      await queryInterface.removeConstraint(table, `${table}_uniq_student_semester`).catch(() => {});
      await queryInterface.addConstraint(table, {
        fields: ['studentId'],
        type: 'unique',
        name: `${table}_studentId_unique`,
      });
      await queryInterface.changeColumn(table, 'semester', {
        type: STRING(10),
        allowNull: true,
      });
      await queryInterface.removeColumn(table, 'semester');
    }
  },
};
