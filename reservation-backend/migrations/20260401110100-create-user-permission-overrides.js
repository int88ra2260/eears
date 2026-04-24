'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'user_permission_overrides';
    const table = await queryInterface.describeTable(tableName).catch(() => null);
    if (!table) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'teachers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        permission: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        value: {
          type: Sequelize.ENUM('allow', 'deny'),
          allowNull: false,
        },
        updatedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        source: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      });
    }
    await queryInterface.addIndex(tableName, ['userId', 'permission'], {
      unique: true,
      name: 'user_permission_overrides_user_permission_uq',
    }).catch(() => {});
    await queryInterface.addIndex(tableName, ['permission'], { name: 'user_permission_overrides_permission_idx' }).catch(() => {});
    await queryInterface.addIndex(tableName, ['updatedBy'], { name: 'user_permission_overrides_updated_by_idx' }).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_permission_overrides').catch(() => {});
    await queryInterface.sequelize.query("DROP TYPE IF EXISTS enum_user_permission_overrides_value;").catch(() => {});
    if (queryInterface.sequelize.getDialect() === 'mysql') {
      // MySQL ENUM attached to table; no-op, keep for symmetry.
    }
  },
};

