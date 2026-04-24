'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('teachers');

    // MySQL：使用 JSON 欄位最穩；允許 NULL 代表「未覆寫，沿用 base」
    if (!table.permissions) {
      await queryInterface.addColumn('teachers', 'permissions', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'per-user permission overrides (tri-state via true/false/absent)',
      });
    }

    if (!table.scopes) {
      await queryInterface.addColumn('teachers', 'scopes', {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'per-user scopes override (null=inherit base, array=replace)',
      });
    }

    if (!table.disabledReason) {
      await queryInterface.addColumn('teachers', 'disabledReason', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: '停用原因（可選）',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('teachers');
    if (table.disabledReason) {
      await queryInterface.removeColumn('teachers', 'disabledReason');
    }
    if (table.scopes) {
      await queryInterface.removeColumn('teachers', 'scopes');
    }
    if (table.permissions) {
      await queryInterface.removeColumn('teachers', 'permissions');
    }
  },
};

