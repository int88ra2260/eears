'use strict';

/**
 * Phase 6 起預設讀取 Learning Journey v3。
 * 僅在環境變數明確設為 "false" 時回退 legacy（保留 rollback 能力）。
 */
function isLearningJourneyV3ReadModelEnabled() {
  const normalized = String(process.env.ENABLE_LEARNING_JOURNEY_V3_READ_MODEL || '')
    .trim()
    .toLowerCase();
  return normalized !== 'false';
}

module.exports = {
  isLearningJourneyV3ReadModelEnabled
};
