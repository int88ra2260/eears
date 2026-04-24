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
         AND table_name = 'bestep_team_rankings'`,
        { transaction }
      );
      
      const tableExists = tables[0].count > 0;
      
      if (!tableExists) {
        // 建立 bestep_team_rankings 表
        await queryInterface.createTable('bestep_team_rankings', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        teamId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: '團體 ID',
          references: {
            model: 'learning_partner_teams',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        semester: {
          type: Sequelize.STRING(20),
          allowNull: false,
          comment: '學期（如 114-1）'
        },
        avgScore: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          comment: '隊伍平均分（聽+讀+說+寫的平均）'
        },
        rank: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: '名次（支援並列，如第1名有3隊並列，則下一名次為第4名）'
        },
        rewardAmount: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: '獎勵金額（每人，單位：元）'
        },
        calculatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: '計算時間'
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
        console.log('✅ 已建立 bestep_team_rankings 表');
      } else {
        console.log('ℹ️  bestep_team_rankings 表已存在，跳過建立步驟');
      }

      // 檢查並建立唯一約束
      const [uniqueIndexes] = await queryInterface.sequelize.query(
        `SELECT INDEX_NAME FROM information_schema.STATISTICS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'bestep_team_rankings' 
         AND INDEX_NAME = 'uk_team_semester'`,
        { transaction }
      );
      
      if (uniqueIndexes.length === 0) {
        await queryInterface.addIndex('bestep_team_rankings', ['teamId', 'semester'], {
          unique: true,
          name: 'uk_team_semester',
          transaction
        });
        console.log('✅ 已新增唯一索引 uk_team_semester');
      } else {
        console.log('ℹ️  唯一索引 uk_team_semester 已存在，跳過');
      }

      // 檢查並建立索引
      const indexNames = ['idx_semester', 'idx_rank'];
      const indexFields = [
        ['semester'],
        ['semester', 'rank']
      ];
      
      for (let i = 0; i < indexNames.length; i++) {
        const [indexes] = await queryInterface.sequelize.query(
          `SELECT INDEX_NAME FROM information_schema.STATISTICS 
           WHERE TABLE_SCHEMA = DATABASE() 
           AND TABLE_NAME = 'bestep_team_rankings' 
           AND INDEX_NAME = '${indexNames[i]}'`,
          { transaction }
        );
        
        if (indexes.length === 0) {
          await queryInterface.addIndex('bestep_team_rankings', indexFields[i], {
            name: indexNames[i],
            transaction
          });
          console.log(`✅ 已新增索引 ${indexNames[i]}`);
        } else {
          console.log(`ℹ️  索引 ${indexNames[i]} 已存在，跳過`);
        }
      }

      await transaction.commit();
      console.log('✅ bestep_team_rankings table created successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating bestep_team_rankings table:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 刪除索引
      await queryInterface.removeIndex('bestep_team_rankings', 'idx_rank', { transaction });
      await queryInterface.removeIndex('bestep_team_rankings', 'idx_semester', { transaction });
      await queryInterface.removeIndex('bestep_team_rankings', 'uk_team_semester', { transaction });

      // 刪除表
      await queryInterface.dropTable('bestep_team_rankings', { transaction });

      await transaction.commit();
      console.log('✅ bestep_team_rankings table dropped successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error dropping bestep_team_rankings table:', error);
      throw error;
    }
  }
};
