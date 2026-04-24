// 修復剩餘的資料庫問題
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

async function fixRemainingIssues() {
  try {
    console.log('🔧 修復剩餘的資料庫問題...\n');
    
    // 1. 修復 Event 表格缺失的欄位
    console.log('📋 修復 Event 表格...');
    
    const eventColumns = await sequelize.query('DESCRIBE Event', { type: Sequelize.QueryTypes.SELECT });
    const eventColumnNames = eventColumns.map(col => col.Field);
    
    const missingEventColumns = [
      { name: 'description', type: 'text' },
      { name: 'maxParticipants', type: 'int DEFAULT 0' },
      { name: 'currentParticipants', type: 'int DEFAULT 0' },
      { name: 'createdAt', type: 'datetime NOT NULL' },
      { name: 'updatedAt', type: 'datetime NOT NULL' }
    ];
    
    for (const col of missingEventColumns) {
      if (!eventColumnNames.includes(col.name)) {
        console.log(`  🔧 添加欄位: ${col.name}`);
        await sequelize.query(`ALTER TABLE \`Event\` ADD COLUMN \`${col.name}\` ${col.type}`);
      }
    }
    
    // 2. 修復 survey_settings 重複鍵問題
    console.log('\n📋 修復 survey_settings 表格...');
    
    try {
      // 先清理重複的空值
      console.log('  🧹 清理重複的空值...');
      await sequelize.query(`
        DELETE FROM \`survey_settings\` 
        WHERE \`surveyId\` = '' OR \`surveyId\` IS NULL
      `);
      
      // 檢查並添加缺失的欄位
      const surveyColumns = await sequelize.query('DESCRIBE survey_settings', { type: Sequelize.QueryTypes.SELECT });
      const surveyColumnNames = surveyColumns.map(col => col.Field);
      
      if (!surveyColumnNames.includes('surveyId')) {
        console.log('  🔧 添加 surveyId 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`surveyId\` varchar(100) NOT NULL UNIQUE`);
      }
      
      if (!surveyColumnNames.includes('isActive')) {
        console.log('  🔧 添加 isActive 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`isActive\` tinyint(1) DEFAULT 1`);
      }
      
      console.log('  ✅ survey_settings 修復完成');
    } catch (error) {
      console.log(`  ⚠️  survey_settings 修復失敗: ${error.message}`);
    }
    
    // 3. 檢查 Reservation 表格
    console.log('\n📋 檢查 Reservation 表格...');
    
    try {
      const reservationColumns = await sequelize.query('DESCRIBE Reservation', { type: Sequelize.QueryTypes.SELECT });
      const reservationColumnNames = reservationColumns.map(col => col.Field);
      
      const requiredReservationColumns = [
        { name: 'eventId', type: 'int NOT NULL' },
        { name: 'userId', type: 'int NOT NULL' },
        { name: 'studentId', type: 'varchar(50) NOT NULL' },
        { name: 'studentName', type: 'varchar(255) NOT NULL' },
        { name: 'studentEmail', type: 'varchar(255) NOT NULL' },
        { name: 'phone', type: 'varchar(20)' },
        { name: 'department', type: 'varchar(100)' },
        { name: 'timestamp', type: 'datetime NOT NULL' },
        { name: 'checkinStatus', type: 'varchar(50) DEFAULT "未報到"' },
        { name: 'checkinTime', type: 'datetime' },
        { name: 'group', type: 'varchar(50)' },
        { name: 'createdAt', type: 'datetime NOT NULL' },
        { name: 'updatedAt', type: 'datetime NOT NULL' }
      ];
      
      for (const col of requiredReservationColumns) {
        if (!reservationColumnNames.includes(col.name)) {
          console.log(`  🔧 添加欄位: ${col.name}`);
          await sequelize.query(`ALTER TABLE \`Reservation\` ADD COLUMN \`${col.name}\` ${col.type}`);
        }
      }
      
      console.log('  ✅ Reservation 表格檢查完成');
    } catch (error) {
      console.log(`  ⚠️  Reservation 表格檢查失敗: ${error.message}`);
    }
    
    // 4. 檢查 User 表格
    console.log('\n📋 檢查 User 表格...');
    
    try {
      const userColumns = await sequelize.query('DESCRIBE User', { type: Sequelize.QueryTypes.SELECT });
      const userColumnNames = userColumns.map(col => col.Field);
      
      const requiredUserColumns = [
        { name: 'studentId', type: 'varchar(50) NOT NULL UNIQUE' },
        { name: 'name', type: 'varchar(255) NOT NULL' },
        { name: 'email', type: 'varchar(255) NOT NULL' },
        { name: 'phone', type: 'varchar(20)' },
        { name: 'department', type: 'varchar(100)' },
        { name: 'isBlacklisted', type: 'tinyint(1) DEFAULT 0' },
        { name: 'blacklistUntil', type: 'datetime' },
        { name: 'createdAt', type: 'datetime NOT NULL' },
        { name: 'updatedAt', type: 'datetime NOT NULL' }
      ];
      
      for (const col of requiredUserColumns) {
        if (!userColumnNames.includes(col.name)) {
          console.log(`  🔧 添加欄位: ${col.name}`);
          await sequelize.query(`ALTER TABLE \`User\` ADD COLUMN \`${col.name}\` ${col.type}`);
        }
      }
      
      console.log('  ✅ User 表格檢查完成');
    } catch (error) {
      console.log(`  ⚠️  User 表格檢查失敗: ${error.message}`);
    }
    
    console.log('\n🎉 修復完成！');
    
  } catch (error) {
    console.error('❌ 修復失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixRemainingIssues();
