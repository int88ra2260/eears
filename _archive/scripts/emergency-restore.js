// 緊急恢復資料庫結構
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

async function emergencyRestore() {
  try {
    console.log('🚨 緊急恢復資料庫結構...\n');
    
    // 1. 修復 Event 表格
    console.log('📋 修復 Event 表格...');
    
    // 檢查 Event 表格是否存在
    const eventTableExists = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'activity_reservation' 
      AND table_name = 'Event'
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (eventTableExists[0].count === 0) {
      console.log('  ⚠️  Event 表格不存在，重新創建...');
      await sequelize.query(`
        CREATE TABLE \`Event\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`name\` varchar(255) NOT NULL,
          \`description\` text,
          \`date\` date NOT NULL,
          \`startTime\` time NOT NULL,
          \`endTime\` time NOT NULL,
          \`location\` varchar(255) NOT NULL,
          \`maxParticipants\` int DEFAULT 0,
          \`currentParticipants\` int DEFAULT 0,
          \`eventType\` varchar(100) NOT NULL,
          \`maxCapacity\` int DEFAULT 0,
          \`customReservationRule\` text,
          \`createdAt\` datetime NOT NULL,
          \`updatedAt\` datetime NOT NULL,
          PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      console.log('  ✅ Event 表格創建成功');
    } else {
      // 檢查並添加缺失的欄位
      const eventColumns = await sequelize.query('DESCRIBE Event', { type: Sequelize.QueryTypes.SELECT });
      const columnNames = eventColumns.map(col => col.Field);
      
      const requiredColumns = [
        { name: 'name', type: 'varchar(255) NOT NULL' },
        { name: 'description', type: 'text' },
        { name: 'date', type: 'date NOT NULL' },
        { name: 'startTime', type: 'time NOT NULL' },
        { name: 'endTime', type: 'time NOT NULL' },
        { name: 'location', type: 'varchar(255) NOT NULL' },
        { name: 'maxParticipants', type: 'int DEFAULT 0' },
        { name: 'currentParticipants', type: 'int DEFAULT 0' },
        { name: 'eventType', type: 'varchar(100) NOT NULL' },
        { name: 'maxCapacity', type: 'int DEFAULT 0' },
        { name: 'customReservationRule', type: 'text' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`    🔧 添加欄位: ${col.name}`);
          await sequelize.query(`ALTER TABLE \`Event\` ADD COLUMN \`${col.name}\` ${col.type}`);
        }
      }
      console.log('  ✅ Event 表格修復完成');
    }
    
    // 2. 修復 Reservation 表格
    console.log('\n📋 修復 Reservation 表格...');
    
    const reservationTableExists = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'activity_reservation' 
      AND table_name = 'Reservation'
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (reservationTableExists[0].count === 0) {
      console.log('  ⚠️  Reservation 表格不存在，重新創建...');
      await sequelize.query(`
        CREATE TABLE \`Reservation\` (
          \`id\` int NOT NULL AUTO_INCREMENT,
          \`eventId\` int NOT NULL,
          \`userId\` int NOT NULL,
          \`studentId\` varchar(50) NOT NULL,
          \`studentName\` varchar(255) NOT NULL,
          \`studentEmail\` varchar(255) NOT NULL,
          \`phone\` varchar(20),
          \`department\` varchar(100),
          \`timestamp\` datetime NOT NULL,
          \`checkinStatus\` varchar(50) DEFAULT '未報到',
          \`checkinTime\` datetime,
          \`group\` varchar(50),
          \`createdAt\` datetime NOT NULL,
          \`updatedAt\` datetime NOT NULL,
          PRIMARY KEY (\`id\`),
          KEY \`reservations_event_id\` (\`eventId\`),
          KEY \`reservations_user_id\` (\`userId\`),
          KEY \`reservations_student_id\` (\`studentId\`),
          UNIQUE KEY \`unique_event_student\` (\`eventId\`, \`studentId\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
      `);
      console.log('  ✅ Reservation 表格創建成功');
    } else {
      const reservationColumns = await sequelize.query('DESCRIBE Reservation', { type: Sequelize.QueryTypes.SELECT });
      const columnNames = reservationColumns.map(col => col.Field);
      
      const requiredColumns = [
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
        { name: 'group', type: 'varchar(50)' }
      ];
      
      for (const col of requiredColumns) {
        if (!columnNames.includes(col.name)) {
          console.log(`    🔧 添加欄位: ${col.name}`);
          await sequelize.query(`ALTER TABLE \`Reservation\` ADD COLUMN \`${col.name}\` ${col.type}`);
        }
      }
      console.log('  ✅ Reservation 表格修復完成');
    }
    
    // 3. 修復 survey_settings 表格
    console.log('\n📋 修復 survey_settings 表格...');
    
    const surveySettingsExists = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'activity_reservation' 
      AND table_name = 'survey_settings'
    `, { type: Sequelize.QueryTypes.SELECT });
    
    if (surveySettingsExists[0].count === 0) {
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
      // 清理重複的空值
      console.log('    🧹 清理重複的空值...');
      await sequelize.query(`
        DELETE FROM \`survey_settings\` 
        WHERE \`surveyId\` = '' OR \`surveyId\` IS NULL
      `);
      
      // 檢查並添加缺失的欄位
      const surveyColumns = await sequelize.query('DESCRIBE survey_settings', { type: Sequelize.QueryTypes.SELECT });
      const columnNames = surveyColumns.map(col => col.Field);
      
      if (!columnNames.includes('surveyId')) {
        console.log('    🔧 添加 surveyId 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`surveyId\` varchar(100) NOT NULL UNIQUE`);
      }
      
      if (!columnNames.includes('isActive')) {
        console.log('    🔧 添加 isActive 欄位...');
        await sequelize.query(`ALTER TABLE \`survey_settings\` ADD COLUMN \`isActive\` tinyint(1) DEFAULT 1`);
      }
      
      console.log('  ✅ survey_settings 表格修復完成');
    }
    
    // 4. 修復其他重要表格
    console.log('\n📋 修復其他重要表格...');
    
    const importantTables = [
      {
        name: 'User',
        sql: `
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
        `
      },
      {
        name: 'Settings',
        sql: `
          CREATE TABLE IF NOT EXISTS \`Settings\` (
            \`id\` int NOT NULL AUTO_INCREMENT,
            \`key\` varchar(255) NOT NULL UNIQUE,
            \`value\` text,
            \`createdAt\` datetime NOT NULL,
            \`updatedAt\` datetime NOT NULL,
            PRIMARY KEY (\`id\`),
            UNIQUE KEY \`key\` (\`key\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
        `
      }
    ];
    
    for (const table of importantTables) {
      try {
        await sequelize.query(table.sql);
        console.log(`  ✅ ${table.name} 表格修復完成`);
      } catch (error) {
        console.log(`  ⚠️  ${table.name} 表格修復失敗: ${error.message}`);
      }
    }
    
    console.log('\n🎉 緊急恢復完成！');
    
  } catch (error) {
    console.error('❌ 恢復失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

emergencyRestore();
