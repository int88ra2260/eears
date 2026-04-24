'use strict';

/**
 * Survey 產品級升級：
 * - 新增 semesters / survey_response_answers
 * - 擴充 surveys / survey_versions / survey_rules / survey_responses
 * - 以 eventId -> events.semesterId 優先回填 survey_responses.semesterId
 * - 其次以 submittedAt 推估學期（若 semesters 有資料）
 * - 輸出補值統計（console）
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { STRING, DATE, BOOLEAN, INTEGER, JSON: JSONTYPE, TEXT } = Sequelize;

    const semesters = await queryInterface.describeTable('semesters').catch(() => null);
    if (!semesters) {
      await queryInterface.createTable('semesters', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        code: { type: STRING(20), allowNull: false, unique: true },
        name: { type: STRING(120), allowNull: false },
        startDate: { type: DATE, allowNull: false },
        endDate: { type: DATE, allowNull: false },
        isActive: { type: BOOLEAN, allowNull: false, defaultValue: false },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('semesters', ['code'], { unique: true, name: 'semesters_code_uq' });
      await queryInterface.addIndex('semesters', ['startDate', 'endDate'], { name: 'semesters_date_range_idx' });
    }

    async function addCol(table, col, spec) {
      const d = await queryInterface.describeTable(table).catch(() => null);
      if (d && !d[col]) await queryInterface.addColumn(table, col, spec);
    }

    // surveys alignment
    await addCol('surveys', 'code', { type: STRING(120), allowNull: true });
    await addCol('surveys', 'title', { type: STRING(255), allowNull: true });
    await addCol('surveys', 'activityType', { type: STRING(120), allowNull: true });
    await addCol('surveys', 'targetLevel', { type: STRING(80), allowNull: true });
    await addCol('surveys', 'currentVersionId', { type: INTEGER.UNSIGNED, allowNull: true });

    await queryInterface.sequelize.query('UPDATE surveys SET code = surveyKey WHERE code IS NULL');
    await queryInterface.sequelize.query('UPDATE surveys SET title = name WHERE title IS NULL');
    await queryInterface.sequelize.query(
      'UPDATE surveys SET currentVersionId = currentPublishedVersionId WHERE currentVersionId IS NULL AND currentPublishedVersionId IS NOT NULL'
    );
    await queryInterface.addIndex('surveys', ['code'], { unique: true, name: 'surveys_code_uq' }).catch(() => {});

    // survey_versions alignment
    await addCol('survey_versions', 'isPublished', { type: BOOLEAN, allowNull: false, defaultValue: false });
    await queryInterface.sequelize.query("UPDATE survey_versions SET isPublished = 1 WHERE status = 'published'");

    // survey_rules alignment
    await addCol('survey_rules', 'semesterId', { type: INTEGER.UNSIGNED, allowNull: true });
    await addCol('survey_rules', 'activityType', { type: STRING(120), allowNull: true });
    await addCol('survey_rules', 'surveyVersionId', { type: INTEGER.UNSIGNED, allowNull: true });
    await addCol('survey_rules', 'triggerMode', { type: STRING(40), allowNull: true });
    await addCol('survey_rules', 'fillScope', { type: STRING(40), allowNull: true });
    await addCol('survey_rules', 'appliesToAllEvents', { type: BOOLEAN, allowNull: false, defaultValue: true });
    await addCol('survey_rules', 'eventId', { type: INTEGER.UNSIGNED, allowNull: true });
    await addCol('survey_rules', 'startAt', { type: DATE, allowNull: true });
    await addCol('survey_rules', 'endAt', { type: DATE, allowNull: true });
    await addCol('survey_rules', 'priority', { type: INTEGER, allowNull: false, defaultValue: 100 });
    await queryInterface.sequelize.query('UPDATE survey_rules SET startAt = startDate WHERE startAt IS NULL AND startDate IS NOT NULL');
    await queryInterface.sequelize.query('UPDATE survey_rules SET endAt = endDate WHERE endAt IS NULL AND endDate IS NOT NULL');
    await queryInterface.sequelize.query("UPDATE survey_rules SET triggerMode = 'before_reservation' WHERE triggerMode IS NULL");
    await queryInterface.sequelize.query("UPDATE survey_rules SET fillScope = 'once_per_semester' WHERE fillScope IS NULL");
    await queryInterface.sequelize.query('UPDATE survey_rules SET eventId = targetEventId WHERE eventId IS NULL AND targetEventId IS NOT NULL');
    await queryInterface.sequelize.query('UPDATE survey_rules SET activityType = targetEventType WHERE activityType IS NULL AND targetEventType IS NOT NULL');
    await queryInterface.addIndex('survey_rules', ['semesterId', 'activityType', 'priority'], {
      name: 'survey_rules_semester_activity_priority_idx',
    }).catch(() => {});

    // survey_responses alignment
    await addCol('survey_responses', 'semesterId', { type: INTEGER.UNSIGNED, allowNull: true });
    await addCol('survey_responses', 'ruleId', { type: INTEGER.UNSIGNED, allowNull: true });
    await addCol('survey_responses', 'reservationId', { type: INTEGER.UNSIGNED, allowNull: true });
    await addCol('survey_responses', 'activityType', { type: STRING(120), allowNull: true });
    await addCol('survey_responses', 'submissionStatus', { type: STRING(32), allowNull: false, defaultValue: 'submitted' });
    await addCol('survey_responses', 'source', { type: STRING(60), allowNull: true });

    const surveyResponsesDesc = await queryInterface.describeTable('survey_responses').catch(() => ({}));
    if (surveyResponsesDesc.eventType) {
      await queryInterface.sequelize.query(
        'UPDATE survey_responses SET activityType = eventType WHERE activityType IS NULL AND eventType IS NOT NULL'
      );
    }
    await queryInterface.sequelize.query("UPDATE survey_responses SET source = 'legacy_dual_write' WHERE source IS NULL");
    await queryInterface.sequelize.query("UPDATE survey_responses SET submissionStatus = 'submitted' WHERE submissionStatus IS NULL OR submissionStatus = ''");

    // events semesterId (for future linking)
    await addCol('events', 'semesterId', { type: INTEGER.UNSIGNED, allowNull: true });

    const answers = await queryInterface.describeTable('survey_response_answers').catch(() => null);
    if (!answers) {
      await queryInterface.createTable('survey_response_answers', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        responseId: { type: INTEGER, allowNull: false },
        questionKey: { type: STRING(120), allowNull: false },
        questionType: { type: STRING(60), allowNull: true },
        answerText: { type: TEXT, allowNull: true },
        answerJson: { type: JSONTYPE, allowNull: true },
        scoreValue: { type: Sequelize.DECIMAL(10, 2), allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_response_answers', ['responseId'], { name: 'survey_response_answers_response_idx' });
      await queryInterface.addIndex('survey_response_answers', ['questionKey'], { name: 'survey_response_answers_question_idx' });
    }

    // semesterId backfill stats
    let filledByEvent = 0;
    let filledByDate = 0;
    let unresolved = 0;

    const srDescForBackfill = await queryInterface.describeTable('survey_responses').catch(() => ({}));
    const selectableCols = ['id'];
    if (srDescForBackfill.eventId) selectableCols.push('eventId');
    if (srDescForBackfill.submittedAt) selectableCols.push('submittedAt');
    if (srDescForBackfill.semesterId) selectableCols.push('semesterId');
    const selectSql = `SELECT ${selectableCols.join(', ')} FROM survey_responses${
      srDescForBackfill.semesterId ? ' WHERE semesterId IS NULL' : ''
    }`;
    const responses = await queryInterface.sequelize.query(selectSql, {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });

    const semestersRows = await queryInterface.sequelize.query(
      'SELECT id, startDate, endDate FROM semesters ORDER BY startDate ASC',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    for (const row of responses) {
      let resolvedSemesterId = null;
      if (srDescForBackfill.eventId && row.eventId != null) {
        const ev = await queryInterface.sequelize.query(
          'SELECT semesterId FROM events WHERE id = ? LIMIT 1',
          { replacements: [row.eventId], type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        resolvedSemesterId = ev[0]?.semesterId || null;
        if (resolvedSemesterId) {
          filledByEvent += 1;
        }
      }

      if (!resolvedSemesterId && srDescForBackfill.submittedAt && row.submittedAt && semestersRows.length > 0) {
        const t = new Date(row.submittedAt).getTime();
        const hit = semestersRows.find((s) => {
          const st = new Date(s.startDate).getTime();
          const et = new Date(s.endDate).getTime();
          return Number.isFinite(st) && Number.isFinite(et) && t >= st && t <= et;
        });
        if (hit) {
          resolvedSemesterId = hit.id;
          filledByDate += 1;
        }
      }

      if (resolvedSemesterId && srDescForBackfill.semesterId) {
        await queryInterface.sequelize.query('UPDATE survey_responses SET semesterId = ? WHERE id = ?', {
          replacements: [resolvedSemesterId, row.id],
        });
      } else {
        unresolved += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[survey-upgrade] semester backfill: byEvent=${filledByEvent}, byDate=${filledByDate}, unresolved=${unresolved}, total=${responses.length}`
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('survey_response_answers').catch(() => {});
    // 保守回滾：不移除既有舊表欄位，避免破壞既有流程
  },
};
