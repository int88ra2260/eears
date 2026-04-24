'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { INTEGER, STRING, DATE, JSON: JSONTYPE, TEXT, BOOLEAN } = Sequelize;

    const runs = await queryInterface.describeTable('survey_repair_runs').catch(() => null);
    if (!runs) {
      await queryInterface.createTable('survey_repair_runs', {
        id: { type: INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        repairType: { type: STRING(60), allowNull: false },
        mode: { type: STRING(20), allowNull: false, defaultValue: 'dry_run' },
        status: { type: STRING(40), allowNull: false, defaultValue: 'pending' },
        requestedBy: { type: INTEGER.UNSIGNED, allowNull: true },
        approvedBy: { type: INTEGER.UNSIGNED, allowNull: true },
        startedAt: { type: DATE, allowNull: true },
        completedAt: { type: DATE, allowNull: true },
        requestPayloadJson: { type: JSONTYPE, allowNull: true },
        summaryJson: { type: JSONTYPE, allowNull: true },
        resultJson: { type: JSONTYPE, allowNull: true },
        errorJson: { type: JSONTYPE, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_repair_runs', ['repairType', 'mode', 'status'], {
        name: 'survey_repair_runs_type_mode_status_idx',
      });
      await queryInterface.addIndex('survey_repair_runs', ['requestedBy'], { name: 'survey_repair_runs_requested_by_idx' });
      await queryInterface.addIndex('survey_repair_runs', ['createdAt'], { name: 'survey_repair_runs_created_at_idx' });
    }

    const items = await queryInterface.describeTable('survey_repair_run_items').catch(() => null);
    if (!items) {
      await queryInterface.createTable('survey_repair_run_items', {
        id: { type: INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        runId: { type: INTEGER.UNSIGNED, allowNull: false },
        entityType: { type: STRING(60), allowNull: false },
        entityId: { type: STRING(120), allowNull: false },
        actionType: { type: STRING(60), allowNull: false },
        beforeJson: { type: JSONTYPE, allowNull: true },
        afterJson: { type: JSONTYPE, allowNull: true },
        resultStatus: { type: STRING(30), allowNull: false, defaultValue: 'skipped' },
        message: { type: TEXT, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_repair_run_items', ['runId', 'resultStatus'], {
        name: 'survey_repair_run_items_run_status_idx',
      });
      await queryInterface.addConstraint('survey_repair_run_items', {
        fields: ['runId'],
        type: 'foreign key',
        name: 'survey_repair_run_items_run_fk',
        references: { table: 'survey_repair_runs', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });
    }

    const mappings = await queryInterface.describeTable('survey_answer_mappings').catch(() => null);
    if (!mappings) {
      await queryInterface.createTable('survey_answer_mappings', {
        id: { type: INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
        surveyId: { type: INTEGER.UNSIGNED, allowNull: true },
        surveyVersionId: { type: INTEGER.UNSIGNED, allowNull: true },
        sourceQuestionKey: { type: STRING(120), allowNull: false },
        targetQuestionKey: { type: STRING(120), allowNull: false },
        sourceLabel: { type: STRING(255), allowNull: true },
        targetLabel: { type: STRING(255), allowNull: true },
        mappingType: { type: STRING(40), allowNull: false, defaultValue: 'manual' },
        confidenceScore: { type: Sequelize.DECIMAL(5, 2), allowNull: true },
        status: { type: STRING(20), allowNull: false, defaultValue: 'pending' },
        isApproved: { type: BOOLEAN, allowNull: false, defaultValue: false },
        approvedBy: { type: INTEGER.UNSIGNED, allowNull: true },
        approvedAt: { type: DATE, allowNull: true },
        notes: { type: TEXT, allowNull: true },
        createdBy: { type: INTEGER.UNSIGNED, allowNull: true },
        createdAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updatedAt: { type: DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      });
      await queryInterface.addIndex('survey_answer_mappings', ['surveyId', 'surveyVersionId', 'status'], {
        name: 'survey_answer_mappings_scope_status_idx',
      });
      await queryInterface.addIndex('survey_answer_mappings', ['sourceQuestionKey', 'targetQuestionKey'], {
        name: 'survey_answer_mappings_keys_idx',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('survey_answer_mappings').catch(() => {});
    await queryInterface.dropTable('survey_repair_run_items').catch(() => {});
    await queryInterface.dropTable('survey_repair_runs').catch(() => {});
  },
};
