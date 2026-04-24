// 檢查 MySQL 二進制日誌檔案
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkMySQLLogs() {
  try {
    console.log('🔍 檢查 MySQL 二進制日誌檔案...\n');
    
    const dataDir = 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data\\';
    
    // 1. 檢查目錄是否存在
    if (!fs.existsSync(dataDir)) {
      console.log('❌ MySQL 資料目錄不存在:', dataDir);
      return;
    }
    
    console.log('✅ MySQL 資料目錄存在:', dataDir);
    
    // 2. 列出所有檔案
    const files = fs.readdirSync(dataDir);
    console.log('\n📁 目錄中的檔案:');
    files.forEach(file => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const modified = stats.mtime.toLocaleString('zh-TW');
      console.log(`  ${file} (${size} MB, 修改時間: ${modified})`);
    });
    
    // 3. 尋找二進制日誌檔案
    const binLogFiles = files.filter(file => file.startsWith('mysql-bin.'));
    console.log('\n📋 找到二進制日誌檔案:');
    binLogFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const modified = stats.mtime.toLocaleString('zh-TW');
      console.log(`  ${file} (${size} MB, 修改時間: ${modified})`);
    });
    
    // 4. 檢查最新的二進制日誌檔案
    if (binLogFiles.length > 0) {
      const latestBinLog = binLogFiles.sort().pop();
      const latestBinLogPath = path.join(dataDir, latestBinLog);
      
      console.log(`\n🔍 檢查最新的二進制日誌: ${latestBinLog}`);
      
      try {
        // 使用 mysqlbinlog 查看日誌內容
        const { stdout, stderr } = await execAsync(`mysqlbinlog --start-datetime="2025-10-29 00:00:00" --stop-datetime="2025-10-29 23:59:59" "${latestBinLogPath}"`);
        
        if (stdout) {
          console.log('✅ 找到今天的日誌記錄:');
          const lines = stdout.split('\n');
          const relevantLines = lines.filter(line => 
            line.includes('activity_reservation') || 
            line.includes('CREATE TABLE') || 
            line.includes('INSERT INTO') ||
            line.includes('DROP TABLE') ||
            line.includes('ALTER TABLE')
          );
          
          if (relevantLines.length > 0) {
            console.log('相關操作記錄:');
            relevantLines.slice(0, 20).forEach(line => console.log(`  ${line}`));
            if (relevantLines.length > 20) {
              console.log(`  ... 還有 ${relevantLines.length - 20} 行記錄`);
            }
          } else {
            console.log('⚠️ 沒有找到相關的資料庫操作記錄');
          }
        }
        
        if (stderr) {
          console.log('⚠️ 警告:', stderr);
        }
        
      } catch (error) {
        console.log('❌ 無法讀取二進制日誌:', error.message);
      }
    }
    
    // 5. 提供恢復建議
    console.log('\n🛠️ 恢復建議:');
    
    if (binLogFiles.length > 0) {
      const latestBinLog = binLogFiles.sort().pop();
      console.log('1. 使用最新的二進制日誌恢復:');
      console.log(`   mysqlbinlog --start-datetime="2025-10-29 00:00:00" --stop-datetime="2025-10-29 12:00:00" "${dataDir}${latestBinLog}" | mysql -u root -p activity_reservation`);
      
      console.log('\n2. 如果上面的命令失敗，嘗試恢復到更早的時間:');
      console.log(`   mysqlbinlog --start-datetime="2025-10-29 00:00:00" --stop-datetime="2025-10-29 10:00:00" "${dataDir}${latestBinLog}" | mysql -u root -p activity_reservation`);
      
      console.log('\n3. 查看完整的日誌內容:');
      console.log(`   mysqlbinlog "${dataDir}${latestBinLog}" > recovery_log.sql`);
    } else {
      console.log('❌ 沒有找到二進制日誌檔案');
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

checkMySQLLogs();
