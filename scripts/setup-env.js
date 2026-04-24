#!/usr/bin/env node
// scripts/setup-env.js
// 環境變數設定輔助腳本

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 生成隨機密碼
function generatePassword(length = 16) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@$!%*?&';
  let password = '';
  
  // 確保包含各種字元類型
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // 大寫字母
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // 小寫字母
  password += '0123456789'[Math.floor(Math.random() * 10)]; // 數字
  password += '@$!%*?&'[Math.floor(Math.random() * 7)]; // 特殊字元
  
  // 填充剩餘長度
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // 打亂順序
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// 生成 JWT 密鑰
function generateJWTSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// 驗證密碼強度
function validatePassword(password) {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return regex.test(password);
}

// 讀取使用者輸入
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// 主設定函數
async function setupEnvironment() {
  colorLog('cyan', '🔧 環境變數設定輔助工具\n');

  const envPath = path.join(__dirname, '..', '.env');
  const examplePath = path.join(__dirname, '..', 'env.example');

  // 檢查是否已存在 .env 檔案
  if (fs.existsSync(envPath)) {
    const overwrite = await askQuestion('⚠️  .env 檔案已存在，是否要覆蓋？ (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      colorLog('yellow', '設定已取消。');
      return;
    }
  }

  colorLog('blue', '請提供以下配置資訊 (按 Enter 使用預設值):\n');

  // 資料庫配置
  colorLog('magenta', '📊 資料庫配置:');
  const dbHost = await askQuestion('資料庫主機 (localhost): ') || 'localhost';
  const dbPort = await askQuestion('資料庫埠號 (3306): ') || '3306';
  const dbName = await askQuestion('資料庫名稱 (activity_reservation): ') || 'activity_reservation';
  const dbUser = await askQuestion('資料庫使用者 (root): ') || 'root';
  const dbPassword = await askQuestion('資料庫密碼: ');

  // JWT 配置
  colorLog('magenta', '\n🔐 JWT 配置:');
  const jwtSecret = await askQuestion('JWT 密鑰 (自動生成): ') || generateJWTSecret();
  const jwtExpiresIn = await askQuestion('Token 過期時間 (1h): ') || '1h';

  // 管理員帳號
  colorLog('magenta', '\n👤 管理員帳號:');
  const adminUsername = await askQuestion('管理員使用者名稱 (admin): ') || 'admin';
  let adminPassword = await askQuestion('管理員密碼 (自動生成): ');
  if (!adminPassword) {
    adminPassword = generatePassword(16);
    colorLog('green', `✅ 已生成管理員密碼: ${adminPassword}`);
  } else if (!validatePassword(adminPassword)) {
    colorLog('red', '⚠️  密碼強度不足，建議包含大小寫字母、數字和特殊字元');
  }

  // 工讀生帳號
  colorLog('magenta', '\n👷 工讀生帳號:');
  const workerUsername = await askQuestion('工讀生使用者名稱 (worker): ') || 'worker';
  let workerPassword = await askQuestion('工讀生密碼 (自動生成): ');
  if (!workerPassword) {
    workerPassword = generatePassword(16);
    colorLog('green', `✅ 已生成工讀生密碼: ${workerPassword}`);
  } else if (!validatePassword(workerPassword)) {
    colorLog('red', '⚠️  密碼強度不足，建議包含大小寫字母、數字和特殊字元');
  }

  // Email 配置
  colorLog('magenta', '\n📧 Email 配置:');
  const gmailUser = await askQuestion('Gmail 帳號: ');
  const gmailPass = await askQuestion('Gmail 應用程式密碼: ');

  // 伺服器配置
  colorLog('magenta', '\n🖥️  伺服器配置:');
  const port = await askQuestion('伺服器埠號 (3000): ') || '3000';
  const nodeEnv = await askQuestion('環境模式 (development): ') || 'development';
  const corsOrigin = await askQuestion('CORS 來源 (http://localhost:3000): ') || 'http://localhost:3000';

  // 生成 .env 檔案內容
  const envContent = `# 資料庫配置
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_NAME=${dbName}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}

# JWT 配置
JWT_SECRET=${jwtSecret}
JWT_EXPIRES_IN=${jwtExpiresIn}

# Email 配置
GMAIL_USER=${gmailUser}
GMAIL_PASS=${gmailPass}

# 管理員帳號
ADMIN_USERNAME=${adminUsername}
ADMIN_PASSWORD=${adminPassword}

# 工讀生帳號
WORKER_USERNAME=${workerUsername}
WORKER_PASSWORD=${workerPassword}

# 伺服器配置
PORT=${port}
NODE_ENV=${nodeEnv}

# 安全配置
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS 配置
CORS_ORIGIN=${corsOrigin}

# 日誌配置
LOG_LEVEL=info
LOG_FILE=logs/app.log

# 備份配置
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
`;

  // 寫入 .env 檔案
  try {
    fs.writeFileSync(envPath, envContent);
    colorLog('green', '\n✅ .env 檔案已成功建立！');
    
    // 顯示重要資訊
    colorLog('yellow', '\n📋 重要資訊:');
    colorLog('yellow', `管理員帳號: ${adminUsername}`);
    colorLog('yellow', `管理員密碼: ${adminPassword}`);
    colorLog('yellow', `工讀生帳號: ${workerUsername}`);
    colorLog('yellow', `工讀生密碼: ${workerPassword}`);
    colorLog('yellow', `JWT 密鑰: ${jwtSecret.substring(0, 8)}...`);
    
    colorLog('red', '\n⚠️  請妥善保存這些資訊，並確保 .env 檔案不會被提交到版本控制系統！');
    
  } catch (error) {
    colorLog('red', `❌ 建立 .env 檔案失敗: ${error.message}`);
    process.exit(1);
  }
}

