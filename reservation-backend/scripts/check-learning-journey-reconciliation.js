/* eslint-disable no-console */
/**
 * 學習歷程資料對帳 CLI
 * 用法：node scripts/check-learning-journey-reconciliation.js 114-2
 *
 * exit code：
 *   0 — 無 section status === 'error'（warning 仍為 0）
 *   1 — 任一 section status === 'error'
 */
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const {
  getSemesterReconciliation,
  isValidSemesterId
} = require('../services/learningJourney/reconciliationService');

async function main() {
  const semesterId = process.argv[2] ? String(process.argv[2]).trim() : '';
  if (!semesterId) {
    console.error('請提供 semesterId，例如：node scripts/check-learning-journey-reconciliation.js 114-2');
    process.exit(1);
  }
  if (!isValidSemesterId(semesterId)) {
    console.error('semesterId 格式不正確（須如 114-2）');
    process.exit(1);
  }

  let data;
  try {
    data = await getSemesterReconciliation(semesterId);
  } catch (e) {
    console.error('[reconciliation] 執行失敗', e);
    process.exit(1);
  }

  console.log('semesterId:', data.semesterId);
  if (data.queryErrors && data.queryErrors.length) {
    console.log('queryErrors:', JSON.stringify(data.queryErrors, null, 2));
  }

  const sections = data.sections || [];
  let hasError = false;

  for (const s of sections) {
    console.log('\n---', s.key, '---');
    console.log('label:', s.label);
    console.log('status:', s.status);
    console.log('sourceCount:', s.sourceCount, 'aggregateCount:', s.aggregateCount, 'matchedCount:', s.matchedCount);
    if (s.sourceOnlyStudents && s.sourceOnlyStudents.length) {
      console.log('sourceOnly (first 20):', s.sourceOnlyStudents.slice(0, 20).join(', '));
    }
    if (s.aggregateOnlyStudents && s.aggregateOnlyStudents.length) {
      console.log('aggregateOnly (first 20):', s.aggregateOnlyStudents.slice(0, 20).join(', '));
    }
    const diffZero =
      (s.sourceOnlyStudents || []).length === 0 &&
      (s.aggregateOnlyStudents || []).length === 0 &&
      s.sourceCount === s.aggregateCount;
    if (diffZero) {
      console.log('=> 資料一致（本區塊）');
    }
    if (s.status === 'error') hasError = true;
  }

  process.exit(hasError ? 1 : 0);
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
