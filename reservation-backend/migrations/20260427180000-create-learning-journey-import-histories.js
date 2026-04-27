'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('learning_journey_import_histories', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      semester_id: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      import_type: {
        type: Sequelize.ENUM('enrollment', 'external_exam'),
        allowNull: false
      },
      source_file: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('success', 'partial', 'failed'),
        allowNull: false,
        defaultValue: 'success'
      },
      imported_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      updated_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      skipped_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      duplicate_skipped_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      conflicted_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      warning_count: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      summary_json: {
        type: Sequelize.JSON,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('learning_journey_import_histories', ['semester_id', 'import_type'], {
      name: 'idx_lj_import_histories_semester_type'
    });
    await queryInterface.addIndex('learning_journey_import_histories', ['created_at'], {
      name: 'idx_lj_import_histories_created_at'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('learning_journey_import_histories');
  }
};
