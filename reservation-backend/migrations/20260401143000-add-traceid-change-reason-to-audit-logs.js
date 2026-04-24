'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('audit_logs', 'traceId', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    await queryInterface.addColumn('audit_logs', 'changeReason', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    await queryInterface.addIndex('audit_logs', ['traceId'], { name: 'audit_logs_trace_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('audit_logs', 'audit_logs_trace_id_idx');
    await queryInterface.removeColumn('audit_logs', 'changeReason');
    await queryInterface.removeColumn('audit_logs', 'traceId');
  },
};

