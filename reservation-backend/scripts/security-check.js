// scripts/security-check.js
// 資安配置檢查腳本

require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkMark(passed) {
  return passed ? '✅' : '❌';
}

// 檢查項目
const checks = [];

// 1. 檢查 JWT_SECRET
function checkJWTSecret() {
  const secret = process.env.JWT_SECRET;
  const passed = secret && secret.length >= 32 && /[A-Z]/.test(secret) && /[a-z]/.test(secret) && /[0-9]/.test(secret);
  
  checks.push({
    name: 'JWT_SECRET 配置',
    passed,
    message: passed 
      ? `JWT_SECRET 已設定且強度足夠（${secret.length} 字元）`
      : 'JWT_SECRET 未設定或強度不足（需要至少 32 字元，包含大小寫、數字、特殊字符）'
  });
}

// 2. 檢查 CORS 配置
function checkCORS() {
  const origins = process.env.CORS_ALLOWED_ORIGINS;
  const passed = origins && origins.length > 0;
  
  checks.push({
    name: 'CORS 配置',
    passed,
    message: passed
      ? `CORS 已設定允許的來源：${origins}`
      : 'CORS_ALLOWED_ORIGINS 未設定，將使用預設值（僅 localhost）'
  });
}

// 3. 檢查環境變數文件保護
function checkEnvFileProtection() {
  const gitignorePath = path.join(__dirname, '../.gitignore');
  let passed = false;
  let message = '';
  
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    if (gitignoreContent.includes('.env') && !gitignoreContent.includes('!.env.example')) {
      message = '.env 在 .gitignore 中，但缺少 !.env.example';
      passed = false;
    } else if (gitignoreContent.includes('.env')) {
      message = '.env 已在 .gitignore 中';
      passed = true;
    } else {
      message = '.env 未在 .gitignore 中！';
      passed = false;
    }
  } else {
    message = '.gitignore 文件不存在！';
    passed = false;
  }
  
  checks.push({
    name: '環境變數文件保護',
    passed,
    message
  });
}

// 4. 檢查 NODE_ENV
function checkNodeEnv() {
  const nodeEnv = process.env.NODE_ENV;
  const passed = nodeEnv === 'production' || nodeEnv === 'development';
  
  checks.push({
    name: 'NODE_ENV 配置',
    passed,
    message: passed
      ? `NODE_ENV 已設定：${nodeEnv}`
      : 'NODE_ENV 未設定或值不正確（應為 production 或 development）'
  });
}

// 5. 檢查資料庫密碼
function checkDatabasePassword() {
  const dbPassword = process.env.DB_PASSWORD;
  const passed = dbPassword && dbPassword.length >= 8;
  
  checks.push({
    name: '資料庫密碼強度',
    passed,
    message: passed
      ? '資料庫密碼已設定且長度足夠'
      : 'DB_PASSWORD 未設定或長度不足（建議至少 8 字元）'
  });
}

// 6. 檢查依賴項安全
function checkDependencies() {
  const packageJsonPath = path.join(__dirname, '../package.json');
  let passed = true;
  let message = '依賴項檢查';
  
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // 檢查關鍵安全依賴
    const requiredSecurityDeps = ['helmet', 'express-rate-limit'];
    const missingDeps = requiredSecurityDeps.filter(dep => !dependencies[dep]);
    
    if (missingDeps.length > 0) {
      passed = false;
      message = `缺少安全依賴：${missingDeps.join(', ')}`;
    } else {
      message = '關鍵安全依賴已安裝';
    }
  }
  
  checks.push({
    name: '安全依賴項',
    passed,
    message
  });
}

// 7. 檢查 Rate Limiting 配置
function checkRateLimit() {
  const generalMax = process.env.RATE_LIMIT_GENERAL_MAX;
  const loginMax = process.env.RATE_LIMIT_LOGIN_MAX;
  const passed = generalMax && loginMax;
  
  checks.push({
    name: 'Rate Limiting 配置',
    passed,
    message: passed
      ? `Rate Limiting 已配置（一般：${generalMax}/分鐘，登入：${loginMax}/15分鐘）`
      : 'Rate Limiting 環境變數未設定，將使用預設值'
  });
}

// 執行所有檢查
function runChecks() {
  log('\n🔒 資安配置檢查\n', 'cyan');
  
  checkJWTSecret();
  checkCORS();
  checkEnvFileProtection();
  checkNodeEnv();
  checkDatabasePassword();
  checkDependencies();
  checkRateLimit();
  
  // 顯示結果
  let passedCount = 0;
  let failedCount = 0;
  
  checks.forEach(check => {
    const icon = checkMark(check.passed);
    const color = check.passed ? 'green' : 'red';
    log(`${icon} ${check.name}: ${check.message}`, color);
    
    if (check.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });
  
  // 總結
  log('\n📊 檢查結果：', 'cyan');
  log(`   ✅ 通過：${passedCount}`, 'green');
  log(`   ❌ 失敗：${failedCount}`, failedCount > 0 ? 'red' : 'green');
  
  if (failedCount > 0) {
    log('\n⚠️  請修復上述問題後再部署到生產環境！', 'yellow');
    process.exit(1);
  } else {
    log('\n✅ 所有資安檢查通過！', 'green');
    process.exit(0);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  runChecks();
}

module.exports = { runChecks };
