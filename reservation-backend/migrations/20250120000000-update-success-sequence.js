// migrations/20250120000000-update-success-sequence.js
// 遷移：刪除 approvedSequence 欄位，新增 successSequence 欄位

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 檢查 approvedSequence 欄位是否存在
      const [columns] = await queryInterface.sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'english_test_registrations' 
         AND COLUMN_NAME = 'approvedSequence'`,
        { transaction }
      );
      
      const hasApprovedSequence = columns.length > 0;
      
      if (hasApprovedSequence) {
        // 1. 清除所有 approvedSequence 的值（設為 NULL）
        await queryInterface.sequelize.query(
          `UPDATE english_test_registrations SET approvedSequence = NULL WHERE approvedSequence IS NOT NULL`,
          { transaction }
        );
        
        // 2. 刪除 approvedSequence 欄位
        await queryInterface.removeColumn('english_test_registrations', 'approvedSequence', { transaction });
        console.log('✅ 已刪除 approvedSequence 欄位');
      } else {
        console.log('ℹ️  approvedSequence 欄位不存在，跳過刪除步驟');
      }
      
      // 檢查 successSequence 欄位是否已存在
      const [successColumns] = await queryInterface.sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'english_test_registrations' 
         AND COLUMN_NAME = 'successSequence'`,
        { transaction }
      );
      
      const hasSuccessSequence = successColumns.length > 0;
      
      if (!hasSuccessSequence) {
        // 3. 新增 successSequence 欄位
        await queryInterface.addColumn('english_test_registrations', 'successSequence', {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: '報名成功的順序編號（根據變為已通過的時間順序，可手動調整）'
        }, { transaction });
        console.log('✅ 已新增 successSequence 欄位');
      } else {
        console.log('ℹ️  successSequence 欄位已存在，跳過新增步驟');
      }
      
      await transaction.commit();
      console.log('✅ 成功更新 successSequence 欄位');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 遷移失敗:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 回滾：刪除 successSequence，恢復 approvedSequence
      await queryInterface.removeColumn('english_test_registrations', 'successSequence', { transaction });
      
      await queryInterface.addColumn('english_test_registrations', 'approvedSequence', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: '已通過的順序編號（依設定為已通過的時間）'
      }, { transaction });
      
      await transaction.commit();
      console.log('✅ 成功回滾到 approvedSequence');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 回滾失敗:', error);
      throw error;
    }
  }
};
