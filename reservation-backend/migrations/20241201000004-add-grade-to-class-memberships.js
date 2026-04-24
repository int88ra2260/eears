'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 檢查欄位是否已存在
    const tableDescription = await queryInterface.describeTable('class_memberships');
    if (!tableDescription.grade) {
      await queryInterface.addColumn('class_memberships', 'grade', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '年級'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('class_memberships', 'grade');
  }
};
