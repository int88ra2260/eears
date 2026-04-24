const { Op } = require('sequelize');
const { SurveyRule } = require('../models');

function toTs(v, fallback) {
  if (!v) return fallback;
  const t = new Date(v).getTime();
  return Number.isFinite(t) ? t : fallback;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  const as = toTs(aStart, Number.NEGATIVE_INFINITY);
  const ae = toTs(aEnd, Number.POSITIVE_INFINITY);
  const bs = toTs(bStart, Number.NEGATIVE_INFINITY);
  const be = toTs(bEnd, Number.POSITIVE_INFINITY);
  return as <= be && bs <= ae;
}

function evaluateRuleFit(rule, ctx) {
  const reasons = [];
  if (!rule.isEnabled) reasons.push('disabled');
  if (ctx.semesterId && rule.semesterId && Number(rule.semesterId) !== Number(ctx.semesterId)) reasons.push('semester_mismatch');
  if (ctx.activityType && rule.activityType && String(rule.activityType) !== String(ctx.activityType)) reasons.push('activity_mismatch');
  if (ctx.triggerMode && rule.triggerMode && String(rule.triggerMode) !== String(ctx.triggerMode)) reasons.push('trigger_mismatch');

  if (rule.appliesToAllEvents !== true) {
    if (!ctx.eventId) reasons.push('event_required_but_missing');
    else if (Number(rule.eventId) !== Number(ctx.eventId)) reasons.push('event_mismatch');
  }

  const now = toTs(ctx.currentTime || new Date(), Date.now());
  const startAt = toTs(rule.startAt || rule.startDate, Number.NEGATIVE_INFINITY);
  const endAt = toTs(rule.endAt || rule.endDate, Number.POSITIVE_INFINITY);
  if (now < startAt) reasons.push('not_started');
  if (now > endAt) reasons.push('expired');

  return { matched: reasons.length === 0, reasons };
}

async function evaluateEffectiveSurveyRule(ctx = {}) {
  const where = {};
  if (ctx.semesterId) where[Op.or] = [{ semesterId: ctx.semesterId }, { semesterId: null }];
  if (ctx.activityType) where.activityType = ctx.activityType;
  const matchedRules = await SurveyRule.findAll({ where, order: [['priority', 'ASC'], ['updatedAt', 'DESC']] });
  const trace = [];
  const candidates = [];
  const excludedRules = [];

  matchedRules.forEach((rule) => {
    const fit = evaluateRuleFit(rule, ctx);
    trace.push({ ruleId: rule.id, step: 'evaluate', reasons: fit.reasons });
    if (fit.matched) {
      candidates.push(rule);
      trace.push({ ruleId: rule.id, step: 'active_candidate', message: 'rule matched and active' });
    } else {
      excludedRules.push({ rule, reasons: fit.reasons });
    }
  });

  let selectedRule = null;
  const activeRules = [...candidates].sort((a, b) => {
    if (Number(a.priority) !== Number(b.priority)) return Number(a.priority) - Number(b.priority);
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
  if (activeRules.length > 0) {
    selectedRule = activeRules[0];
    trace.push({ ruleId: selectedRule.id, step: 'selected', message: 'selected by highest precedence(priority,updatedAt)' });
    activeRules.slice(1).forEach((r) => {
      trace.push({ ruleId: r.id, step: 'overridden', message: `overridden by #${selectedRule.id}` });
    });
  }

  return {
    matchedRules,
    activeRules,
    overriddenRules: activeRules.slice(1),
    selectedRule,
    excludedRules,
    reason: selectedRule ? 'matched_by_priority' : 'no_active_rule',
    conflictWarnings: detectRuleConflicts(matchedRules).conflicts,
    trace,
  };
}

function detectRuleConflicts(rules = []) {
  const conflicts = [];
  for (let i = 0; i < rules.length; i += 1) {
    for (let j = i + 1; j < rules.length; j += 1) {
      const a = rules[i];
      const b = rules[j];
      const sameSemester = Number(a.semesterId || 0) === Number(b.semesterId || 0);
      const sameActivity = String(a.activityType || '') === String(b.activityType || '');
      const scopeIntersect =
        (a.appliesToAllEvents && b.appliesToAllEvents) ||
        (a.appliesToAllEvents && !b.appliesToAllEvents) ||
        (!a.appliesToAllEvents && b.appliesToAllEvents) ||
        (!a.appliesToAllEvents && !b.appliesToAllEvents && Number(a.eventId || 0) === Number(b.eventId || 0));
      if (!sameSemester || !sameActivity || !scopeIntersect) continue;

      const timeOverlap = overlaps(a.startAt || a.startDate, a.endAt || a.endDate, b.startAt || b.startDate, b.endAt || b.endDate);
      if (!timeOverlap) continue;

      let type = 'SAME_SCOPE_OVERLAP';
      if (Number(a.priority) === Number(b.priority)) type = 'SAME_PRIORITY_OVERLAP';
      if ((a.appliesToAllEvents && !b.appliesToAllEvents) || (!a.appliesToAllEvents && b.appliesToAllEvents)) type = 'EVENT_SCOPE_CONFLICT';

      conflicts.push({
        type,
        relatedRules: [a.id, b.id],
        canResolveByPriority: type !== 'SAME_PRIORITY_OVERLAP',
        suggestion:
          type === 'SAME_PRIORITY_OVERLAP'
            ? '調整其中一條 priority 或時間區間'
            : '可維持但請確認較高優先序規則是否符合預期',
      });
    }
  }
  return { conflicts };
}

async function simulateSurveyRuleResolution(ctx = {}) {
  return evaluateEffectiveSurveyRule(ctx);
}

module.exports = {
  evaluateEffectiveSurveyRule,
  detectRuleConflicts,
  simulateSurveyRuleResolution,
};
