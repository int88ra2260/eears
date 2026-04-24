// 從二進位日誌恢復資料
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

async function recoverFromBinlog() {
  try {
    console.log('🔄 從二進位日誌恢復資料...\n');
    
    // 1. 先備份當前狀態
    console.log('📦 備份當前狀態...');
    const backupCommand = `mysqldump -u root -p${process.env.DB_PASSWORD || 'NewStrongPassword123!'} activity_reservation > backup_before_recovery.sql`;
    
    exec(backupCommand, (error, stdout, stderr) => {
      if (error) {
        console.log('  ⚠️  備份失敗，但繼續恢復過程');
      } else {
        console.log('  ✅ 當前狀態已備份到 backup_before_recovery.sql');
      }
    });
    
    // 2. 檢查二進位日誌檔案
    console.log('\n🔍 檢查二進位日誌檔案...');
    
    const binlogFiles = ['binlog.000048', 'binlog.000049', 'binlog.000050'];
    
    for (const binlogFile of binlogFiles) {
      console.log(`\n📋 檢查 ${binlogFile}...`);
      
      // 檢查日誌檔案中的 INSERT 語句
      const checkCommand = `mysqlbinlog --start-datetime="2024-12-01 00:00:00" ${binlogFile} | grep -i "INSERT INTO" | head -10`;
      
      exec(checkCommand, (error, stdout, stderr) => {
        if (stdout) {
          console.log(`  找到 INSERT 語句:`);
          console.log(`  ${stdout.split('\n').slice(0, 5).join('\n  ')}`);
        } else {
          console.log(`  ❌ 沒有找到 INSERT 語句`);
        }
      });
    }
    
    // 3. 嘗試從最新的日誌恢復
    console.log('\n🔄 嘗試從最新日誌恢復...');
    
    const recoveryCommand = `mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | mysql -u root -p${process.env.DB_PASSWORD || 'NewStrongPassword123!'} activity_reservation`;
    
    exec(recoveryCommand, (error, stdout, stderr) => {
      if (error) {
        console.log(`  ❌ 恢復失敗: ${error.message}`);
      } else {
        console.log('  ✅ 恢復命令執行完成');
        
        // 檢查恢復後的資料數量
        setTimeout(async () => {
          try {
            const eventCount = await sequelize.query('SELECT COUNT(*) as count FROM `Event`', { 
              type: Sequelize.QueryTypes.SELECT 
            });
            const reservationCount = await sequelize.query('SELECT COUNT(*) as count FROM `Reservation`', { 
              type: Sequelize.QueryTypes.SELECT 
            });
            const userCount = await sequelize.query('SELECT COUNT(*) as count FROM `User`', { 
              type: Sequelize.QueryTypes.SELECT 
            });
            
            console.log('\n📊 恢復後的資料數量:');
            console.log(`  Event: ${eventCount[0].count} 筆`);
            console.log(`  Reservation: ${reservationCount[0].count} 筆`);
            console.log(`  User: ${userCount[0].count} 筆`);
            
            if (eventCount[0].count > 1 || reservationCount[0].count > 1 || userCount[0].count > 2) {
              console.log('  🎉 資料恢復成功！');
            } else {
              console.log('  ⚠️  資料恢復可能不完整，需要手動檢查');
            }
          } catch (err) {
            console.log('  ❌ 檢查恢復結果失敗:', err.message);
          }
        }, 2000);
      }
    });
    
  } catch (error) {
    console.error('❌ 恢復過程失敗:', error.message);
  }
}

// 提供手動恢復指令
function showManualRecoveryCommands() {
  console.log('\n🛠️ 手動恢復指令:');
  console.log('1. 查看二進位日誌內容:');
  console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" binlog.000050 | grep -i "INSERT INTO"');
  console.log('');
  console.log('2. 恢復到特定時間點:');
  console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" --stop-datetime="2024-12-01 23:59:59" binlog.000050 | mysql -u root -p activity_reservation');
  console.log('');
  console.log('3. 恢復所有相關日誌:');
  console.log('   mysqlbinlog binlog.000048 binlog.000049 binlog.000050 | mysql -u root -p activity_reservation');
}

recoverFromBinlog();
showManualRecoveryCommands();
