// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
// 使用固定的 CEFR 等級排序（含 +），確保報表/重算邏輯一致
// 需求排序：A1 < A1+ < A2 < A2+ < B1 < B1+ < B2 < B2+ < C1 < C1+ < C2 < C2+
const CEFR_ORDER = ['A1', 'A1+', 'A2', 'A2+', 'B1', 'B1+', 'B2', 'B2+', 'C1', 'C1+', 'C2', 'C2+'];

const FALLBACK_RANK = (() => {
  const m = {};
  CEFR_ORDER.forEach((lvl, idx) => { m[lvl] = idx + 1; });
  return m;
})();

let rankMapCache = null;

/**
 * 取得 CEFR level -> rank 對照（快取）
 * @returns {Promise<Record<string, number>>}
 */
async function getCefrRankMap() {
  if (rankMapCache) return rankMapCache;
  // 從需求直接建立 rankMap（不依賴 DB et_cefr_levels 的 rank），避免 + 版本被壓成相同等級
  rankMapCache = { ...FALLBACK_RANK };
  return rankMapCache;
}

/**
 * 取得單一 level 的 rank，null 視為最低（0）
 * @param {string|null} level
 * @param {Record<string, number>} [rankMap]
 * @returns {number}
 */
function getRankForLevel(level, rankMap = null) {
  if (level == null || level === '') return 0;
  const map = rankMap || FALLBACK_RANK;
  const normalized = String(level)
    .trim()
    .replace(/＋/g, '+') // full-width plus -> ascii plus
    .replace(/\s+/g, '') // remove spaces
    .toUpperCase();
  return map[normalized] ?? 0;
}

function clearCache() {
  rankMapCache = null;
}

module.exports = {
  getCefrRankMap,
  getRankForLevel,
  clearCache,
  FALLBACK_RANK
};
