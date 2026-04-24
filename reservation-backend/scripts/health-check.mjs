// scripts/health-check.mjs
// 一鍵健康檢查腳本（整合所有驗證步驟）

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`🔍 ${description}`, 'blue');
  log('='.repeat(60), 'blue');
  
  try {
    execSync(command, { stdio: 'inherit', encoding: 'utf-8' });
    log(`✅ ${description} - 通過`, 'green');
    return true;
  } catch (error) {
    log(`❌ ${description} - 失敗`, 'red');
    return false;
  }
}

async function main() {
  log('\n🚀 開始執行一鍵健康檢查...\n', 'blue');

  const results = {
    lint: false,
    tests: false,
    coverage: false,
    postDeploy: false,
    basepath: false
  };

  // 1. Lint 檢查
  results.lint = runCommand('npm run lint', 'Lint 檢查');

  // 2. 執行測試
  results.tests = runCommand('npm test -- --watch=false', '單元測試');

  // 3. 覆蓋率檢查
  if (results.tests) {
    log('\n📊 產生覆蓋率報告...', 'yellow');
    try {
      execSync('npm run test:coverage', { stdio: 'inherit', encoding: 'utf-8' });
      
      // 驗證覆蓋率
      const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (existsSync(coveragePath)) {
        results.coverage = runCommand(
          'node scripts/verify-coverage.mjs --lines 70 --branches 70 --functions 70 --statements 70',
          '覆蓋率驗證'
        );
      } else {
        log('⚠️  覆蓋率報告檔案不存在', 'yellow');
      }
    } catch (error) {
      log('⚠️  覆蓋率檢查失敗', 'yellow');
    }
  }

  // 4. BasePath 驗證
  results.basepath = runCommand('node scripts/verify-basepath.mjs /EEARS', 'BasePath 驗證');

  // 5. 部署後檢查（需要後端服務運行）
  log('\n⚠️  部署後檢查需要後端服務運行中', 'yellow');
  log('   請手動執行: npm run post-deploy-check', 'yellow');
  // results.postDeploy = runCommand('npm run post-deploy-check', '部署後檢查');

  // 總結
  log('\n' + '='.repeat(60), 'blue');
  log('📋 檢查摘要', 'blue');
  log('='.repeat(60), 'blue');
  
  const totalChecks = Object.keys(results).length;
  const passedChecks = Object.values(results).filter(r => r).length;
  
  Object.entries(results).forEach(([key, value]) => {
    const status = value ? '✅' : '❌';
    log(`${status} ${key}: ${value ? '通過' : '失敗'}`);
  });

  log(`\n總計: ${passedChecks}/${totalChecks} 通過`, passedChecks === totalChecks ? 'green' : 'yellow');

  if (passedChecks === totalChecks) {
    log('\n🎉 所有檢查項目通過！系統準備就緒。', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  有檢查項目失敗，請檢視上方錯誤訊息並修復問題。', 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ 執行健康檢查時發生錯誤: ${error.message}`, 'red');
  process.exit(1);
});

