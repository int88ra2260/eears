'use strict';

const fs = require('fs');
const path = require('path');

/**
 * 產品級問卷模組：surveys / survey_versions / survey_rules / survey_responses / survey_admin_audit_logs
 * 不刪除既有 english_* 問卷表；作答採雙寫（legacy + survey_responses）由 service 處理。
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, TEXT, JSON: JSONTYPE, BOOLEAN, DATE } = Sequelize;

    const surveys = await queryInterface.describeTable('surveys').catch(() => null);
    if (!surveys) {
      await queryInterface.createTable('surveys', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        surveyKey: { type: STRING(120), allowNull: false, unique: true },
        name: { type: STRING(255), allowNull: false },
        description: { type: TEXT, allowNull: true },
        category: { type: STRING(80), allowNull: true },
        targetType: { type: STRING(80), allowNull: true },
        status: { type: STRING(32), allowNull: false, defaultValue: 'active' },
        currentPublishedVersionId: { type: INTEGER.UNSIGNED, allowNull: true },
        createdBy: { type: INTEGER.UNSIGNED, allowNull: true },
        updatedBy: { type: INTEGER.UNSIGNED, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('surveys', ['surveyKey'], { unique: true, name: 'surveys_survey_key_uq' });
      await queryInterface.addIndex('surveys', ['status'], { name: 'surveys_status_idx' });
    }

    const versions = await queryInterface.describeTable('survey_versions').catch(() => null);
    if (!versions) {
      await queryInterface.createTable('survey_versions', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        surveyId: { type: INTEGER.UNSIGNED, allowNull: false },
        versionNumber: { type: INTEGER.UNSIGNED, allowNull: false },
        schemaJson: { type: JSONTYPE, allowNull: false },
        changeSummary: { type: TEXT, allowNull: true },
        status: { type: STRING(32), allowNull: false, defaultValue: 'draft' },
        publishedAt: { type: DATE, allowNull: true },
        publishedBy: { type: INTEGER.UNSIGNED, allowNull: true },
        createdBy: { type: INTEGER.UNSIGNED, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_versions', ['surveyId', 'versionNumber'], {
        unique: true,
        name: 'survey_versions_survey_version_uq',
      });
      await queryInterface.addIndex('survey_versions', ['surveyId', 'status'], { name: 'survey_versions_survey_status_idx' });
      await queryInterface.addConstraint('survey_versions', {
        fields: ['surveyId'],
        type: 'foreign key',
        name: 'survey_versions_survey_fk',
        references: { table: 'surveys', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    const rules = await queryInterface.describeTable('survey_rules').catch(() => null);
    if (!rules) {
      await queryInterface.createTable('survey_rules', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        surveyId: { type: INTEGER.UNSIGNED, allowNull: false, unique: true },
        isEnabled: { type: BOOLEAN, allowNull: false, defaultValue: true },
        isRequired: { type: BOOLEAN, allowNull: false, defaultValue: true },
        startDate: { type: DATE, allowNull: true },
        endDate: { type: DATE, allowNull: true },
        gatingMode: { type: STRING(40), allowNull: false, defaultValue: 'reservation' },
        retakePolicy: { type: STRING(40), allowNull: false, defaultValue: 'once_ever' },
        retakeScope: { type: STRING(40), allowNull: true },
        semesterKey: { type: STRING(64), allowNull: true },
        targetEventType: { type: STRING(120), allowNull: true },
        targetEventId: { type: INTEGER.UNSIGNED, allowNull: true },
        collectStudentId: { type: BOOLEAN, allowNull: false, defaultValue: true },
        collectStudentName: { type: BOOLEAN, allowNull: false, defaultValue: true },
        collectStudentEmail: { type: BOOLEAN, allowNull: false, defaultValue: true },
        allowEditAfterSubmit: { type: BOOLEAN, allowNull: false, defaultValue: false },
        isAnonymous: { type: BOOLEAN, allowNull: false, defaultValue: false },
        settingsJson: { type: JSONTYPE, allowNull: true },
        updatedBy: { type: INTEGER.UNSIGNED, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_rules', ['surveyId'], { unique: true, name: 'survey_rules_survey_uq' });
      await queryInterface.addConstraint('survey_rules', {
        fields: ['surveyId'],
        type: 'foreign key',
        name: 'survey_rules_survey_fk',
        references: { table: 'surveys', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    const responses = await queryInterface.describeTable('survey_responses').catch(() => null);
    if (!responses) {
      await queryInterface.createTable('survey_responses', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        surveyId: { type: INTEGER.UNSIGNED, allowNull: false },
        surveyVersionId: { type: INTEGER.UNSIGNED, allowNull: false },
        studentId: { type: STRING(80), allowNull: true },
        studentName: { type: STRING(120), allowNull: true },
        studentEmail: { type: STRING(200), allowNull: true },
        eventId: { type: INTEGER.UNSIGNED, allowNull: true },
        eventType: { type: STRING(120), allowNull: true },
        semesterKey: { type: STRING(64), allowNull: true },
        submittedAt: { type: DATE, allowNull: true },
        status: { type: STRING(32), allowNull: false, defaultValue: 'completed' },
        answersJson: { type: JSONTYPE, allowNull: false },
        metadataJson: { type: JSONTYPE, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_responses', ['surveyId', 'studentId'], { name: 'survey_responses_survey_student_idx' });
      await queryInterface.addIndex('survey_responses', ['surveyVersionId'], { name: 'survey_responses_version_idx' });
      await queryInterface.addIndex('survey_responses', ['submittedAt'], { name: 'survey_responses_submitted_idx' });
      await queryInterface.addIndex('survey_responses', ['eventId'], { name: 'survey_responses_event_idx' });
      await queryInterface.addConstraint('survey_responses', {
        fields: ['surveyId'],
        type: 'foreign key',
        name: 'survey_responses_survey_fk',
        references: { table: 'surveys', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addConstraint('survey_responses', {
        fields: ['surveyVersionId'],
        type: 'foreign key',
        name: 'survey_responses_version_fk',
        references: { table: 'survey_versions', field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      });
    }

    const audit = await queryInterface.describeTable('survey_admin_audit_logs').catch(() => null);
    if (!audit) {
      await queryInterface.createTable('survey_admin_audit_logs', {
        id: { type: INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        actorId: { type: INTEGER.UNSIGNED, allowNull: true },
        action: { type: STRING(80), allowNull: false },
        entityType: { type: STRING(80), allowNull: false },
        entityId: { type: STRING(120), allowNull: true },
        beforeJson: { type: JSONTYPE, allowNull: true },
        afterJson: { type: JSONTYPE, allowNull: true },
        summary: { type: STRING(500), allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_admin_audit_logs', ['entityType', 'entityId'], {
        name: 'survey_audit_entity_idx',
      });
      await queryInterface.addIndex('survey_admin_audit_logs', ['actorId'], { name: 'survey_audit_actor_idx' });
      await queryInterface.addIndex('survey_admin_audit_logs', ['createdAt'], { name: 'survey_audit_created_idx' });
    }

    // FK surveys.currentPublishedVersionId（版本表已存在後）
    await queryInterface
      .addConstraint('surveys', {
        fields: ['currentPublishedVersionId'],
        type: 'foreign key',
        name: 'surveys_current_version_fk',
        references: { table: 'survey_versions', field: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      })
      .catch(() => {});

    // Bootstrap：由 surveys.json 建立問卷與首版 published；規則由 survey_settings 對應
    const countRows = await queryInterface.sequelize.query('SELECT COUNT(*) AS c FROM surveys', {
      type: queryInterface.sequelize.QueryTypes.SELECT,
    });
    const cnt = Number(countRows[0]?.c || 0);
    if (cnt > 0) return;

    const jsonPath = path.join(__dirname, '..', 'surveys.json');
    if (!fs.existsSync(jsonPath)) return;
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const cfg = JSON.parse(raw);
    const list = Array.isArray(cfg.surveys) ? cfg.surveys : [];

    const eventTypeByKey = {
      english_table_feedback_114_1: 'English Table',
      english_club_feedback_114_1: 'English Club',
    };
    const settingsIdByKey = {
      english_table_feedback_114_1: ['survey_1', 'english_table_feedback_114_1'],
      english_club_feedback_114_1: ['survey_2', 'english_club_feedback_114_1'],
    };

    for (const s of list) {
      const key = s.id;
      if (!key || !eventTypeByKey[key]) continue;

      await queryInterface.bulkInsert('surveys', [
        {
          surveyKey: key,
          name: s.title || key,
          description: s.description || null,
          category: 'feedback',
          targetType: eventTypeByKey[key],
          status: 'active',
          currentPublishedVersionId: null,
          createdBy: null,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const [srows] = await queryInterface.sequelize.query(
        'SELECT id FROM surveys WHERE surveyKey = ? ORDER BY id DESC LIMIT 1',
        { replacements: [key] }
      );
      const surveyId = srows[0]?.id;
      if (!surveyId) continue;

      // bulkInsert 不會自動序列化 JSON 欄位，必須傳字串（避免 Invalid value [Object]）
      const schemaJsonStr = JSON.stringify(s);
      await queryInterface.bulkInsert('survey_versions', [
        {
          surveyId,
          versionNumber: 1,
          schemaJson: schemaJsonStr,
          changeSummary: 'Bootstrap from surveys.json',
          status: 'published',
          publishedAt: new Date(),
          publishedBy: null,
          createdBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const [vrows] = await queryInterface.sequelize.query(
        'SELECT id FROM survey_versions WHERE surveyId = ? ORDER BY id DESC LIMIT 1',
        { replacements: [surveyId] }
      );
      const versionId = vrows[0]?.id;
      if (versionId) {
        await queryInterface.sequelize.query(
          'UPDATE surveys SET currentPublishedVersionId = ? WHERE id = ?',
          { replacements: [versionId, surveyId] }
        );
      }

      let ss = null;
      for (const sid of settingsIdByKey[key] || []) {
        const [sr] = await queryInterface.sequelize.query(
          'SELECT surveyId, surveyName, isEnabled, isRequired, startDate, endDate, relatedEventTypes FROM survey_settings WHERE surveyId = ? LIMIT 1',
          { replacements: [sid] }
        );
        if (sr && sr[0]) {
          ss = sr[0];
          break;
        }
      }

      let relatedTypes = ss?.relatedEventTypes || [eventTypeByKey[key]];
      if (typeof relatedTypes === 'string') {
        try {
          relatedTypes = JSON.parse(relatedTypes);
        } catch (_) {
          relatedTypes = [eventTypeByKey[key]];
        }
      }
      const settingsJsonStr = JSON.stringify({
        successMessage: null,
        surveyName: ss?.surveyName || null,
        relatedEventTypes: relatedTypes,
      });

      await queryInterface.bulkInsert('survey_rules', [
        {
          surveyId,
          isEnabled: ss ? !!ss.isEnabled : true,
          isRequired: ss ? !!ss.isRequired : true,
          startDate: ss?.startDate || null,
          endDate: ss?.endDate || null,
          gatingMode: 'reservation',
          retakePolicy: 'once_ever',
          retakeScope: null,
          semesterKey: null,
          targetEventType: eventTypeByKey[key],
          targetEventId: null,
          collectStudentId: true,
          collectStudentName: true,
          collectStudentEmail: true,
          allowEditAfterSubmit: false,
          isAnonymous: false,
          settingsJson: settingsJsonStr,
          updatedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
    }
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('surveys', 'surveys_current_version_fk').catch(() => {});
    await queryInterface.dropTable('survey_admin_audit_logs').catch(() => {});
    await queryInterface.dropTable('survey_responses').catch(() => {});
    await queryInterface.dropTable('survey_rules').catch(() => {});
    await queryInterface.dropTable('survey_versions').catch(() => {});
    await queryInterface.dropTable('surveys').catch(() => {});
  },
};
