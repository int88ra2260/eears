// scripts/verify-coverage.mjs
// 驗證測試覆蓋率是否達到門檻

import { readFileSync } from 'fs';
import { join } from 'path';

const COVERAGE_FILE = join(process.cwd(), 'coverage', 'coverage-summary.json');

const DEFAULT_THRESHOLDS = {
  lines: 70,
  branches: 70,
  functions: 70,
  statements: 70
};

// 解析命令列參數
const args = process.argv.slice(2);
const thresholds = { ...DEFAULT_THRESHOLDS };

args.forEach((arg, index) => {
  if (arg === '--lines' && args[index + 1]) {
    thresholds.lines = parseInt(args[index + 1], 10);
  } else if (arg === '--branches' && args[index + 1]) {
    thresholds.branches = parseInt(args[index + 1], 10);
  } else if (arg === '--functions' && args[index + 1]) {
    thresholds.functions = parseInt(args[index + 1], 10);
  } else if (arg === '--statements' && args[index + 1]) {
    thresholds.statements = parseInt(args[index + 1], 10);
  }
});

try {
  const coverageData = JSON.parse(readFileSync(COVERAGE_FILE, 'utf-8'));
  const total = coverageData.total;

  console.log('📊 測試覆蓋率檢查\n');
  console.log('要求門檻:');
  console.log(`  行數 (lines): ${thresholds.lines}%`);
  console.log(`  分支 (branches): ${thresholds.branches}%`);
  console.log(`  函數 (functions): ${thresholds.functions}%`);
  console.log(`  語句 (statements): ${thresholds.statements}%\n`);

  console.log('實際覆蓋率:');
  console.log(`  行數 (lines): ${total.lines.pct}%`);
  console.log(`  分支 (branches): ${total.branches.pct}%`);
  console.log(`  函數 (functions): ${total.functions.pct}%`);
  console.log(`  語句 (statements): ${total.statements.pct}%\n`);

  const failures = [];

  if (total.lines.pct < thresholds.lines) {
    failures.push(`行數覆蓋率 ${total.lines.pct}% < ${thresholds.lines}%`);
  }
  if (total.branches.pct < thresholds.branches) {
    failures.push(`分支覆蓋率 ${total.branches.pct}% < ${thresholds.branches}%`);
  }
  if (total.functions.pct < thresholds.functions) {
    failures.push(`函數覆蓋率 ${total.functions.pct}% < ${thresholds.functions}%`);
  }
  if (total.statements.pct < thresholds.statements) {
    failures.push(`語句覆蓋率 ${total.statements.pct}% < ${thresholds.statements}%`);
  }

  if (failures.length > 0) {
    console.log('❌ 覆蓋率未達門檻:\n');
    failures.forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  } else {
    console.log('✅ 所有覆蓋率門檻已達成！');
    process.exit(0);
  }
} catch (error) {
  console.error('❌ 無法讀取覆蓋率報告:', error.message);
  console.error('請先執行: npm run test:coverage');
  process.exit(1);
}

