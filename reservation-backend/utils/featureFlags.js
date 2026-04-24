// utils/featureFlags.js
// Feature Flags 系統 - 用於功能開關與回滾策略

const { Settings } = require('../models');

// 預設 Feature Flags（可從資料庫或環境變數讀取）
const DEFAULT_FLAGS = {
  SURVEY_GATE_ENABLED: process.env.FEATURE_SURVEY_GATE !== 'false',
  EMAIL_NOTIFICATION_ENABLED: process.env.FEATURE_EMAIL_NOTIFICATION !== 'false',
  NO_SHOW_AUTO_MARK_ENABLED: process.env.FEATURE_NO_SHOW_AUTO_MARK !== 'false',
  BLACKLIST_MODAL_ENABLED: process.env.FEATURE_BLACKLIST_MODAL !== 'false',
  CLASS_OVERVIEW_EXPORT_ENABLED: process.env.FEATURE_CLASS_EXPORT !== 'false',
  RESERVATION_SORT_SEARCH_ENABLED: process.env.FEATURE_RESERVATION_SORT !== 'false',
  // 培力英檢管理頁面增強功能
  ENGLISH_TEST_ENHANCED_UI: process.env.FEATURE_ENGLISH_TEST_ENHANCED_UI === 'true', // 預設 false
  ENGLISH_TEST_BULK_OPERATIONS: process.env.FEATURE_ENGLISH_TEST_BULK_OPERATIONS === 'true' // 預設 false
};

// 快取 Feature Flags（避免頻繁查詢資料庫）
let flagsCache = { ...DEFAULT_FLAGS };
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 分鐘

/**
 * 取得 Feature Flag 值
 * @param {string} flagName - Feature Flag 名稱
 * @param {boolean} defaultValue - 預設值
 * @returns {Promise<boolean>}
 */
async function getFeatureFlag(flagName, defaultValue = false) {
  // 檢查快取是否有效
  const now = Date.now();
  if (now - cacheTimestamp < CACHE_TTL && flagsCache.hasOwnProperty(flagName)) {
    return flagsCache[flagName];
  }

  try {
    // 嘗試從資料庫讀取（使用 Settings 模型的 key-value 結構）
    const setting = await Settings.findOne({
      where: { key: `feature_flag_${flagName}` }
    });

    if (setting) {
      flagsCache[flagName] = setting.value === 'true' || setting.value === true;
    } else {
      // 使用預設值
      flagsCache[flagName] = DEFAULT_FLAGS[flagName] ?? defaultValue;
    }

    cacheTimestamp = now;
    return flagsCache[flagName];
  } catch (error) {
    console.warn(`無法讀取 Feature Flag ${flagName}, 使用預設值:`, error.message);
    return DEFAULT_FLAGS[flagName] ?? defaultValue;
  }
}

/**
 * 設定 Feature Flag（管理員專用）
 * @param {string} flagName - Feature Flag 名稱
 * @param {boolean} value - 值
 */
async function setFeatureFlag(flagName, value) {
  try {
    await Settings.findOrCreate({
      where: { key: `feature_flag_${flagName}` },
      defaults: { value: value ? 'true' : 'false' }
    }).then(([setting, created]) => {
      if (!created) {
        return setting.update({ value: value ? 'true' : 'false' });
      }
      return setting;
    });

    // 更新快取
    flagsCache[flagName] = value;
    cacheTimestamp = Date.now();

    console.log(`✅ Feature Flag ${flagName} 已設定為: ${value}`);
  } catch (error) {
    console.error(`❌ 設定 Feature Flag ${flagName} 失敗:`, error);
    throw error;
  }
}

/**
 * 取得所有 Feature Flags
 * @returns {Promise<Object>}
 */
async function getAllFeatureFlags() {
  const flags = {};
  
  for (const flagName of Object.keys(DEFAULT_FLAGS)) {
    flags[flagName] = await getFeatureFlag(flagName);
  }

  return flags;
}

/**
 * 清除快取（用於測試或強制重新載入）
 */
function clearCache() {
  flagsCache = { ...DEFAULT_FLAGS };
  cacheTimestamp = 0;
}

module.exports = {
  getFeatureFlag,
  setFeatureFlag,
  getAllFeatureFlags,
  clearCache,
  DEFAULT_FLAGS
};

