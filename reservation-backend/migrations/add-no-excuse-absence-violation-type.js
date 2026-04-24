// migrations/add-no-excuse-absence-violation-type.js
// 新增「無故缺席」違規類型到 event_violations 表的 violationType ENUM

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE event_violations 
      MODIFY COLUMN violationType ENUM('擾亂秩序', '未遵守規定', '預約未到', '無故缺席', '其他') NOT NULL
    `);
    console.log('✅ 成功新增「無故缺席」違規類型到 event_violations.violationType');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE event_violations 
      MODIFY COLUMN violationType ENUM('擾亂秩序', '未遵守規定', '預約未到', '其他') NOT NULL
    `);
    console.log('✅ 已移除「無故缺席」違規類型（若仍有該值之資料列，請先更新後再回滾）');
  }
};
