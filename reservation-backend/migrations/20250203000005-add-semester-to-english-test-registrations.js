'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 檢查 semester 欄位是否已存在
      const [columns] = await queryInterface.sequelize.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'english_test_registrations' 
         AND COLUMN_NAME = 'semester'`,
        { transaction }
      );
      
      const hasSemester = columns.length > 0;
      
      if (!hasSemester) {
        // 新增 semester 欄位
        await queryInterface.addColumn('english_test_registrations', 'semester', {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: '學期（如 114-1）'
        }, { transaction });
        
        console.log('✅ 已新增 semester 欄位');
      } else {
        console.log('ℹ️  semester 欄位已存在，跳過新增步驟');
      }
      
      // 建立索引
      const [indexes] = await queryInterface.sequelize.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'english_test_registrations' 
         AND INDEX_NAME = 'idx_semester'`,
        { transaction }
      );
      
      if (indexes.length === 0) {
        await queryInterface.addIndex('english_test_registrations', ['semester'], {
          name: 'idx_semester',
          transaction
        });
        console.log('✅ 已新增 semester 索引');
      } else {
        console.log('ℹ️  semester 索引已存在，跳過新增步驟');
      }
      
      await transaction.commit();
      console.log('✅ Migration 完成');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Migration 失敗:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 刪除索引
      await queryInterface.removeIndex('english_test_registrations', 'idx_semester', { transaction });
      
      // 刪除欄位
      await queryInterface.removeColumn('english_test_registrations', 'semester', { transaction });
      
      await transaction.commit();
      console.log('✅ 已回滾 semester 欄位');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 回滾失敗:', error);
      throw error;
    }
  }
};
