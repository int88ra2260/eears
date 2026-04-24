// migrations/add-violation-status-to-reservations.js
// 新增"已登記違規"狀態到預約記錄的簽到狀態欄位

const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // 檢查欄位是否存在
      const tableDescription = await queryInterface.describeTable('Reservations');
      if (tableDescription.checkinStatus) {
        // 修改 checkinStatus 欄位的 ENUM 值
        await queryInterface.changeColumn('Reservations', 'checkinStatus', {
          type: DataTypes.ENUM('未簽到', '已簽到', '已登記違規'),
          allowNull: false,
          defaultValue: '未簽到'
        });
        
        console.log('✅ 成功新增"已登記違規"狀態到 Reservations.checkinStatus');
      } else {
        console.log('⚠️ Reservations.checkinStatus 欄位不存在，跳過修改');
      }
    } catch (error) {
      console.error('❌ 修改 Reservations.checkinStatus 失敗:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // 回復到原來的 ENUM 值
      await queryInterface.changeColumn('Reservations', 'checkinStatus', {
        type: DataTypes.ENUM('未簽到', '已簽到'),
        allowNull: false,
        defaultValue: '未簽到'
      });
      
      console.log('✅ 成功回復 Reservations.checkinStatus 到原始狀態');
    } catch (error) {
      console.error('❌ 回復 Reservations.checkinStatus 失敗:', error);
      throw error;
    }
  }
};
