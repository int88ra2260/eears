'use strict';

/**
 * V2 快取列為「每學期每學生一筆」，不再使用舊欄位 skill／attemptId 必填；
 * MySQL strict 模式下 bulkCreate 若未帶 skill 會報 Field 'skill' doesn't have a default value。
 * 將舊相容欄位改為可 NULL，與 Sequelize 模型一致。
 */

const TABLE = 'et_semester_student_best_skills';

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.table_name));
  return normalized.includes(tableName);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) return;

    await queryInterface.changeColumn(TABLE, 'skill', {
      type: Sequelize.STRING(20),
      allowNull: true
    });

    await queryInterface.changeColumn(TABLE, 'attemptId', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, TABLE))) return;

    const [[row]] = await queryInterface.sequelize.query(
      `SELECT COUNT(*) AS cnt FROM \`${TABLE}\` WHERE skill IS NULL OR attemptId IS NULL`
    );
    const cnt = row && Number(row.cnt);
    if (cnt > 0) {
      // 已有 V2 快取列無法安全改回 NOT NULL，略過還原這兩欄
      return;
    }

    await queryInterface.changeColumn(TABLE, 'attemptId', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await queryInterface.changeColumn(TABLE, 'skill', {
      type: Sequelize.STRING(20),
      allowNull: false
    });
  }
};
