// 修復最後的問題
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  }
);

async function fixFinalIssues() {
  try {
    console.log('🔧 修復最後的問題...\n');
    
    // 1. 修復 survey_settings 表格
    console.log('📋 修復 survey_settings 表格...');
    
    try {
      // 檢查表格是否存在
      const tableExists = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'activity_reservation' 
        AND table_name = 'survey_settings'
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (tableExists[0].count === 0) {
        console.log('  ⚠️  survey_settings 表格不存在，重新創建...');
        await sequelize.query(`
          CREATE TABLE \`survey_settings\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`surveyId\` varchar(100) NOT NULL,
            \`isActive\` tinyint(1) DEFAULT 1,
            \`createdAt\` datetime NOT NULL,
            \`updatedAt\` datetime NOT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`surveyId\` (\`surveyId\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        console.log('  ✅ survey_settings 表格創建成功');
      } else {
        // 檢查並添加缺失的欄位
        const columns = await sequelize.query('DESCRIBE survey_settings', { type: Sequelize.QueryTypes.SELECT });
        const columnNames = columns.map(col => col.Field);
        
        if (!columnNames.includes('surveyId')) {
          console.log('  🔧 添加 surveyId 欄位...');
          await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`surveyId\` varchar(100) NOT NULL UNIQUE`);
        }
        
        if (!columnNames.includes('isActive')) {
          console.log('  🔧 添加 isActive 欄位...');
          await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`isActive\` tinyint(1) DEFAULT 1`);
        }
        
        if (!columnNames.includes('createdAt')) {
          console.log('  🔧 添加 createdAt 欄位...');
          await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`createdAt\` datetime NOT NULL`);
        }
        
        if (!columnNames.includes('updatedAt')) {
          console.log('  🔧 添加 updatedAt 欄位...');
          await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`updatedAt\` datetime NOT NULL`);
        }
        
        // 清理重複的空值
        console.log('  🧹 清理重複的空值...');
        await sequelize.query(`
          DELETE FROM \`survey_settings\` 
          WHERE \`surveyId\` = '' OR \`surveyId\` IS NULL
        `);
        
        console.log('  ✅ survey_settings 表格修復完成');
      }
    } catch (error) {
      console.log(`  ❌ survey_settings 修復失敗: ${error.message}`);
    }
    
    // 2. 創建 User 表格
    console.log('\n📋 創建 User 表格...');
    
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`User\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`studentId\` varchar(50) NOT NULL UNIQUE,
          \`name\` varchar(255) NOT NULL,
          \`email\` varchar(255) NOT NULL,
          \`phone\` varchar(20),
          \`department\` varchar(100),
          \`isBlacklisted\` tinyint(1) DEFAULT 0,
          \`blacklistUntil\` datetime,
          \`createdAt\` datetime NOT NULL,
          \`updatedAt\` datetime NOT NULL,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`studentId\` (\`studentId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      console.log('  ✅ User 表格創建成功');
    } catch (error) {
      console.log(`  ❌ User 表格創建失敗: ${error.message}`);
    }
    
    // 3. 檢查所有重要表格
    console.log('\n📋 檢查所有重要表格...');
    
    const importantTables = ['Event', 'Reservation', 'User', 'survey_settings', 'Settings'];
    
    for (const tableName of importantTables) {
      try {
        const columns = await sequelize.query(`DESCRIBE \`${tableName}\``, { type: Sequelize.QueryTypes.SELECT });
        console.log(`  ✅ ${tableName}: ${columns.length} 個欄位`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 最終修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixFinalIssues();
