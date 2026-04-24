'use strict';

/**
 * 刪除 et_exam_attempts 重複列（同 studentId + 同日 + 同考試類型保留 id 最大一筆），
 * 並備份被刪列至 *_dedupe_bak_20260420 表供 rollback（sequelize db:migrate:undo）。
 *
 * 注意：MySQL 對部分 DDL 會隱式提交，故本 migration 不以單一 transaction 包住 DDL+DML；
 * 若執行中斷，請檢查備份表並手動清理後重跑。
 *
 * 去重鍵與 legacyAttemptScoreAdapter.dedupeAttemptsForDisplay 一致。
 */

const ATTEMPT_BAK = 'et_exam_attempts_dedupe_bak_20260420';
const LEGACY_SCORE_BAK = 'et_exam_attempt_scores_dedupe_bak_20260420';
const SKILL_SCORE_BAK = 'et_exam_attempt_skill_scores_dedupe_bak_20260420';

const CHUNK = 500;

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.table_name));
  return normalized.includes(tableName);
}

async function getDuplicateAttemptIds(sequelize) {
  const [rows] = await sequelize.query(
    `
    SELECT a.id AS id
    FROM et_exam_attempts AS a
    WHERE EXISTS (
      SELECT 1
      FROM et_exam_attempts AS b
      WHERE b.studentId = a.studentId
        AND COALESCE(b.examDate, b.testDate) <=> COALESCE(a.examDate, a.testDate)
        AND UPPER(TRIM(COALESCE(b.examType, b.testType, '')))
          = UPPER(TRIM(COALESCE(a.examType, a.testType, '')))
        AND b.id > a.id
    )
    ORDER BY a.id ASC
    `
  );
  return rows.map((r) => Number(r.id));
}

function chunkIds(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    out.push(ids.slice(i, i + CHUNK));
  }
  return out;
}

async function dropBackupIfAny(queryInterface) {
  for (const name of [SKILL_SCORE_BAK, LEGACY_SCORE_BAK, ATTEMPT_BAK]) {
    if (await tableExists(queryInterface, name)) {
      await queryInterface.dropTable(name);
    }
  }
}

module.exports = {
  async up(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const ids = await getDuplicateAttemptIds(sequelize);
    if (ids.length === 0) {
      return;
    }

    await dropBackupIfAny(queryInterface);

    await sequelize.query(`CREATE TABLE ${ATTEMPT_BAK} LIKE et_exam_attempts`);
    await sequelize.query(`CREATE TABLE ${LEGACY_SCORE_BAK} LIKE et_exam_attempt_scores`);
    const hasSkillTable = await tableExists(queryInterface, 'et_exam_attempt_skill_scores');
    if (hasSkillTable) {
      await sequelize.query(`CREATE TABLE ${SKILL_SCORE_BAK} LIKE et_exam_attempt_skill_scores`);
    }

    for (const part of chunkIds(ids)) {
      const idList = part.join(',');
      await sequelize.query(
        `INSERT INTO ${ATTEMPT_BAK} SELECT * FROM et_exam_attempts WHERE id IN (${idList})`
      );
      await sequelize.query(
        `INSERT INTO ${LEGACY_SCORE_BAK} SELECT * FROM et_exam_attempt_scores WHERE attemptId IN (${idList})`
      );
      if (hasSkillTable) {
        await sequelize.query(
          `INSERT INTO ${SKILL_SCORE_BAK} SELECT * FROM et_exam_attempt_skill_scores WHERE attemptId IN (${idList})`
        );
      }
    }

    for (const part of chunkIds(ids)) {
      const idList = part.join(',');
      await sequelize.query(
        `UPDATE et_semester_student_best_skills SET attemptId = NULL WHERE attemptId IN (${idList})`
      );
    }

    for (const part of chunkIds(ids)) {
      const idList = part.join(',');
      await sequelize.query(`DELETE FROM et_exam_attempts WHERE id IN (${idList})`);
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;

    if (!(await tableExists(queryInterface, ATTEMPT_BAK))) {
      return;
    }

    const [[cntRow]] = await sequelize.query(`SELECT COUNT(*) AS cnt FROM ${ATTEMPT_BAK}`);
    if (!cntRow || Number(cntRow.cnt) === 0) {
      return;
    }

    await sequelize.query(`INSERT INTO et_exam_attempts SELECT * FROM ${ATTEMPT_BAK}`);

    if (await tableExists(queryInterface, LEGACY_SCORE_BAK)) {
      const [[lc]] = await sequelize.query(`SELECT COUNT(*) AS c FROM ${LEGACY_SCORE_BAK}`);
      if (lc && Number(lc.c) > 0) {
        await sequelize.query(`INSERT INTO et_exam_attempt_scores SELECT * FROM ${LEGACY_SCORE_BAK}`);
      }
    }

    if (await tableExists(queryInterface, SKILL_SCORE_BAK)) {
      const [[sc]] = await sequelize.query(`SELECT COUNT(*) AS c FROM ${SKILL_SCORE_BAK}`);
      if (sc && Number(sc.c) > 0) {
        await sequelize.query(`INSERT INTO et_exam_attempt_skill_scores SELECT * FROM ${SKILL_SCORE_BAK}`);
      }
    }

    await queryInterface.dropTable(ATTEMPT_BAK);
    await queryInterface.dropTable(LEGACY_SCORE_BAK);
    if (await tableExists(queryInterface, SKILL_SCORE_BAK)) {
      await queryInterface.dropTable(SKILL_SCORE_BAK);
    }
  }
};
