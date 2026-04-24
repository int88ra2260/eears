#!/usr/bin/env node
// scripts/security-test.js
// 安全性測試腳本

const request = require('supertest');
const app = require('../server');

// 測試配置
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3000',
  timeout: 10000,
  retries: 3
};

// 測試結果統計
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// 測試輔助函數
function logTest(name, passed, details = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: ${details}`);
  }
  testResults.details.push({ name, passed, details });
}

// 等待函數
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 安全性測試
async function runSecurityTests() {
  console.log('🔒 開始安全性測試...\n');

  // 1. 安全標頭測試
  try {
    const response = await request(app).get('/api/events');
    const hasSecurityHeaders = 
      response.headers['x-content-type-options'] === 'nosniff' &&
      response.headers['x-frame-options'] === 'DENY' &&
      response.headers['x-xss-protection'] === '1; mode=block';
    
    logTest('安全標頭設定', hasSecurityHeaders, 
      hasSecurityHeaders ? '' : '缺少必要的安全標頭');
  } catch (error) {
    logTest('安全標頭設定', false, error.message);
  }

  // 2. 登入限流測試
  try {
    const loginAttempts = [];
    for (let i = 0; i < 6; i++) {
      const response = await request(app)
        .post('/api/login')
        .send({ username: 'invalid', password: 'invalid' });
      loginAttempts.push(response.status);
      await wait(100); // 避免請求過快
    }
    
    const isRateLimited = loginAttempts[5] === 429;
    logTest('登入限流功能', isRateLimited,
      isRateLimited ? '' : '第6次請求未被限流');
  } catch (error) {
    logTest('登入限流功能', false, error.message);
  }

  // 3. 輸入清理測試
  try {
    const maliciousInput = '<script>alert("xss")</script>';
    const response = await request(app)
      .post('/api/login')
      .send({
        username: maliciousInput,
        password: maliciousInput
      });
    
    const isSanitized = response.status === 400 || response.status === 401;
    logTest('輸入清理功能', isSanitized,
      isSanitized ? '' : '惡意輸入未被正確處理');
  } catch (error) {
    logTest('輸入清理功能', false, error.message);
  }

  // 4. SQL 注入防護測試
  try {
    const sqlInjection = "'; DROP TABLE Users; --";
    const response = await request(app)
      .post('/api/login')
      .send({
        username: sqlInjection,
        password: sqlInjection
      });
    
    const isProtected = response.status === 400 || response.status === 401;
    logTest('SQL 注入防護', isProtected,
      isProtected ? '' : 'SQL 注入攻擊未被正確防護');
  } catch (error) {
    logTest('SQL 注入防護', false, error.message);
  }

  // 5. CORS 配置測試
  try {
    const response = await request(app)
      .get('/api/events')
      .set('Origin', 'http://localhost:3000');
    
    const hasCorsHeaders = response.headers['access-control-allow-origin'];
    logTest('CORS 配置', !!hasCorsHeaders,
      hasCorsHeaders ? '' : '缺少 CORS 標頭');
  } catch (error) {
    logTest('CORS 配置', false, error.message);
  }

  // 6. 錯誤資訊洩露測試
  try {
    const response = await request(app).get('/api/nonexistent');
    
    const noSensitiveInfo = 
      !response.body.stack && 
      !response.body.details &&
      !response.body.sql;
    
    logTest('錯誤資訊保護', noSensitiveInfo,
      noSensitiveInfo ? '' : '錯誤回應包含敏感資訊');
  } catch (error) {
    logTest('錯誤資訊保護', false, error.message);
  }

  // 7. JWT Token 安全性測試
  try {
    const response = await request(app)
      .post('/api/login')
      .send({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin'
      });
    
    if (response.status === 200 && response.body.token) {
      const token = response.body.token;
      const parts = token.split('.');
      const isJWTFormat = parts.length === 3;
      
      logTest('JWT Token 格式', isJWTFormat,
        isJWTFormat ? '' : 'JWT Token 格式不正確');
    } else {
      logTest('JWT Token 格式', false, '無法獲取有效的 JWT Token');
    }
  } catch (error) {
    logTest('JWT Token 格式', false, error.message);
  }

  // 8. API 限流測試
  try {
    const requests = [];
    for (let i = 0; i < 105; i++) {
      const response = await request(app).get('/api/events');
      requests.push(response.status);
      if (i % 20 === 0) await wait(100); // 每20個請求暫停一下
    }
    
    const isRateLimited = requests.some(status => status === 429);
    logTest('API 限流功能', isRateLimited,
      isRateLimited ? '' : 'API 請求未被限流');
  } catch (error) {
    logTest('API 限流功能', false, error.message);
  }

  // 9. 環境變數檢查
  try {
    const requiredEnvVars = [
      'JWT_SECRET',
      'ADMIN_USERNAME',
      'ADMIN_PASSWORD',
      'WORKER_USERNAME',
      'WORKER_PASSWORD'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const allEnvVarsSet = missingVars.length === 0;
    
    logTest('環境變數配置', allEnvVarsSet,
      allEnvVarsSet ? '' : `缺少環境變數: ${missingVars.join(', ')}`);
  } catch (error) {
    logTest('環境變數配置', false, error.message);
  }

  // 10. 密碼強度檢查
  try {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    const adminPasswordStrong = process.env.ADMIN_PASSWORD ? 
      passwordRegex.test(process.env.ADMIN_PASSWORD) : false;
    const workerPasswordStrong = process.env.WORKER_PASSWORD ? 
      passwordRegex.test(process.env.WORKER_PASSWORD) : false;
    
    const passwordsStrong = adminPasswordStrong && workerPasswordStrong;
    
    logTest('密碼強度檢查', passwordsStrong,
      passwordsStrong ? '' : '管理員或工讀生密碼強度不足');
  } catch (error) {
    logTest('密碼強度檢查', false, error.message);
  }

  // 輸出測試結果
  console.log('\n📊 測試結果摘要:');
  console.log(`總測試數: ${testResults.total}`);
  console.log(`通過: ${testResults.passed}`);
  console.log(`失敗: ${testResults.failed}`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

  if (testResults.failed > 0) {
    console.log('\n❌ 失敗的測試:');
    testResults.details
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`  - ${test.name}: ${test.details}`);
      });
  }

  // 返回測試結果
  return testResults.failed === 0;
}

// 主函數
async function main() {
  try {
    console.log('🚀 啟動安全性測試...\n');
    
    const allTestsPassed = await runSecurityTests();
    
    if (allTestsPassed) {
      console.log('\n🎉 所有安全性測試通過！');
      process.exit(0);
    } else {
      console.log('\n⚠️  部分安全性測試失敗，請檢查上述問題。');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 測試執行失敗:', error.message);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = { runSecurityTests };
