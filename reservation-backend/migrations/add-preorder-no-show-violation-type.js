// migrations/add-preorder-no-show-violation-type.js
// 新增「預約未到」違規類型到 event_violations 表的 violationType ENUM

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // MySQL 需要先修改欄位類型來新增 ENUM 值
    await queryInterface.sequelize.query(`
      ALTER TABLE event_violations 
      MODIFY COLUMN violationType ENUM('擾亂秩序', '未遵守規定', '預約未到', '其他') NOT NULL
    `);
    console.log('✅ 成功新增「預約未到」違規類型到 event_violations.violationType');
  },

  down: async (queryInterface, Sequelize) => {
    // 回滾：移除「預約未到」選項
    await queryInterface.sequelize.query(`
      ALTER TABLE event_violations 
      MODIFY COLUMN violationType ENUM('擾亂秩序', '未遵守規定', '其他') NOT NULL
    `);
    console.log('✅ 已移除「預約未到」違規類型');
  }
};

