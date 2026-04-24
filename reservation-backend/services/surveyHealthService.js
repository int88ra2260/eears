const { Event, SurveyModuleResponse, SurveyRule } = require('../models');
const { normalizeSurveyResponseAnswers } = require('./surveyResponseNormalizationService');
const { detectRuleConflicts } = require('./surveyRuleEvaluationService');
const { backfillEventSemesters, backfillResponseLinks } = require('./surveyDataGovernanceService');

async function getHealthOverview() {
  const totalResponses = await SurveyModuleResponse.count();
  const missingSemesterCount = await SurveyModuleResponse.count({ where: { semesterId: null } });
  const missingVersionCount = await SurveyModuleResponse.count({ where: { surveyVersionId: null } });
  const eventsMissingSemester = await Event.count({ where: { semesterId: null } });

  const sample = await SurveyModuleResponse.findAll({ limit: 200, order: [['updatedAt', 'DESC']] });
  let unmatchedAnswersCount = 0;
  let fallbackRenderedResponsesCount = 0;
  for (const r of sample) {
    const n = await normalizeSurveyResponseAnswers(r);
    unmatchedAnswersCount += Number(n?.dataIntegrity?.unmatchedAnswerCount || 0);
    if (n?.dataIntegrity?.normalizedWithFallback) fallbackRenderedResponsesCount += 1;
  }

  return {
    responsesTotal: totalResponses,
    missingSemesterCount,
    missingVersionCount,
    unresolvedSemesterCount: missingSemesterCount,
    unresolvedVersionCount: missingVersionCount,
    unmatchedAnswersCount,
    fallbackRenderedResponsesCount,
    eventsMissingSemester,
    sampleSizeForNormalization: sample.length,
  };
}

async function getHealthProblems() {
  const [responsesMissingSemester, responsesMissingVersion, eventsMissingSemester] = await Promise.all([
    SurveyModuleResponse.findAll({ where: { semesterId: null }, limit: 200, order: [['submittedAt', 'DESC']] }),
    SurveyModuleResponse.findAll({ where: { surveyVersionId: null }, limit: 200, order: [['submittedAt', 'DESC']] }),
    Event.findAll({ where: { semesterId: null }, limit: 200, order: [['id', 'DESC']] }),
  ]);

  const responseIds = responsesMissingSemester.map((r) => r.id).concat(responsesMissingVersion.map((r) => r.id));
  const answerIssues = [];
  if (responseIds.length) {
    const uniqIds = Array.from(new Set(responseIds));
    for (const id of uniqIds.slice(0, 100)) {
      const r = await SurveyModuleResponse.findByPk(id);
      if (!r) continue;
      const n = await normalizeSurveyResponseAnswers(r);
      if (n.dataIntegrity.unmatchedAnswerCount > 0) {
        answerIssues.push({ responseId: id, unmatchedAnswerCount: n.dataIntegrity.unmatchedAnswerCount });
      }
    }
  }

  return {
    responsesMissingSemester,
    responsesMissingVersion,
    responsesWithUnmatchedAnswers: answerIssues,
    eventsMissingSemester,
  };
}

async function getRuleHealth() {
  const rules = await SurveyRule.findAll();
  const { conflicts } = detectRuleConflicts(rules);
  return {
    totalRules: rules.length,
    conflictCount: conflicts.length,
    conflicts,
  };
}

async function dataQualityForWhere(where = {}) {
  const totalBaseResponses = await SurveyModuleResponse.count({ where });
  const missingSemesterCount = await SurveyModuleResponse.count({ where: { ...where, semesterId: null } });
  const missingVersionCount = await SurveyModuleResponse.count({ where: { ...where, surveyVersionId: null } });
  const sample = await SurveyModuleResponse.findAll({ where, limit: Math.min(totalBaseResponses, 100), order: [['updatedAt', 'DESC']] });
  let fallbackNormalizedCount = 0;
  let unmatchedAnswersCount = 0;
  for (const r of sample) {
    const n = await normalizeSurveyResponseAnswers(r);
    if (n?.dataIntegrity?.normalizedWithFallback) fallbackNormalizedCount += 1;
    unmatchedAnswersCount += Number(n?.dataIntegrity?.unmatchedAnswerCount || 0);
  }
  const excludedResponses = missingSemesterCount + missingVersionCount;
  return {
    totalBaseResponses,
    excludedResponses,
    missingSemesterCount,
    missingVersionCount,
    fallbackNormalizedCount,
    unmatchedAnswersCount,
  };
}

async function recheckSemester({ dryRun = true } = {}) {
  const [eventReport, responseReport] = await Promise.all([backfillEventSemesters({ dryRun }), backfillResponseLinks({ dryRun })]);
  return { dryRun, eventReport, responseReport };
}

async function recheckVersion({ dryRun = true } = {}) {
  const responseReport = await backfillResponseLinks({ dryRun });
  return { dryRun, responseReport };
}

async function recheckAnswers({ dryRun = true } = {}) {
  const rows = await SurveyModuleResponse.findAll({ limit: 300, order: [['updatedAt', 'DESC']] });
  let fallback = 0;
  let unmatched = 0;
  for (const r of rows) {
    const n = await normalizeSurveyResponseAnswers(r);
    if (n.dataIntegrity.normalizedWithFallback) fallback += 1;
    unmatched += Number(n.dataIntegrity.unmatchedAnswerCount || 0);
  }
  return {
    dryRun,
    sampledResponses: rows.length,
    fallbackNormalizedResponses: fallback,
    unmatchedAnswersCount: unmatched,
    note: 'answers recheck is read-only scan',
  };
}

module.exports = {
  getHealthOverview,
  getHealthProblems,
  getRuleHealth,
  dataQualityForWhere,
  recheckSemester,
  recheckVersion,
  recheckAnswers,
};
