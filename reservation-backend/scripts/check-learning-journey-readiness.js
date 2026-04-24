/* eslint-disable no-console */
/**
 * Learning Journey readiness gate CLI
 *
 * 用法：
 *   node scripts/check-learning-journey-readiness.js --semesterId=114-1
 *
 * 輸出：
 * - reconciliation status
 * - summary compare status
 * - students compare status
 * - detail sample status
 * - final readiness status
 * - recommendation
 *
 * exit code：
 * - ready: 0
 * - not_ready: 0
 * - error: 1
 */
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const { getSemesterReadinessGate } = require('../services/learningJourney/readinessGateService');

function parseArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(prefix));
  if (!hit) return '';
  return hit.slice(prefix.length).trim();
}

function getCheckStatus(checks, key) {
  const row = (checks || []).find((c) => c && c.key === key);
  return row ? row.status : 'n/a';
}

function getCheckMessage(checks, key) {
  const row = (checks || []).find((c) => c && c.key === key);
  return row ? row.message : 'n/a';
}

async function main() {
  const semesterId = parseArg('semesterId');
  if (!semesterId) {
    console.error('請提供 --semesterId=114-1');
    process.exit(1);
  }

  let data;
  try {
    data = await getSemesterReadinessGate(semesterId);
  } catch (e) {
    console.error('[readiness] 執行失敗:', (e && e.message) || String(e));
    process.exit(1);
  }

  const checks = data.checks || [];
  console.log('semesterId:', data.semesterId);
  console.log('reconciliation status:', getCheckStatus(checks, 'reconciliation'));
  console.log('  message:', getCheckMessage(checks, 'reconciliation'));
  console.log('summary compare status:', getCheckStatus(checks, 'summary_compare'));
  console.log('  message:', getCheckMessage(checks, 'summary_compare'));
  console.log('students compare status:', getCheckStatus(checks, 'students_compare'));
  console.log('  message:', getCheckMessage(checks, 'students_compare'));
  console.log('detail sample status:', getCheckStatus(checks, 'detail_sample'));
  console.log('  message:', getCheckMessage(checks, 'detail_sample'));
  console.log('final readiness status:', data.status);
  console.log('recommendation:', data.recommendation || '');

  const exitCode = data.status === 'error' ? 1 : 0;
  process.exit(exitCode);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (_) {}
  });
