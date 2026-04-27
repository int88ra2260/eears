/**
 * 英語學習歷程中心 legacy 英檢資料設定（從 .env 讀取，有預設值）
 */
const enabled = process.env.ENABLE_ENGLISH_TEST_TRACKING !== 'false';
const allowMixedTestTypeCompare = process.env.ENGLISH_TEST_TRACKING_ALLOW_MIXED_TESTTYPE_COMPARE === 'true';
const snapshotMode = process.env.ENGLISH_TEST_TRACKING_SNAPSHOT_MODE || 'locked'; // locked | live
const importOverwriteEnrollment = process.env.ENGLISH_TEST_TRACKING_IMPORT_OVERWRITE_ENROLLMENT === 'true';
const tiebreakerOrder = (process.env.ENGLISH_TEST_TRACKING_BEST_TIEBREAKER || 'cefr,rawScore,testDate,attemptId').split(',').map(s => s.trim());

module.exports = {
  enabled,
  allowMixedTestTypeCompare,
  snapshotMode,
  importOverwriteEnrollment,
  tiebreakerOrder
};
