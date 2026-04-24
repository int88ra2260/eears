/**
 * 診斷：legacy survey_settings 與產品化 survey_rules 是否一致
 * 用法：node scripts/checkSurveySettingsRuleSync.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const surveySettingsSyncService = require('../services/surveySettingsSyncService');

(async () => {
  const report = await surveySettingsSyncService.getLegacySurveyRuleSyncReport();
  console.log(JSON.stringify(report, null, 2));
  const bad = report.rows.filter((r) => r.productSurveyKey && (!r.ruleExists || r.keyFieldsMatch === false));
  if (bad.length) {
    console.error(`\n發現 ${bad.length} 筆需留意（無 rule 或欄位不一致）`);
    process.exitCode = 1;
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
