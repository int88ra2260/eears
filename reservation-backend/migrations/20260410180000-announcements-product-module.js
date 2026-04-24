'use strict';

/**
 * 公告產品化：狀態欄位、SEO、分類標籤、軟刪除、版本表
 * 舊資料：依 isPublished + publishedAt 回填 status，維持 isPublished 語意相容
 */

async function columnExists(queryInterface, table, column) {
  const desc = await queryInterface.describeTable(table).catch(() => ({}));
  return Object.prototype.hasOwnProperty.call(desc, column);
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();
    try {
      const add = async (name, def) => {
        if (!(await columnExists(queryInterface, 'Announcements', name))) {
          await queryInterface.addColumn('Announcements', name, { ...def, transaction: t });
        }
      };

      await add('status', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'draft',
      });
      await add('scheduledPublishAt', { type: Sequelize.DATE, allowNull: true });
      await add('unpublishedAt', { type: Sequelize.DATE, allowNull: true });
      await add('expiresAt', { type: Sequelize.DATE, allowNull: true });
      await add('coverImageAlt', { type: Sequelize.STRING(255), allowNull: true });
      await add('authorId', { type: Sequelize.INTEGER, allowNull: true });
      await add('authorNameSnapshot', { type: Sequelize.STRING(120), allowNull: true });
      await add('category', {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: 'general',
      });
      await add('tags', { type: Sequelize.JSON, allowNull: true });
      await add('seoTitle', { type: Sequelize.STRING(200), allowNull: true });
      await add('seoDescription', { type: Sequelize.STRING(500), allowNull: true });
      await add('ogImageUrl', { type: Sequelize.STRING(500), allowNull: true });
      await add('viewCount', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
      await add('lastEditedBy', { type: Sequelize.INTEGER, allowNull: true });
      await add('deletedAt', { type: Sequelize.DATE, allowNull: true });
      await add('audienceType', {
        type: Sequelize.STRING(32),
        allowNull: false,
        defaultValue: 'all',
      });
      await add('shouldSendNotification', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await add('shouldSendEmail', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await add('notificationStatus', { type: Sequelize.STRING(32), allowNull: true });
      await add('emailStatus', { type: Sequelize.STRING(32), allowNull: true });

      // 回填 status（不覆寫已手動設過的非預設值可略；此處以 isPublished 為準）
      await queryInterface.sequelize.query(
        `
        UPDATE \`Announcements\`
        SET \`status\` = CASE
          WHEN \`isPublished\` = 1 AND \`publishedAt\` IS NOT NULL THEN 'published'
          WHEN \`isPublished\` = 0 AND \`publishedAt\` IS NOT NULL THEN 'unpublished'
          ELSE 'draft'
        END
        WHERE \`deletedAt\` IS NULL
        `,
        { transaction: t }
      );

      await queryInterface.addIndex('Announcements', ['status'], {
        name: 'idx_announcements_status',
        transaction: t,
      }).catch(() => {});

      await queryInterface.addIndex('Announcements', ['category'], {
        name: 'idx_announcements_category',
        transaction: t,
      }).catch(() => {});

      await queryInterface.addIndex('Announcements', ['deletedAt'], {
        name: 'idx_announcements_deletedAt',
        transaction: t,
      }).catch(() => {});

      await queryInterface.addIndex('Announcements', ['status', 'isPublished', 'publishedAt', 'id'], {
        name: 'idx_announcements_pub_list',
        transaction: t,
      }).catch(() => {});

      const revDesc = await queryInterface.describeTable('AnnouncementRevisions').catch(() => null);
      if (!revDesc) {
        await queryInterface.createTable(
          'AnnouncementRevisions',
          {
            id: {
              allowNull: false,
              autoIncrement: true,
              primaryKey: true,
              type: Sequelize.INTEGER,
            },
            announcementId: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: { model: 'Announcements', key: 'id' },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            versionNumber: {
              type: Sequelize.INTEGER,
              allowNull: false,
            },
            title: { type: Sequelize.STRING(200), allowNull: false },
            summary: { type: Sequelize.TEXT, allowNull: true },
            content: { type: Sequelize.TEXT('long'), allowNull: false },
            coverImage: { type: Sequelize.STRING(500), allowNull: true },
            seoTitle: { type: Sequelize.STRING(200), allowNull: true },
            seoDescription: { type: Sequelize.STRING(500), allowNull: true },
            editedBy: { type: Sequelize.INTEGER, allowNull: true },
            createdAt: {
              allowNull: false,
              type: Sequelize.DATE,
            },
            updatedAt: {
              allowNull: false,
              type: Sequelize.DATE,
            },
          },
          { transaction: t }
        );
        await queryInterface.addIndex('AnnouncementRevisions', ['announcementId', 'versionNumber'], {
          unique: true,
          name: 'uniq_ann_rev_version',
          transaction: t,
        });
      }

      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AnnouncementRevisions').catch(() => {});
    const cols = [
      'status',
      'scheduledPublishAt',
      'unpublishedAt',
      'expiresAt',
      'coverImageAlt',
      'authorId',
      'authorNameSnapshot',
      'category',
      'tags',
      'seoTitle',
      'seoDescription',
      'ogImageUrl',
      'viewCount',
      'lastEditedBy',
      'deletedAt',
      'audienceType',
      'shouldSendNotification',
      'shouldSendEmail',
      'notificationStatus',
      'emailStatus',
    ];
    for (const idx of [
      'idx_announcements_status',
      'idx_announcements_category',
      'idx_announcements_deletedAt',
      'idx_announcements_pub_list',
    ]) {
      await queryInterface.removeIndex('Announcements', idx).catch(() => {});
    }
    for (const c of cols) {
      await queryInterface.removeColumn('Announcements', c).catch(() => {});
    }
  },
};
