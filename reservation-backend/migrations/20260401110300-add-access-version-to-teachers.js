'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('teachers');
    if (!table.accessVersion) {
      await queryInterface.addColumn('teachers', 'accessVersion', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: '權限版本號（權限/範圍/角色異動時遞增）',
      });
    }
    await queryInterface.addIndex('teachers', ['accessVersion'], { name: 'teachers_access_version_idx' }).catch(() => {});
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('teachers');
    if (table.accessVersion) {
      await queryInterface.removeColumn('teachers', 'accessVersion');
    }
  },
};

