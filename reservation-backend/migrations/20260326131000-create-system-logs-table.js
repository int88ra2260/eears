'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('system_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      requestId: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      type: {
        // currently: http
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'http',
      },
      method: {
        type: Sequelize.STRING(10),
        allowNull: true,
      },
      path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      durationMs: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      userId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      role: {
        type: Sequelize.STRING(32),
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

    await queryInterface.addIndex('system_logs', ['createdAt'], { name: 'system_logs_created_at_idx' });
    await queryInterface.addIndex('system_logs', ['requestId'], { name: 'system_logs_request_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('system_logs');
  },
};

