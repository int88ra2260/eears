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
         AND table_name = 'bestep_attendance'`,
        { transaction }
      );
      
      const tableExists = tables[0].count > 0;
      
      if (!tableExists) {
        // 建立 bestep_attendance 表
        await queryInterface.createTable('bestep_attendance', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        studentId: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: '學號'
        },
        semester: {
          type: Sequelize.STRING(20),
          allowNull: false,
          comment: '學期（如 114-1）'
        },
        examType: {
          type: Sequelize.ENUM('LR', 'SW'),
          allowNull: false,
          comment: '考試類型：LR（聽讀）或 SW（說寫）'
        },
        examDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: '考試日期'
        },
        attended: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: '是否出席'
        },
        absentReason: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: '缺席原因'
        },
        importedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: '匯入時間'
        },
        sourceFile: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: '來源檔案名稱'
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
        console.log('✅ 已建立 bestep_attendance 表');
      } else {
        console.log('ℹ️  bestep_attendance 表已存在，跳過建立步驟');
      }

      // 檢查並建立唯一約束
      const [uniqueIndexes] = await queryInterface.sequelize.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'bestep_attendance' 
         AND INDEX_NAME = 'uk_student_semester_type'`,
        { transaction }
      );
      
      if (uniqueIndexes.length === 0) {
        await queryInterface.addIndex('bestep_attendance', ['studentId', 'semester', 'examType'], {
          unique: true,
          name: 'uk_student_semester_type',
          transaction
        });
        console.log('✅ 已新增唯一索引 uk_student_semester_type');
      } else {
        console.log('ℹ️  唯一索引 uk_student_semester_type 已存在，跳過');
      }

      // 檢查並建立索引
      const indexNames = ['idx_examDate', 'idx_semester_type', 'idx_studentId'];
      const indexFields = [
        ['examDate'],
        ['semester', 'examType'],
        ['studentId']
      ];
      
      for (let i = 0; i < indexNames.length; i++) {
        const [indexes] = await queryInterface.sequelize.query(
          `SELECT INDEX_NAME FROM information_schema.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'bestep_attendance' 
           AND INDEX_NAME = '${indexNames[i]}'`,
          { transaction }
        );
        
        if (indexes.length === 0) {
          await queryInterface.addIndex('bestep_attendance', indexFields[i], {
            name: indexNames[i],
            transaction
          });
          console.log(`✅ 已新增索引 ${indexNames[i]}`);
        } else {
          console.log(`ℹ️  索引 ${indexNames[i]} 已存在，跳過`);
        }
      }

      await transaction.commit();
      console.log('✅ bestep_attendance table created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating bestep_attendance table:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 刪除索引
      await queryInterface.removeIndex('bestep_attendance', 'idx_studentId', { transaction });
      await queryInterface.removeIndex('bestep_attendance', 'idx_semester_type', { transaction });
      await queryInterface.removeIndex('bestep_attendance', 'idx_examDate', { transaction });
      await queryInterface.removeIndex('bestep_attendance', 'uk_student_semester_type', { transaction });

      // 刪除表
      await queryInterface.dropTable('bestep_attendance', { transaction });

      await transaction.commit();
      console.log('✅ bestep_attendance table dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping bestep_attendance table:', error);
      throw error;
    }
  }
};
