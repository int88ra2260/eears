'use strict';

/**
 * 預設 false：未設環境變數或值非 "true" 時不啟用 v3 read model 正式切換。
 * Phase 5-9 僅供營運／工程預備；實際改 V2 讀源須另案啟用並驗證。
 */
function isLearningJourneyV3ReadModelEnabled() {
  return String(process.env.ENABLE_LEARNING_JOURNEY_V3_READ_MODEL || '')
    .trim()
    .toLowerCase() === 'true';
}

module.exports = {
  isLearningJourneyV3ReadModelEnabled
};
