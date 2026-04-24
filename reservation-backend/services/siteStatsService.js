/**
 * 網站瀏覽計數（以 JSON 檔案儲存，不需資料庫）
 */
const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STATS_FILE = path.join(DATA_DIR, 'siteStats.json');

const DEFAULT_STATS = { totalViews: 0, date: '', dailyViews: 0 };

const TAIWAN_TZ = 'Asia/Taipei';

/** 取得台灣時區的今日日期 YYYY-MM-DD */
function getTodayDate() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TAIWAN_TZ });
}

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function readStats() {
  try {
    const raw = await fs.readFile(STATS_FILE, 'utf8');
    const data = JSON.parse(raw);
    return {
      totalViews: Number(data.totalViews) || 0,
      date: data.date || '',
      dailyViews: Number(data.dailyViews) || 0,
    };
  } catch (err) {
    if (err.code === 'ENOENT') return { ...DEFAULT_STATS };
    throw err;
  }
}

async function writeStats(stats) {
  await ensureDataDir();
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), 'utf8');
}

/**
 * 記錄一次瀏覽並回傳目前總人次與當日人次
 * @returns {{ total: number, today: number }}
 */
async function recordViewAndGet() {
  const today = getTodayDate();
  let stats = await readStats();

  if (stats.date !== today) {
    stats = { ...stats, date: today, dailyViews: 0 };
  }

  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.dailyViews = (stats.dailyViews || 0) + 1;

  await writeStats(stats);

  return { total: stats.totalViews, today: stats.dailyViews };
}

/**
 * 僅取得目前總人次與當日人次（不累加）
 * @returns {{ total: number, today: number }}
 */
async function getOnly() {
  const today = getTodayDate();
  const stats = await readStats();

  if (stats.date !== today) {
    return { total: stats.totalViews || 0, today: 0 };
  }

  return {
    total: stats.totalViews || 0,
    today: stats.dailyViews || 0,
  };
}

module.exports = { recordViewAndGet, getOnly };
