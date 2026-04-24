'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable('et_attempt_import_histories', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        importBatchId: {
          type: Sequelize.STRING(80),
          allowNull: false,
          unique: true
        },
        importName: {
          type: Sequelize.STRING(120),
          allowNull: false
        },
        semesterId: {
          type: Sequelize.STRING(20),
          allowNull: false,
          references: { model: 'et_semesters', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        importedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        operatorId: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        importedCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        skippedCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        errorCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        beforeStats: {
          type: Sequelize.JSON,
          allowNull: false
        },
        afterStats: {
          type: Sequelize.JSON,
          allowNull: false
        },
        deltaStats: {
          type: Sequelize.JSON,
          allowNull: false
        },
        newB2BySkill: {
          type: Sequelize.JSON,
          allowNull: false
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });

      await queryInterface.addIndex(
        'et_attempt_import_histories',
        ['semesterId', 'importedAt'],
        { name: 'idx_et_import_histories_semester_imported_at', transaction }
      );
      await queryInterface.addIndex(
        'et_attempt_import_histories',
        ['importBatchId'],
        { name: 'uk_et_import_histories_batch', unique: true, transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('et_attempt_import_histories', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
