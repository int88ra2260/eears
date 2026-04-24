// migrations/add-auto-check-completed-to-events.js
// 新增 autoCheckCompleted 欄位到 Events 表，用於標記活動是否已執行過結束檢查

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 檢查欄位是否已存在
    const tableDescription = await queryInterface.describeTable('Events');
    
    if (!tableDescription.autoCheckCompleted) {
      await queryInterface.addColumn('Events', 'autoCheckCompleted', {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: '是否已執行過活動結束檢查'
      });
      console.log('✅ 成功新增 autoCheckCompleted 欄位到 Events 表');
    } else {
      console.log('⚠️  autoCheckCompleted 欄位已存在，跳過新增');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 回滾：移除欄位
    await queryInterface.removeColumn('Events', 'autoCheckCompleted');
    console.log('✅ 已移除 autoCheckCompleted 欄位');
  }
};

