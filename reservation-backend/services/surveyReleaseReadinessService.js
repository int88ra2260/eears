const surveyHealthService = require('./surveyHealthService');

async function getReleaseReadiness() {
  const [overview, ruleHealth] = await Promise.all([
    surveyHealthService.getHealthOverview(),
    surveyHealthService.getRuleHealth(),
  ]);

  const blockers = [];
  const warnings = [];
  if (overview.missingSemesterCount > 0) warnings.push(`missing semester: ${overview.missingSemesterCount}`);
  if (overview.missingVersionCount > 0) warnings.push(`missing version: ${overview.missingVersionCount}`);
  if (overview.unmatchedAnswersCount > 0) warnings.push(`unmatched answers: ${overview.unmatchedAnswersCount}`);
  if (ruleHealth.conflictCount > 0) blockers.push(`rule conflicts: ${ruleHealth.conflictCount}`);

  let gate = 'Ready for rollout';
  if (blockers.length) gate = 'Not ready';
  else if (warnings.length) gate = 'Ready with warnings';

  const recommendedActions = [];
  if (overview.missingSemesterCount > 0) recommendedActions.push('先執行 semester preview，再由 admin 進行 execute');
  if (overview.missingVersionCount > 0) recommendedActions.push('先執行 version resolution preview，確認 ambiguous 筆數');
  if (overview.unmatchedAnswersCount > 0) recommendedActions.push('先處理 high-confidence answer mappings');
  if (ruleHealth.conflictCount > 0) recommendedActions.push('先修正規則衝突，否則不建議上線');

  return {
    gate,
    blockers,
    warnings,
    recommendedActions,
    overview,
    ruleHealth,
  };
}

module.exports = {
  getReleaseReadiness,
};
