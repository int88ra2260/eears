// 安全的二進位日誌恢復腳本
const { exec } = require('child_process');
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function safeBinlogRecovery() {
  try {
    console.log('🔄 安全二進位日誌恢復...\n');
    
    // 1. 先檢查當前資料狀況
    console.log('📊 檢查當前資料狀況...');
    
    const eventCount = await sequelize.query('SELECT COUNT(*) as count FROM `Event`', { 
      type: Sequelize.QueryTypes.SELECT 
    });
    const reservationCount = await sequelize.query('SELECT COUNT(*) as count FROM `Reservation`', { 
      type: Sequelize.QueryTypes.SELECT 
    });
    const userCount = await sequelize.query('SELECT COUNT(*) as count FROM `User`', { 
      type: Sequelize.QueryTypes.SELECT 
    });
    
    console.log(`  Event: ${eventCount[0].count} 筆`);
    console.log(`  Reservation: ${reservationCount[0].count} 筆`);
    console.log(`  User: ${userCount[0].count} 筆`);
    
    // 2. 備份當前狀態
    console.log('\n📦 備份當前狀態...');
    
    const backupCommand = `mysqldump -u root -p${process.env.DB_PASSWORD || 'NewStrongPassword123!'} activity_reservation > backup_before_recovery_${Date.now()}.sql`;
    
    await new Promise((resolve, reject) => {
      exec(backupCommand, (error, stdout, stderr) => {
        if (error) {
          console.log('  ⚠️  備份失敗，但繼續恢復過程');
          resolve();
        } else {
          console.log('  ✅ 當前狀態已備份');
          resolve();
        }
      });
    });
    
    // 3. 檢查二進位日誌檔案
    console.log('\n🔍 檢查二進位日誌檔案...');
    
    const binlogFiles = ['binlog.000048', 'binlog.000049', 'binlog.000050'];
    let foundInserts = false;
    
    for (const binlogFile of binlogFiles) {
      console.log(`\n📋 檢查 ${binlogFile}...`);
      
      const checkCommand = `mysqlbinlog --start-datetime="2024-12-01 00:00:00" ${binlogFile} | grep -i "INSERT INTO" | head -5`;
      
      await new Promise((resolve) => {
        exec(checkCommand, (error, stdout, stderr) => {
          if (stdout && stdout.trim()) {
            console.log(`  ✅ 找到 INSERT 語句:`);
            const lines = stdout.split('\n').filter(line => line.trim());
            lines.slice(0, 3).forEach(line => {
              console.log(`    ${line}`);
            });
            foundInserts = true;
          } else {
            console.log(`  ❌ 沒有找到 INSERT 語句`);
          }
          resolve();
        });
      });
    }
    
    if (!foundInserts) {
      console.log('\n⚠️  沒有在二進位日誌中找到 INSERT 語句');
      console.log('💡 可能的原因:');
      console.log('  1. 二進位日誌已過期或被清理');
      console.log('  2. 資料是通過其他方式插入的');
      console.log('  3. 需要檢查更早的日誌檔案');
      return;
    }
    
    // 4. 詢問是否繼續恢復
    console.log('\n❓ 是否要繼續從二進位日誌恢復資料？');
    console.log('⚠️  這將嘗試恢復所有相關的 INSERT 語句');
    console.log('💡 建議先手動檢查二進位日誌內容');
    
    // 提供手動檢查指令
    console.log('\n🛠️ 手動檢查指令:');
    console.log('1. 查看二進位日誌內容:');
    console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO" | head -20');
    console.log('');
    console.log('2. 查看特定表格的 INSERT 語句:');
    console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO.*Event"');
    console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO.*Reservation"');
    console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO.*User"');
    console.log('');
    console.log('3. 如果確認有資料，執行恢復:');
    console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | mysql -u root -p activity_reservation');
    
  } catch (error) {
    console.error('❌ 檢查過程失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

safeBinlogRecovery();
