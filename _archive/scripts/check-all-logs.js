// 檢查所有可能的日誌檔案
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkAllLogs() {
  try {
    console.log('🔍 全面檢查 MySQL 日誌檔案...\n');
    
    const dataDir = 'C:\\ProgramData\\MySQL\\MySQL Server 8.0\\Data\\';
    
    // 1. 檢查所有二進制日誌檔案
    console.log('📋 檢查所有二進制日誌檔案:');
    const allFiles = fs.readdirSync(dataDir);
    const binLogFiles = allFiles.filter(file => file.includes('-bin.'));
    
    binLogFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const modified = stats.mtime.toLocaleString('zh-TW');
      console.log(`  ${file} (${size} MB, 修改時間: ${modified})`);
    });
    
    // 2. 檢查錯誤日誌
    console.log('\n📋 檢查錯誤日誌:');
    const errorLogFiles = allFiles.filter(file => file.includes('.err'));
    errorLogFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const modified = stats.mtime.toLocaleString('zh-TW');
      console.log(`  ${file} (${size} MB, 修改時間: ${modified})`);
      
      // 讀取錯誤日誌的最後幾行
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').slice(-20);
        console.log('    最近的錯誤記錄:');
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`      ${line}`);
          }
        });
      } catch (error) {
        console.log(`    無法讀取錯誤日誌: ${error.message}`);
      }
    });
    
    // 3. 檢查慢查詢日誌
    console.log('\n📋 檢查慢查詢日誌:');
    const slowLogFiles = allFiles.filter(file => file.includes('slow.log'));
    slowLogFiles.forEach(file => {
      const filePath = path.join(dataDir, file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      const modified = stats.mtime.toLocaleString('zh-TW');
      console.log(`  ${file} (${size} MB, 修改時間: ${modified})`);
    });
    
    // 4. 檢查是否有 activity_reservation 資料庫的檔案
    console.log('\n📋 檢查資料庫檔案:');
    const dbFiles = allFiles.filter(file => file.includes('activity_reservation') || file.includes('activity_reservation'));
    if (dbFiles.length > 0) {
      dbFiles.forEach(file => {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024 / 1024).toFixed(2);
        const modified = stats.mtime.toLocaleString('zh-TW');
        console.log(`  ${file} (${size} MB, 修改時間: ${modified})`);
      });
    } else {
      console.log('  ❌ 沒有找到 activity_reservation 相關檔案');
    }
    
    // 5. 檢查最新的二進制日誌檔案內容
    if (binLogFiles.length > 0) {
      const latestBinLog = binLogFiles.sort().pop();
      const latestBinLogPath = path.join(dataDir, latestBinLog);
      
      console.log(`\n🔍 檢查最新的二進制日誌: ${latestBinLog}`);
      
      try {
        // 查看日誌檔案的開頭和結尾
        const { stdout } = await execAsync(`mysqlbinlog --start-datetime="2025-10-29 00:00:00" --stop-datetime="2025-10-29 23:59:59" "${latestBinLogPath}"`);
        
        if (stdout && stdout.trim()) {
          console.log('✅ 找到今天的日誌記錄:');
          const lines = stdout.split('\n');
          lines.slice(0, 50).forEach(line => {
            if (line.trim()) {
              console.log(`  ${line}`);
            }
          });
          if (lines.length > 50) {
            console.log(`  ... 還有 ${lines.length - 50} 行記錄`);
          }
        } else {
          console.log('⚠️ 沒有找到今天的日誌記錄');
        }
        
      } catch (error) {
        console.log('❌ 無法讀取二進制日誌:', error.message);
      }
    }
    
    // 6. 提供恢復建議
    console.log('\n🛠️ 恢復建議:');
    
    if (binLogFiles.length > 0) {
      const latestBinLog = binLogFiles.sort().pop();
      console.log('1. 嘗試使用最新的二進制日誌恢復:');
      console.log(`   mysqlbinlog --start-datetime="2025-10-29 00:00:00" --stop-datetime="2025-10-29 23:59:59" "${dataDir}${latestBinLog}" | mysql -u root -p activity_reservation`);
      
      console.log('\n2. 如果沒有今天的記錄，嘗試恢復所有記錄:');
      console.log(`   mysqlbinlog "${dataDir}${latestBinLog}" | mysql -u root -p activity_reservation`);
      
      console.log('\n3. 檢查所有二進制日誌檔案:');
      binLogFiles.forEach(file => {
        console.log(`   mysqlbinlog "${dataDir}${file}" > ${file}.sql`);
      });
    }
    
    console.log('\n4. 如果二進制日誌沒有今天的記錄，可能需要:');
    console.log('   - 檢查 MySQL 設定檔中的 log-bin 設定');
    console.log('   - 重新建立資料庫結構');
    console.log('   - 從應用程式備份恢復資料');
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  }
}

checkAllLogs();
