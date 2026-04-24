// scripts/backup-database.js
// 資料庫備份腳本

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { sequelize } = require('../models');

const execAsync = promisify(exec);

// 備份路徑
const BACKUP_DIR = 'G:\\資料夾備份';

// 資料庫配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'activity_reservation'
};

/**
 * 使用 Node.js 直接備份資料庫（備用方案）
 */
async function backupDatabaseWithNode() {
  try {
    console.log('📦 使用 Node.js 直接備份資料庫...\n');

    // 取得所有資料表
    const tables = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = :database
      ORDER BY TABLE_NAME
    `, {
      replacements: { database: DB_CONFIG.database },
      type: sequelize.QueryTypes.SELECT
    });

    let backupContent = `-- 資料庫備份
-- 資料庫: ${DB_CONFIG.database}
-- 備份時間: ${new Date().toLocaleString('zh-TW')}
-- 備份方式: Node.js 直接備份

SET FOREIGN_KEY_CHECKS=0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

`;

    // 備份每個資料表
    for (const table of tables) {
      const tableName = table.TABLE_NAME;
      console.log(`  📋 備份資料表: ${tableName}`);

      // 取得資料表結構
      const createTableResult = await sequelize.query(`SHOW CREATE TABLE \`${tableName}\``, {
        type: sequelize.QueryTypes.SELECT
      });
      backupContent += `\n-- 資料表結構: ${tableName}\n`;
      backupContent += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      backupContent += createTableResult[0]['Create Table'] + ';\n\n';

      // 取得資料
      const rows = await sequelize.query(`SELECT * FROM \`${tableName}\``, {
        type: sequelize.QueryTypes.SELECT
      });
      
      if (rows.length > 0) {
        backupContent += `-- 資料表資料: ${tableName}\n`;
        backupContent += `INSERT INTO \`${tableName}\` VALUES\n`;

        const values = rows.map(row => {
          const rowValues = Object.values(row).map(val => {
            if (val === null) return 'NULL';
            if (typeof val === 'string') {
              return `'${val.replace(/'/g, "''")}'`;
            }
            return val;
          });
          return `(${rowValues.join(', ')})`;
        });

        backupContent += values.join(',\n') + ';\n\n';
      } else {
        backupContent += `-- 資料表 ${tableName} 無資料\n\n`;
      }
    }

    backupContent += `SET FOREIGN_KEY_CHECKS=1;\n`;

    return backupContent;
  } catch (error) {
    throw new Error(`Node.js 備份失敗: ${error.message}`);
  }
}

