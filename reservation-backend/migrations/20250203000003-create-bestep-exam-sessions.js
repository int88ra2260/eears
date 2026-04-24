'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 檢查表是否已存在
      const [tables] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count 
         FROM information_schema.tables 
         WHERE table_schema = DATABASE() 
         AND table_name = 'bestep_exam_sessions'`,
        { transaction }
      );
      
      const tableExists = tables[0].count > 0;
      
      if (!tableExists) {
        // 建立 bestep_exam_sessions 表
        await queryInterface.createTable('bestep_exam_sessions', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        semester: {
          type: Sequelize.STRING(20),
          allowNull: false,
          unique: true,
          comment: '學期（如 114-1）'
        },
        lrExamDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'LR（聽讀）場次考試日期'
        },
        swExamDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'SW（說寫）場次考試日期'
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '場次說明'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      }, { transaction });
        console.log('✅ 已建立 bestep_exam_sessions 表');
      } else {
        console.log('ℹ️  bestep_exam_sessions 表已存在，跳過建立步驟');
      }

      // 檢查並建立索引
      const [indexes] = await queryInterface.sequelize.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'bestep_exam_sessions' 
         AND INDEX_NAME = 'idx_semester'`,
        { transaction }
      );
      
      if (indexes.length === 0) {
        await queryInterface.addIndex('bestep_exam_sessions', ['semester'], {
          name: 'idx_semester',
          transaction
        });
        console.log('✅ 已新增索引 idx_semester');
      } else {
        console.log('ℹ️  索引 idx_semester 已存在，跳過');
      }

      await transaction.commit();
      console.log('✅ bestep_exam_sessions table created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating bestep_exam_sessions table:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 刪除索引
      await queryInterface.removeIndex('bestep_exam_sessions', 'idx_semester', { transaction });

      // 刪除表
      await queryInterface.dropTable('bestep_exam_sessions', { transaction });

      await transaction.commit();
      console.log('✅ bestep_exam_sessions table dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping bestep_exam_sessions table:', error);
      throw error;
    }
  }
};
