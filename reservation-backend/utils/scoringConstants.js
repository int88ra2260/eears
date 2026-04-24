// utils/scoringConstants.js
// Phase 3：教學成效評分權重

const TEACHING_SCORE_WEIGHTS = {
  participationRate: 0.3,
  bestepPassRate: 0.3,
  exemptionApprovedRate: 0.2,
  surveyCompletionRate: 0.1,
  violationRate: -0.1
};

function scoreToLevel(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  return 'D';
}

module.exports = {
  TEACHING_SCORE_WEIGHTS,
  scoreToLevel
};

