'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'role_permissions';
    const table = await queryInterface.describeTable(tableName).catch(() => null);
    if (!table) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.BIGINT.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        role: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        permission: {
          type: Sequelize.STRING(100),
          allowNull: false,
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
    await queryInterface.addIndex(tableName, ['role', 'permission'], { unique: true, name: 'role_permissions_role_permission_uq' }).catch(() => {});
    await queryInterface.addIndex(tableName, ['permission'], { name: 'role_permissions_permission_idx' }).catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.dropTable('role_permissions').catch(() => {});
  },
};