// 驗證環境變數
async function validateEnvironment() {
  colorLog('cyan', '🔍 環境變數驗證\n');

  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(envPath)) {
    colorLog('red', '❌ .env 檔案不存在，請先執行設定。');
    return false;
  }

  // 載入環境變數
  require('dotenv').config({ path: envPath });

  const requiredVars = [
    'JWT_SECRET',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD',
    'WORKER_USERNAME',
    'WORKER_PASSWORD'
  ];

  let allValid = true;

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      colorLog('red', `❌ 缺少環境變數: ${varName}`);
      allValid = false;
    } else {
      colorLog('green', `✅ ${varName}: 已設定`);
    }
  }

  // 驗證 JWT 密鑰長度
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    colorLog('red', '❌ JWT_SECRET 長度不足 (至少需要 32 個字元)');
    allValid = false;
  }

  // 驗證密碼強度
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  
  if (process.env.ADMIN_PASSWORD && !passwordRegex.test(process.env.ADMIN_PASSWORD)) {
    colorLog('yellow', '⚠️  管理員密碼強度不足');
  }
  
  if (process.env.WORKER_PASSWORD && !passwordRegex.test(process.env.WORKER_PASSWORD)) {
    colorLog('yellow', '⚠️  工讀生密碼強度不足');
  }

  if (allValid) {
    colorLog('green', '\n🎉 所有環境變數驗證通過！');
  } else {
    colorLog('red', '\n❌ 環境變數驗證失敗，請檢查上述問題。');
  }

  return allValid;
}

// 主函數
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate') || args.includes('-v')) {
    await validateEnvironment();
  } else if (args.includes('--help') || args.includes('-h')) {
    colorLog('cyan', '🔧 環境變數設定輔助工具\n');
    colorLog('blue', '用法:');
    colorLog('blue', '  node setup-env.js          # 互動式設定環境變數');
    colorLog('blue', '  node setup-env.js --validate # 驗證環境變數');
    colorLog('blue', '  node setup-env.js --help    # 顯示此說明\n');
  } else {
    await setupEnvironment();
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main().catch(error => {
    colorLog('red', `💥 執行失敗: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { setupEnvironment, validateEnvironment };
