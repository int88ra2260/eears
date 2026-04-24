// 修復特定問題
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

async function fixSpecificIssues() {
  try {
    console.log('🔧 修復特定問題...\n');
    
    // 1. 修復 survey_settings 表格
    console.log('📋 修復 survey_settings 表格...');
    
    try {
      // 先檢查現有結構
      const columns = await sequelize.query('DESCRIBE survey_settings', { type: Sequelize.QueryTypes.SELECT });
      console.log('  現有欄位:', columns.map(col => col.Field).join(', '));
      
      // 如果沒有 surveyId 欄位，先添加一個臨時欄位
      if (!columns.map(col => col.Field).includes('surveyId')) {
        console.log('  🔧 添加 surveyId 欄位（允許 NULL）...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`surveyId\` varchar(100)`);
        
        // 為現有記錄設置預設值
        console.log('  🔧 設置預設值...');
        await sequelize.query(`UPDATE \`survey_settings\` SET \`surveyId\` = CONCAT('survey_', \`id\`) WHERE \`surveyId\` IS NULL`);
        
        // 現在設置為 NOT NULL
        console.log('  🔧 設置為 NOT NULL...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` MODIFY COLUMN \`surveyId\` varchar(100) NOT NULL`);
        
        // 添加唯一約束
        console.log('  🔧 添加唯一約束...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD UNIQUE KEY \`unique_survey_id\` (\`surveyId\`)`);
      }
      
      // 添加其他缺失的欄位
      const currentColumns = await sequelize.query('DESCRIBE survey_settings', { type: Sequelize.QueryTypes.SELECT });
      const currentColumnNames = currentColumns.map(col => col.Field);
      
      if (!currentColumnNames.includes('isActive')) {
        console.log('  🔧 添加 isActive 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`isActive\` tinyint(1) DEFAULT 1`);
      }
      
      if (!currentColumnNames.includes('createdAt')) {
        console.log('  🔧 添加 createdAt 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP`);
      }
      
      if (!currentColumnNames.includes('updatedAt')) {
        console.log('  🔧 添加 updatedAt 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      }
      
      console.log('  ✅ survey_settings 表格修復完成');
    } catch (error) {
      console.log(`  ❌ survey_settings 修復失敗: ${error.message}`);
    }
    
    // 2. 修復 User 表格
    console.log('\n📋 修復 User 表格...');
    
    try {
      // 先檢查 User 表格是否存在
      const userTableExists = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'activity_reservation' 
        AND table_name = 'User'
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (userTableExists[0].count === 0) {
        console.log('  ⚠️  User 表格不存在，重新創建...');
        await sequelize.query(`
          CREATE TABLE \`User\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`studentId\` varchar(50) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`email\` varchar(255) NOT NULL,
            \`phone\` varchar(20),
            \`department\` varchar(100),
            \`isBlacklisted\` tinyint(1) DEFAULT 0,
            \`blacklistUntil\` datetime,
            \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
            \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `);
        
        // 添加唯一約束
        console.log('  🔧 添加 studentId 唯一約束...');
        await sequelize.query(`ALTER TABLE \`User\` ADD UNIQUE KEY \`unique_student_id\` (\`studentId\`)`);
        
        console.log('  ✅ User 表格創建成功');
      } else {
        console.log('  ✅ User 表格已存在');
      }
    } catch (error) {
      console.log(`  ❌ User 表格修復失敗: ${error.message}`);
    }
    
    // 3. 最終檢查
    console.log('\n📋 最終檢查...');
    
    const importantTables = ['Event', 'Reservation', 'User', 'survey_settings', 'Settings'];
    
    for (const tableName of importantTables) {
      try {
        const columns = await sequelize.query(`DESCRIBE \`${tableName}\``, { type: Sequelize.QueryTypes.SELECT });
        console.log(`  ✅ ${tableName}: ${columns.length} 個欄位`);
        
        // 顯示關鍵欄位
        const keyColumns = columns.filter(col => 
          ['id', 'name', 'studentId', 'surveyId', 'eventId', 'userId'].includes(col.Field)
        );
        if (keyColumns.length > 0) {
          console.log(`    關鍵欄位: ${keyColumns.map(col => col.Field).join(', ')}`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixSpecificIssues();
