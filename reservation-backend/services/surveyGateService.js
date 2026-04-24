/**
 * 預約 gating 與問卷狀態（產品化 survey_rules + legacy 相容）
 */
const {
  Survey,
  SurveyRule,
  SurveyModuleResponse,
  EnglishTableSurveyResponse,
  EnglishClubSurveyResponse,
} = require('../models');
const { getCurrentSemester } = require('../utils/semester');

const EVENT_TYPE_TO_SURVEY_KEY = {
  'English Table': 'english_table_feedback_114_1',
  'English Club': 'english_club_feedback_114_1',
};

function legacyModelForSurveyKey(surveyKey) {
  if (surveyKey === 'english_table_feedback_114_1') return EnglishTableSurveyResponse;
  if (surveyKey === 'english_club_feedback_114_1') return EnglishClubSurveyResponse;
  return null;
}

/**
 * @returns {Promise<{ mode: 'product', survey: any, rule: any, surveyKey: string } | { mode: 'legacy' }>}
 */
async function resolveGateContext(eventType) {
  const surveyKey = EVENT_TYPE_TO_SURVEY_KEY[eventType];
  if (!surveyKey) return { mode: 'legacy' };

  const survey = await Survey.findOne({ where: { surveyKey } });
  if (!survey) return { mode: 'legacy' };

  const rule = await SurveyRule.findOne({ where: { surveyId: survey.id } });
  if (!rule) return { mode: 'legacy' };

  return { mode: 'product', survey, rule, surveyKey };
}

/**
 * 是否已有符合重填規則的完成紀錄（以「本學期」為範圍；legacy 與 survey_responses 皆含 semester）
 */
async function hasCompletedForGate({ surveyId, surveyKey, rule, studentId, eventId }) {
  const sid = String(studentId || '').trim();
  if (!sid) return false;

  const semester = getCurrentSemester();

  const LegacyModel = legacyModelForSurveyKey(surveyKey);
  if (LegacyModel) {
    const legacyRow = await LegacyModel.findOne({ where: { studentId: sid, semester } });
    if (legacyRow) return true;
  }

  const policy = rule.retakePolicy || 'once_ever';

  if (policy === 'unlimited') {
    return false;
  }

  if (policy === 'once_per_event') {
    if (eventId == null) return false;
    const row = await SurveyModuleResponse.findOne({
      where: { surveyId, studentId: sid, status: 'completed', eventId },
    });
    return !!row;
  }

  const row = await SurveyModuleResponse.findOne({
    where: { surveyId, studentId: sid, status: 'completed', semester },
  });
  return !!row;
}

function ruleTimeAllows(rule, now = new Date()) {
  if (rule.startDate && new Date(rule.startDate) > now) {
    return { ok: false, reason: 'not_started' };
  }
  if (rule.endDate && new Date(rule.endDate) < now) {
    return { ok: false, reason: 'ended' };
  }
  return { ok: true };
}

module.exports = {
  EVENT_TYPE_TO_SURVEY_KEY,
  legacyModelForSurveyKey,
  resolveGateContext,
  hasCompletedForGate,
  ruleTimeAllows,
};
