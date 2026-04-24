'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        'notifications',
        {
          id: {
            type: Sequelize.BIGINT.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
          },
          userId: {
            // Match Users.id definition (INTEGER signed) to avoid FK incompatibility
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          type: {
            type: Sequelize.STRING(64),
            allowNull: false,
          },
          title: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },
          content: {
            type: Sequelize.TEXT('long'),
            allowNull: true,
          },
          data: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          readAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          requestId: {
            type: Sequelize.STRING(64),
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
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('notifications', ['userId'], {
        name: 'idx_notifications_userId',
        transaction,
      });
      await queryInterface.addIndex('notifications', ['readAt'], {
        name: 'idx_notifications_readAt',
        transaction,
      });
      await queryInterface.addIndex('notifications', ['type', 'createdAt'], {
        name: 'idx_notifications_type_createdAt',
        transaction,
      });
      await queryInterface.addIndex('notifications', ['requestId'], {
        name: 'idx_notifications_requestId',
        transaction,
      });

      // 外鍵（避免複雜動作；此專案多半是資料完整性先保留）
      await queryInterface.addConstraint('notifications', {
        fields: ['userId'],
        type: 'foreign key',
        name: 'fk_notifications_userId',
        references: { table: 'Users', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};

