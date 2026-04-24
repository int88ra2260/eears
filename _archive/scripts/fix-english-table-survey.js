// 修復 EnglishTableSurveyResponse 表格
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

async function fixEnglishTableSurvey() {
  try {
    console.log('🔧 修復 EnglishTableSurveyResponse 表格...\n');
    
    // 創建 EnglishTableSurveyResponse 表格
    console.log('📋 創建 EnglishTableSurveyResponse 表格...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`EnglishTableSurveyResponse\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`studentId\` varchar(50) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`q1\` int,
        \`q2\` int,
        \`q3\` int,
        \`q4\` int,
        \`q5\` int,
        \`q6\` int,
        \`q7\` int,
        \`q8\` int,
        \`q9\` int,
        \`q10\` int,
        \`q11\` int,
        \`q12\` int,
        \`q13\` int,
        \`q14\` int,
        \`q15\` int,
        \`q16\` int,
        \`q17\` int,
        \`q18\` int,
        \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_student_id\` (\`studentId\`),
        KEY \`idx_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
    
    console.log('  ✅ EnglishTableSurveyResponse 表格創建成功');
    
    // 檢查表格結構
    console.log('\n📋 檢查表格結構...');
    const columns = await sequelize.query('DESCRIBE EnglishTableSurveyResponse', { type: Sequelize.QueryTypes.SELECT });
    console.log(`  ✅ 表格包含 ${columns.length} 個欄位`);
    
    // 檢查資料數量
    const count = await sequelize.query('SELECT COUNT(*) as count FROM EnglishTableSurveyResponse', { 
      type: Sequelize.QueryTypes.SELECT 
    });
    console.log(`  ✅ 表格包含 ${count[0].count} 筆資料`);
    
    // 最終檢查所有重要表格
    console.log('\n📋 最終檢查所有表格...');
    
    const importantTables = ['Event', 'Reservation', 'User', 'survey_settings', 'Settings', 'EnglishTableSurveyResponse'];
    
    for (const tableName of importantTables) {
      try {
        const result = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``, { 
          type: Sequelize.QueryTypes.SELECT 
        });
        const count = result[0].count;
        console.log(`  ✅ ${tableName}: ${count} 筆資料`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 所有表格修復完成！系統應該可以正常運行了！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixEnglishTableSurvey();
