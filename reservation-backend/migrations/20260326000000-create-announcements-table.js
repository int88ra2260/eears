'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.createTable(
        'Announcements',
        {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          title: {
            type: Sequelize.STRING(200),
            allowNull: false,
          },
          slug: {
            type: Sequelize.STRING(180),
            allowNull: false,
            unique: true,
          },
          summary: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          content: {
            type: Sequelize.TEXT('long'),
            allowNull: false,
          },
          coverImage: {
            type: Sequelize.STRING(500),
            allowNull: true,
          },
          isPublished: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          publishedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          isPinned: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          sortOrder: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          createdBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          updatedBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('Announcements', ['isPublished'], {
        name: 'idx_announcements_isPublished',
        transaction,
      });
      await queryInterface.addIndex('Announcements', ['publishedAt'], {
        name: 'idx_announcements_publishedAt',
        transaction,
      });
      await queryInterface.addIndex('Announcements', ['isPublished', 'publishedAt'], {
        name: 'idx_announcements_published_publishedAt',
        transaction,
      });
      await queryInterface.addIndex('Announcements', ['isPinned', 'publishedAt'], {
        name: 'idx_announcements_pinned_publishedAt',
        transaction,
      });

      await transaction.commit();
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Announcements');
  },
};
