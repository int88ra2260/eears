'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 檢查欄位是否已存在
    const tableDescription = await queryInterface.describeTable('classes');
    if (!tableDescription.teacherName) {
      await queryInterface.addColumn('classes', 'teacherName', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: '老師姓名'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('classes', 'teacherName');
  }
};
