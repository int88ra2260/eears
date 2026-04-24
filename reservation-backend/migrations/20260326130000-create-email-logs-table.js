'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_logs', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      to: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      template: {
        // email template / type
        type: Sequelize.STRING(120),
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'success', // success / failed / retry
      },
      errorMessage: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      relatedEntityType: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      relatedEntityId: {
        type: Sequelize.STRING(64),
        allowNull: true,
      },
      requestId: {
        type: Sequelize.STRING(64),
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('email_logs', ['createdAt'], { name: 'email_logs_created_at_idx' });
    await queryInterface.addIndex('email_logs', ['requestId'], { name: 'email_logs_request_id_idx' });
    await queryInterface.addIndex('email_logs', ['template'], { name: 'email_logs_template_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_logs');
  },
};

