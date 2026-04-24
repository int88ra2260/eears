/* eslint-disable no-console */
/**
 * Learning Journey 第一批同步 CLI
 *
 * 範例：
 *   node scripts/sync-learning-journey.js --semesterId=114-2 --sections=roster,bestep_scores --dryRun
 *   node scripts/sync-learning-journey.js --semesterId=114-2 --sections=all --apply
 */
const path = require('path');

process.env.NODE_ENV = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const { runSync, normalizeSections } = require('../services/learningJourney/syncService');

function parseArg(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(prefix));
  if (!hit) return null;
  return hit.slice(prefix.length).trim();
}

function parseSectionsArg(raw) {
  if (!raw || raw.toLowerCase() === 'all') return ['all'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function main() {
  const semesterId = parseArg('semesterId') || '';
  const sectionsArg = parseArg('sections') || 'all';
  const argv = process.argv.slice(2);
  /** 未帶 --apply 時一律為 dry run（安全預設）；可另加 --dryRun 僅為語意明確。 */
  const dryRun = !argv.includes('--apply');

  if (!semesterId) {
    console.error('請提供 --semesterId=114-2');
    process.exit(1);
  }

  const sections = normalizeSections(parseSectionsArg(sectionsArg));
  console.log(JSON.stringify({ semesterId, sections, dryRun }, null, 2));

  let data;
  try {
    data = await runSync({ semesterId, sections, dryRun });
  } catch (e) {
    console.error('[sync] 執行失敗', e);
    process.exit(1);
  }

  if (data.error) {
    console.error('錯誤:', data.error);
    process.exit(1);
  }

  for (const key of Object.keys(data.results || {})) {
    const r = data.results[key];
    console.log('\n---', key, '---');
    console.log('inserted:', r.inserted, 'updated:', r.updated, 'skipped:', r.skipped);
    if (r.errors && r.errors.length) {
      console.log('errors:', JSON.stringify(r.errors, null, 2));
    }
  }

  await sequelize.close();
}

main().catch((e) => {
  console.error(e);
  sequelize.close().finally(() => process.exit(1));
});