async function backupDatabase() {
  try {
    console.log('🗄️  開始備份資料庫...\n');

    // 檢查備份目錄是否存在，不存在則創建
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log(`📁 創建備份目錄: ${BACKUP_DIR}`);
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 生成備份檔案名稱（包含日期時間）
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
    const timestamp = `${dateStr}_${timeStr}`;
    const backupFileName = `activity_reservation_backup_${timestamp}.sql`;
    const backupFilePath = path.join(BACKUP_DIR, backupFileName);

    console.log(`📊 資料庫: ${DB_CONFIG.database}`);
    console.log(`📁 備份路徑: ${backupFilePath}\n`);

    let backupSuccess = false;
    let backupContent = '';

    // 嘗試使用 mysqldump
    try {
      console.log('🔄 嘗試使用 mysqldump 備份...');

      // 構建 mysqldump 命令
      // 使用環境變數來傳遞密碼，更安全
      const env = {
        ...process.env,
        MYSQL_PWD: DB_CONFIG.password
      };
      
      // 構建命令（不使用 --password 參數，改用環境變數）
      const mysqldumpCmd = `mysqldump -h ${DB_CONFIG.host} -P ${DB_CONFIG.port} -u ${DB_CONFIG.user} --single-transaction --routines --triggers ${DB_CONFIG.database}`;

      console.log('⏳ 正在備份資料庫...');
      
      // 執行備份命令並將輸出寫入檔案
      const { stdout, stderr } = await execAsync(mysqldumpCmd, {
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        shell: true,
        env: env,
        encoding: 'utf8'
      });

      // 將輸出寫入備份檔案
      backupContent = stdout;
      backupSuccess = true;

      // 檢查 stderr（mysqldump 的警告通常輸出到 stderr，但不一定是錯誤）
      if (stderr) {
        // 過濾掉常見的警告訊息
        const warnings = stderr.split('\n').filter(line => 
          line.trim() && 
          !line.includes('Using a password on the command line') &&
          !line.includes('Warning')
        );
        
        if (warnings.length > 0) {
          console.warn('⚠️  警告:', warnings.join('\n'));
        }
      }
      
      console.log('✅ mysqldump 備份成功');
    } catch (mysqldumpError) {
      console.log('⚠️  mysqldump 備份失敗，嘗試使用 Node.js 直接備份...');
      console.log(`   錯誤: ${mysqldumpError.message}`);
      
      // 使用 Node.js 直接備份
      try {
        backupContent = await backupDatabaseWithNode();
        backupSuccess = true;
        console.log('✅ Node.js 備份成功');
      } catch (nodeError) {
        throw new Error(`所有備份方式都失敗了。最後錯誤: ${nodeError.message}`);
      }
    }

    // 將備份內容寫入檔案
    if (backupSuccess && backupContent) {
      fs.writeFileSync(backupFilePath, backupContent, 'utf8');
    }

    // 檢查備份檔案是否成功創建
    if (fs.existsSync(backupFilePath)) {
      const stats = fs.statSync(backupFilePath);
      const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      
      console.log(`✅ 備份完成！`);
      console.log(`📄 檔案名稱: ${backupFileName}`);
      console.log(`📦 檔案大小: ${fileSizeMB} MB`);
      console.log(`📅 備份時間: ${now.toLocaleString('zh-TW')}`);
      console.log(`\n💾 備份位置: ${backupFilePath}`);

      // 創建備份資訊檔案
      const infoFileName = `backup_info_${timestamp}.txt`;
      const infoFilePath = path.join(BACKUP_DIR, infoFileName);
      const infoContent = `資料庫備份資訊
==================
備份時間: ${now.toLocaleString('zh-TW')}
資料庫名稱: ${DB_CONFIG.database}
資料庫主機: ${DB_CONFIG.host}:${DB_CONFIG.port}
備份檔案: ${backupFileName}
檔案大小: ${fileSizeMB} MB
備份路徑: ${backupFilePath}
`;

      fs.writeFileSync(infoFilePath, infoContent, 'utf8');
      console.log(`📝 備份資訊已保存: ${infoFileName}`);

      // 列出備份目錄中的所有備份檔案
      console.log('\n📋 備份目錄中的檔案:');
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.startsWith('activity_reservation_backup_'))
        .sort()
        .reverse(); // 最新的在前
      
      if (files.length > 0) {
        console.log(`   共 ${files.length} 個備份檔案`);
        files.slice(0, 5).forEach((file, index) => {
          const filePath = path.join(BACKUP_DIR, file);
          const fileStats = fs.statSync(filePath);
          const sizeMB = (fileStats.size / (1024 * 1024)).toFixed(2);
          const modified = fileStats.mtime.toLocaleString('zh-TW');
          console.log(`   ${index + 1}. ${file} (${sizeMB} MB, ${modified})`);
        });
        if (files.length > 5) {
          console.log(`   ... 還有 ${files.length - 5} 個備份檔案`);
        }
      }

    } else {
      throw new Error('備份檔案未成功創建');
    }

    console.log('\n✅ 備份流程完成！');

  } catch (error) {
    console.error('\n❌ 備份失敗:', error.message);
    
    // 提供更詳細的錯誤資訊
    if (error.message.includes('mysqldump')) {
      console.error('\n💡 可能的解決方案:');
      console.error('   1. 確認 MySQL 已安裝並在 PATH 中');
      console.error('   2. 確認資料庫連線資訊正確');
      console.error('   3. 確認有備份權限');
      console.error('   4. 確認備份路徑可寫入');
    }
    
    process.exit(1);
  }
}

// 執行備份
backupDatabase().then(() => {
  sequelize.close();
}).catch((error) => {
  console.error('未預期的錯誤:', error);
  sequelize.close();
  process.exit(1);
});

