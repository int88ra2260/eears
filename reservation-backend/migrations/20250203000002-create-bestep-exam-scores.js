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
         AND table_name = 'bestep_exam_scores'`,
        { transaction }
      );
      
      const tableExists = tables[0].count > 0;
      
      if (!tableExists) {
        // 建立 bestep_exam_scores 表
        await queryInterface.createTable('bestep_exam_scores', {
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
        examDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: '考試日期（可能 LR 和 SW 不同日期）'
        },
        listeningScore: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: '聽力分數'
        },
        readingScore: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: '閱讀分數'
        },
        speakingScore: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: '口說分數'
        },
        writingScore: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: '寫作分數'
        },
        listeningLevel: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment: '聽力 CEFR 等級（如 A1, A2, B1, B2, C1, C2）'
        },
        readingLevel: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment: '閱讀 CEFR 等級'
        },
        speakingLevel: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment: '口說 CEFR 等級'
        },
        writingLevel: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment: '寫作 CEFR 等級'
        },
        totalScore: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: '總分（自動計算：聽+讀+說+寫）'
        },
        overallLevel: {
          type: Sequelize.STRING(10),
          allowNull: true,
          comment: '整體 CEFR 等級（取最低項）'
        },
        passed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: '是否達標（各項都達 B2 以上）'
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
        console.log('✅ 已建立 bestep_exam_scores 表');
      } else {
        console.log('ℹ️  bestep_exam_scores 表已存在，跳過建立步驟');
      }

      // 檢查並建立唯一約束
      const [uniqueIndexes] = await queryInterface.sequelize.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'bestep_exam_scores' 
         AND INDEX_NAME = 'uk_student_semester'`,
        { transaction }
      );
      
      if (uniqueIndexes.length === 0) {
        await queryInterface.addIndex('bestep_exam_scores', ['studentId', 'semester'], {
          unique: true,
          name: 'uk_student_semester',
          transaction
        });
        console.log('✅ 已新增唯一索引 uk_student_semester');
      } else {
        console.log('ℹ️  唯一索引 uk_student_semester 已存在，跳過');
      }

      // 檢查並建立索引
      const indexNames = ['idx_examDate', 'idx_semester', 'idx_studentId', 'idx_passed'];
      const indexFields = [
        ['examDate'],
        ['semester'],
        ['studentId'],
        ['semester', 'passed']
      ];
      
      for (let i = 0; i < indexNames.length; i++) {
        const [indexes] = await queryInterface.sequelize.query(
          `SELECT INDEX_NAME FROM information_schema.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'bestep_exam_scores' 
           AND INDEX_NAME = '${indexNames[i]}'`,
          { transaction }
        );
        
        if (indexes.length === 0) {
          await queryInterface.addIndex('bestep_exam_scores', indexFields[i], {
            name: indexNames[i],
            transaction
          });
          console.log(`✅ 已新增索引 ${indexNames[i]}`);
        } else {
          console.log(`ℹ️  索引 ${indexNames[i]} 已存在，跳過`);
        }
      }

      await transaction.commit();
      console.log('✅ bestep_exam_scores table created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating bestep_exam_scores table:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 刪除索引
      await queryInterface.removeIndex('bestep_exam_scores', 'idx_passed', { transaction });
      await queryInterface.removeIndex('bestep_exam_scores', 'idx_studentId', { transaction });
      await queryInterface.removeIndex('bestep_exam_scores', 'idx_semester', { transaction });
      await queryInterface.removeIndex('bestep_exam_scores', 'idx_examDate', { transaction });
      await queryInterface.removeIndex('bestep_exam_scores', 'uk_student_semester', { transaction });

      // 刪除表
      await queryInterface.dropTable('bestep_exam_scores', { transaction });

      await transaction.commit();
      console.log('✅ bestep_exam_scores table dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping bestep_exam_scores table:', error);
      throw error;
    }
  }
};
