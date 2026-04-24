'use strict';

/** 操作稽核紀錄（重要業務異動可追溯） */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('audit_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      module: {
        type: Sequelize.STRING(80),
        allowNull: false,
      },
      entityType: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      entityId: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      action: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      operatorId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      operatorRole: {
        type: Sequelize.STRING(32),
        allowNull: true,
      },
      operatorName: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      targetSummary: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      beforeData: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      afterData: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      changedFields: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      requestId: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      ipAddress: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      userAgent: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'success',
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('audit_logs', ['createdAt'], { name: 'audit_logs_created_at_idx' });
    await queryInterface.addIndex('audit_logs', ['module'], { name: 'audit_logs_module_idx' });
    await queryInterface.addIndex('audit_logs', ['action'], { name: 'audit_logs_action_idx' });
    await queryInterface.addIndex('audit_logs', ['operatorId'], { name: 'audit_logs_operator_id_idx' });
    await queryInterface.addIndex('audit_logs', ['status'], { name: 'audit_logs_status_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('audit_logs');
  },
};
