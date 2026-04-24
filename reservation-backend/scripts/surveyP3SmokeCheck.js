/* eslint-disable no-console */
const { sequelize, SurveyModuleResponse } = require('../models');
const governance = require('../services/surveyDataGovernanceService');
const { normalizeSurveyResponseAnswers } = require('../services/surveyResponseNormalizationService');
const ruleEval = require('../services/surveyRuleEvaluationService');
const health = require('../services/surveyHealthService');

async function main() {
  try {
    await sequelize.authenticate();
    console.log('[P3 smoke] DB connected');

    const eventReport = await governance.backfillEventSemesters({ dryRun: true });
    const responseReport = await governance.backfillResponseLinks({ dryRun: true });
    console.log('[P3 smoke] governance', { eventReport, responseReport });

    const one = await SurveyModuleResponse.findOne({ order: [['id', 'DESC']] });
    if (one) {
      const n = await normalizeSurveyResponseAnswers(one);
      console.log('[P3 smoke] normalize one response', {
        responseId: one.id,
        warningCount: n.warnings.length,
        dataIntegrity: n.dataIntegrity,
      });
    }

    const sim = await ruleEval.simulateSurveyRuleResolution({
      semesterId: one?.semesterId || null,
      activityType: one?.activityType || 'ET',
      eventId: one?.eventId || null,
      currentTime: new Date(),
    });
    console.log('[P3 smoke] rule simulation', {
      selectedRule: sim.selectedRule?.id || null,
      activeRules: sim.activeRules.length,
      traceCount: sim.trace.length,
    });

    const ov = await health.getHealthOverview();
    console.log('[P3 smoke] health overview', ov);
    process.exit(0);
  } catch (e) {
    console.error('[P3 smoke] failed', e);
    process.exit(1);
  }
}

main();
