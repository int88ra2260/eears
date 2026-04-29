'use strict';

/**
 * Learning Journey V3：CEFR 正規化與 rank（A1=1 … C2=6）。
 */
const cefrRankMap = Object.freeze({
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6
});

const RANK_TO_CEFR = Object.freeze({
  1: 'A1',
  2: 'A2',
  3: 'B1',
  4: 'B2',
  5: 'C1',
  6: 'C2'
});

function stripNoise(value) {
  return String(value)
    .trim()
    .replace(/\s+/g, '')
    .replace(/＋/g, '+');
}

/**
 * 回傳標準 A1～C2，無法辨識則 null（會將 A1+、B2+ 等視為基底等級）。
 * @param {unknown} value
 * @returns {string|null}
 */
function normalizeCefr(value) {
  if (value == null || value === '') return null;
  let s = stripNoise(value).toUpperCase();
  if (!s) return null;
  s = s.replace(/\+$/, '');
  if (Object.prototype.hasOwnProperty.call(cefrRankMap, s)) return s;
  return null;
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function getCefrRank(value) {
  const lvl = normalizeCefr(value);
  if (!lvl) return null;
  return cefrRankMap[lvl];
}

/**
 * @param {number} rank
 * @returns {string|null}
 */
function getCefrFromRank(rank) {
  const n = Number(rank);
  if (!Number.isFinite(n) || n < 1 || n > 6) return null;
  return RANK_TO_CEFR[n] || null;
}

module.exports = {
  cefrRankMap,
  normalizeCefr,
  getCefrRank,
  getCefrFromRank
};
