// 緊急資料恢復腳本
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

async function emergencyDataRecovery() {
  try {
    console.log('🚨 緊急資料恢復檢查...\n');
    
    // 1. 檢查所有表格的資料數量
    console.log('📊 檢查各表格資料數量...');
    
    const tables = ['Event', 'Reservation', 'User', 'survey_settings', 'Settings', 'EnglishTableSurveyResponse'];
    
    for (const tableName of tables) {
      try {
        const result = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``, { 
          type: Sequelize.QueryTypes.SELECT 
        });
        const count = result[0].count;
        console.log(`  ${tableName}: ${count} 筆資料`);
        
        if (count === 0) {
          console.log(`    ⚠️  ${tableName} 表格沒有資料！`);
        }
      } catch (error) {
        console.log(`  ❌ ${tableName}: ${error.message}`);
      }
    }
    
    // 2. 檢查是否有備份
    console.log('\n🔍 檢查可能的備份...');
    
    // 檢查是否有其他資料庫
    try {
      const databases = await sequelize.query('SHOW DATABASES', { type: Sequelize.QueryTypes.SELECT });
      console.log('  可用的資料庫:');
      databases.forEach(db => {
        const dbName = Object.values(db)[0];
        if (dbName.includes('activity') || dbName.includes('reservation') || dbName.includes('backup')) {
          console.log(`    - ${dbName}`);
        }
      });
    } catch (error) {
      console.log('  ❌ 無法檢查資料庫列表');
    }
    
    // 3. 檢查 MySQL 二進位日誌
    console.log('\n📝 檢查 MySQL 二進位日誌...');
    try {
      const binlogs = await sequelize.query('SHOW BINARY LOGS', { type: Sequelize.QueryTypes.SELECT });
      if (binlogs.length > 0) {
        console.log('  找到二進位日誌檔案:');
        binlogs.slice(-5).forEach(log => {
          console.log(`    - ${log.Log_name} (${log.File_size} bytes)`);
        });
        console.log('  💡 可以使用 mysqlbinlog 工具恢復資料');
      } else {
        console.log('  ❌ 沒有找到二進位日誌');
      }
    } catch (error) {
      console.log('  ❌ 無法檢查二進位日誌');
    }
    
    // 4. 提供恢復建議
    console.log('\n🛠️ 資料恢復建議:');
    console.log('  1. 檢查是否有資料庫備份檔案 (.sql 或 .dump)');
    console.log('  2. 檢查是否有 MySQL 二進位日誌');
    console.log('  3. 檢查是否有系統備份');
    console.log('  4. 如果都沒有，可能需要重新創建測試資料');
    
    // 5. 創建測試資料（如果沒有資料）
    console.log('\n🔧 創建測試資料...');
    
    try {
      // 檢查 Event 表格是否有資料
      const eventCount = await sequelize.query('SELECT COUNT(*) as count FROM `Event`', { 
        type: Sequelize.QueryTypes.SELECT 
      });
      
      if (eventCount[0].count === 0) {
        console.log('  創建測試活動資料...');
        await sequelize.query(`
          INSERT INTO \`Event\` (\`name\`, \`description\`, \`date\`, \`startTime\`, \`endTime\`, \`location\`, \`maxParticipants\`, \`currentParticipants\`, \`eventType\`, \`maxCapacity\`, \`createdAt\`, \`updatedAt\`) VALUES
          ('English Table Session 1', 'English conversation practice', '2024-12-15', '14:00:00', '15:00:00', 'Room A101', 20, 0, 'English Table', 20, NOW(), NOW()),
          ('English Club Meeting', 'Weekly English club gathering', '2024-12-16', '16:00:00', '17:00:00', 'Room B202', 30, 0, 'English Club', 30, NOW(), NOW())
        `);
        console.log('  ✅ 測試活動資料創建完成');
      }
      
      // 檢查 User 表格是否有資料
      const userCount = await sequelize.query('SELECT COUNT(*) as count FROM `User`', { 
        type: Sequelize.QueryTypes.SELECT 
      });
      
      if (userCount[0].count === 0) {
        console.log('  創建測試用戶資料...');
        await sequelize.query(`
          INSERT INTO \`User\` (\`studentId\`, \`name\`, \`email\`, \`phone\`, \`department\`, \`isBlacklisted\`, \`createdAt\`, \`updatedAt\`) VALUES
          ('B123456789', '張小明', 'zhang@example.com', '0912345678', '資訊工程系', 0, NOW(), NOW()),
          ('B987654321', '李美華', 'li@example.com', '0987654321', '外語系', 0, NOW(), NOW())
        `);
        console.log('  ✅ 測試用戶資料創建完成');
      }
      
    } catch (error) {
      console.log(`  ❌ 創建測試資料失敗: ${error.message}`);
    }
    
    console.log('\n🎉 資料恢復檢查完成！');
    
  } catch (error) {
    console.error('❌ 恢復檢查失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

emergencyDataRecovery();
