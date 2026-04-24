// 緊急恢復腳本
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
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

// 檢查是否有 MySQL 二進制日誌
async function checkBinaryLogs() {
  try {
    console.log('🔍 檢查 MySQL 二進制日誌...');
    
    const logs = await sequelize.query("SHOW BINARY LOGS", { type: Sequelize.QueryTypes.SELECT });
    console.log('找到二進制日誌:', logs.map(log => log.Log_name));
    
    if (logs.length > 0) {
      console.log('\n💡 可以使用以下命令恢復資料:');
      console.log('mysqlbinlog --start-datetime="2025-10-29 00:00:00" --stop-datetime="2025-10-29 23:59:59" /var/lib/mysql/mysql-bin.000001 | mysql -u root -p activity_reservation');
    }
    
    return logs;
  } catch (error) {
    console.log('❌ 無法檢查二進制日誌:', error.message);
    return [];
  }
}

// 檢查是否有備份檔案
async function checkBackups() {
  try {
    console.log('\n🔍 檢查備份檔案...');
    
    const backupDir = path.join(__dirname, 'backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir);
      console.log('找到備份檔案:', files);
      return files;
    } else {
      console.log('❌ 沒有找到備份目錄');
      return [];
    }
  } catch (error) {
    console.log('❌ 檢查備份失敗:', error.message);
    return [];
  }
}

// 檢查資料庫狀態
async function checkDatabaseStatus() {
  try {
    console.log('🚨 檢查資料庫狀態...\n');
    
    // 1. 檢查表格
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    console.log(`📋 找到 ${tables.length} 個表格:`, tables.map(t => Object.values(t)[0]));
    
    // 2. 檢查資料量
    console.log('\n📊 各表格資料量:');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      try {
        const count = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``, { 
          type: Sequelize.QueryTypes.SELECT 
        });
        console.log(`  ${tableName}: ${count[0].count} 筆資料`);
      } catch (error) {
        console.log(`  ${tableName}: ❌ 錯誤 - ${error.message}`);
      }
    }
    
    return tables;
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
    return [];
  }
}

// 嘗試從 MySQL 錯誤日誌恢復
async function checkErrorLogs() {
  try {
    console.log('\n🔍 檢查 MySQL 錯誤日誌...');
    
    const errorLog = await sequelize.query("SHOW VARIABLES LIKE 'log_error'", { 
      type: Sequelize.QueryTypes.SELECT 
    });
    
    if (errorLog.length > 0) {
      console.log('錯誤日誌位置:', errorLog[0].Value);
      
      // 嘗試讀取錯誤日誌
      try {
        const logPath = errorLog[0].Value;
        if (fs.existsSync(logPath)) {
          const logContent = fs.readFileSync(logPath, 'utf8');
          const recentLines = logContent.split('\n').slice(-50).join('\n');
          console.log('最近的錯誤日誌:');
          console.log(recentLines);
        }
      } catch (readError) {
        console.log('無法讀取錯誤日誌:', readError.message);
      }
    }
  } catch (error) {
    console.log('❌ 無法檢查錯誤日誌:', error.message);
  }
}

// 主恢復函數
async function emergencyRecovery() {
  try {
    console.log('🚨 緊急資料恢復程序啟動...\n');
    
    // 1. 檢查資料庫狀態
    const tables = await checkDatabaseStatus();
    
    // 2. 檢查二進制日誌
    const binaryLogs = await checkBinaryLogs();
    
    // 3. 檢查備份檔案
    const backupFiles = await checkBackups();
    
    // 4. 檢查錯誤日誌
    await checkErrorLogs();
    
    // 5. 提供恢復建議
    console.log('\n🛠️ 恢復建議:');
    
    if (binaryLogs.length > 0) {
      console.log('1. 使用 MySQL 二進制日誌恢復 (推薦)');
      console.log('   mysqlbinlog --start-datetime="2024-12-01 00:00:00" /var/lib/mysql/mysql-bin.000001 | mysql -u root -p activity_reservation');
    }
    
    if (backupFiles.length > 0) {
      console.log('2. 使用備份檔案恢復');
      console.log('   mysql -u root -p activity_reservation < backup_file.sql');
    }
    
    console.log('3. 檢查 MySQL 的 binlog 目錄');
    console.log('   Windows: C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data\\');
    console.log('   Linux: /var/lib/mysql/');
    
    console.log('4. 如果沒有備份，可能需要重新建立資料');
    
  } catch (error) {
    console.error('❌ 恢復程序失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

emergencyRecovery();
