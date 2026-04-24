const ExcelJS = require('exceljs');
const { Op, fn, col } = require('sequelize');
const { sequelize, Survey, SurveyVersion, SurveyRule, SurveyModuleResponse, SurveyResponseAnswer, Semester, Event } = require('../models');
const surveyModuleService = require('./surveyModuleService');
const { simulateSurveyRuleResolution } = require('./surveyRuleEvaluationService');
const { normalizeSurveyResponseAnswers } = require('./surveyResponseNormalizationService');

function normalizePagination(query = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(query.pageSize) || 20, 1), 200);
  return { page, pageSize, offset: (page - 1) * pageSize };
}

async function listSurveyCenter(query = {}) {
  const { page, pageSize, offset } = normalizePagination(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.activityType) where.activityType = query.activityType;
  const { rows, count } = await Survey.findAndCountAll({
    where,
    order: [['updatedAt', 'DESC']],
    limit: pageSize,
    offset,
  });
  return { rows, count, page, pageSize };
}

function parseSort(query, allowed, defaultKey, defaultOrder = 'DESC') {
  const sortBy = allowed.includes(query.sortBy) ? query.sortBy : defaultKey;
  const sortOrder = String(query.sortOrder || defaultOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  return { sortBy, sortOrder };
}

function computeRuleStatus(rule, now = new Date()) {
  if (!rule?.isEnabled) return 'disabled';
  const startAt = rule.startAt || rule.startDate;
  const endAt = rule.endAt || rule.endDate;
  if (startAt && new Date(startAt) > now) return 'not_started';
  if (endAt && new Date(endAt) < now) return 'expired';
  return 'active_now';
}

async function listSurveyRules(query = {}) {
  const { page, pageSize, offset } = normalizePagination(query);
  const where = {};
  if (query.semesterId) where.semesterId = query.semesterId;
  if (query.activityType) where.activityType = query.activityType;
  if (query.isEnabled === 'true') where.isEnabled = true;
  if (query.isEnabled === 'false') where.isEnabled = false;
  const { sortBy, sortOrder } = parseSort(query, ['priority', 'updatedAt', 'startAt', 'endAt', 'id'], 'priority', 'ASC');

  const { rows, count } = await SurveyRule.findAndCountAll({
    where,
    include: [
      { model: Survey, attributes: ['id', 'name', 'title', 'surveyKey'], required: false },
      { model: Semester, attributes: ['id', 'code', 'name'], required: false },
      { model: SurveyVersion, attributes: ['id', 'versionNumber'], required: false },
    ],
    order: [[sortBy, sortOrder], ['updatedAt', 'DESC']],
    limit: pageSize,
    offset,
  });

  const enabledRows = await SurveyRule.findAll({ where: { ...where, isEnabled: true }, order: [['priority', 'ASC'], ['updatedAt', 'DESC']] });
  const activeByScope = new Map();
  const now = new Date();
  enabledRows.forEach((r) => {
    if (computeRuleStatus(r, now) !== 'active_now') return;
    const k = `${r.semesterId || 'all'}|${r.activityType || 'general'}|${r.appliesToAllEvents ? 'all' : r.eventId || 'none'}`;
    if (!activeByScope.has(k)) activeByScope.set(k, r.id);
  });

  const data = rows.map((r) => {
    const k = `${r.semesterId || 'all'}|${r.activityType || 'general'}|${r.appliesToAllEvents ? 'all' : r.eventId || 'none'}`;
    const status = computeRuleStatus(r, now);
    const overridden = status === 'active_now' && activeByScope.get(k) !== r.id;
    return { ...r.toJSON(), effectiveStatus: overridden ? 'overridden_by_higher_priority' : status };
  });
  return { rows: data, pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) } };
}

function overlap(aStart, aEnd, bStart, bEnd) {
  const as = aStart ? new Date(aStart).getTime() : Number.NEGATIVE_INFINITY;
  const ae = aEnd ? new Date(aEnd).getTime() : Number.POSITIVE_INFINITY;
  const bs = bStart ? new Date(bStart).getTime() : Number.NEGATIVE_INFINITY;
  const be = bEnd ? new Date(bEnd).getTime() : Number.POSITIVE_INFINITY;
  return as <= be && bs <= ae;
}

async function findRuleConflicts(payload, excludeId = null) {
  const where = { semesterId: payload.semesterId || null, activityType: payload.activityType || null, isEnabled: true };
  if (excludeId) where.id = { [Op.ne]: excludeId };
  const candidates = await SurveyRule.findAll({ where });
  const hit = candidates.filter((r) => {
    const sameScope =
      (payload.appliesToAllEvents && r.appliesToAllEvents) ||
      (!payload.appliesToAllEvents && !r.appliesToAllEvents && Number(payload.eventId) === Number(r.eventId)) ||
      (payload.appliesToAllEvents && !r.appliesToAllEvents) ||
      (!payload.appliesToAllEvents && r.appliesToAllEvents);
    if (!sameScope) return false;
    return overlap(payload.startAt || payload.startDate, payload.endAt || payload.endDate, r.startAt || r.startDate, r.endAt || r.endDate);
  });
  return hit;
}

async function createSurveyRule(payload) {
  const conflicts = await findRuleConflicts(payload, null);
  if (payload.isEnabled !== false && conflicts.length) {
    const samePriority = conflicts.some((c) => Number(c.priority) === Number(payload.priority || 100));
    const err = new Error(samePriority ? '規則衝突：同範圍同時段已有相同優先序啟用規則' : '規則重疊：將由 priority 決定生效順序');
    err.statusCode = samePriority ? 409 : 400;
    err.code = 'RULE_CONFLICT';
    err.details = conflicts.map((c) => ({ id: c.id, priority: c.priority }));
    err.relatedRules = conflicts.map((c) => c.id);
    err.canResolveByPriority = !samePriority;
    err.suggestion = samePriority ? '調整 priority 或時間區間' : '請確認較高優先序規則是否符合預期';
    err.conflictType = samePriority ? 'SAME_PRIORITY_OVERLAP' : 'SAME_SCOPE_OVERLAP';
    throw err;
  }
  return SurveyRule.create(payload);
}

async function updateSurveyRule(id, payload) {
  const row = await SurveyRule.findByPk(id);
  if (!row) return null;
  const merged = { ...row.toJSON(), ...payload };
  const conflicts = await findRuleConflicts(merged, id);
  if (merged.isEnabled !== false && conflicts.length) {
    const samePriority = conflicts.some((c) => Number(c.priority) === Number(merged.priority || 100));
    const err = new Error(samePriority ? '規則衝突：同範圍同時段已有相同優先序啟用規則' : '規則重疊：將由 priority 決定生效順序');
    err.statusCode = samePriority ? 409 : 400;
    err.code = 'RULE_CONFLICT';
    err.details = conflicts.map((c) => ({ id: c.id, priority: c.priority }));
    err.relatedRules = conflicts.map((c) => c.id);
    err.canResolveByPriority = !samePriority;
    err.suggestion = samePriority ? '調整 priority 或時間區間' : '請確認較高優先序規則是否符合預期';
    err.conflictType = samePriority ? 'SAME_PRIORITY_OVERLAP' : 'SAME_SCOPE_OVERLAP';
    throw err;
  }
  await row.update(payload);
  return row;
}

async function getEffectiveRule({ semesterId, activityType, eventId }) {
  const sim = await simulateSurveyRuleResolution({ semesterId, activityType, eventId, currentTime: new Date() });
  return sim.selectedRule || null;
}

async function listSurveyResponses(query = {}) {
  const { page, pageSize, offset } = normalizePagination(query);
  const where = {};
  const eqFields = [
    'semesterId',
    'surveyId',
    'surveyVersionId',
    'activityType',
    'eventId',
    'studentId',
    'submissionStatus',
  ];
  eqFields.forEach((f) => {
    if (query[f] != null && query[f] !== '') where[f] = query[f];
  });
  if (query.studentName) where.studentName = { [Op.like]: `%${query.studentName}%` };
  if (query.versionId && !where.surveyVersionId) where.surveyVersionId = query.versionId;
  if (query.startDate || query.endDate || query.from || query.to) {
    where.submittedAt = {};
    if (query.startDate || query.from) where.submittedAt[Op.gte] = new Date(query.startDate || query.from);
    if (query.endDate || query.to) where.submittedAt[Op.lte] = new Date(query.endDate || query.to);
  }

  const { sortBy, sortOrder } = parseSort(
    query,
    ['submittedAt', 'studentId', 'studentName', 'submissionStatus', 'semesterId', 'surveyId'],
    'submittedAt',
    'DESC'
  );

  const { rows, count } = await SurveyModuleResponse.findAndCountAll({
    where,
    include: [
      { model: Survey, attributes: ['id', 'name', 'title', 'surveyKey'], required: false },
      { model: SurveyVersion, attributes: ['id', 'versionNumber'], required: false },
      { model: Semester, attributes: ['id', 'code', 'name'], required: false },
    ],
    order: [[sortBy, sortOrder]],
    limit: pageSize,
    offset,
  });
  const responseIds = rows.map((r) => r.id);
  const answerCounts = responseIds.length
    ? await SurveyResponseAnswer.findAll({
        attributes: ['responseId', [fn('COUNT', col('id')), 'cnt']],
        where: { responseId: { [Op.in]: responseIds } },
        group: ['responseId'],
      })
    : [];
  const answerMap = new Map(answerCounts.map((a) => [Number(a.responseId), Number(a.get('cnt') || 0)]));

  const summaryRows = await SurveyModuleResponse.findAll({
    attributes: [
      [fn('COUNT', col('id')), 'totalResponses'],
      [fn('SUM', sequelize.literal("CASE WHEN submissionStatus = 'submitted' THEN 1 ELSE 0 END")), 'completedResponses'],
      [fn('COUNT', fn('DISTINCT', col('surveyId'))), 'distinctSurveyCount'],
      [fn('COUNT', fn('DISTINCT', col('eventId'))), 'distinctEventCount'],
      [fn('COUNT', fn('DISTINCT', col('semesterId'))), 'distinctSemesterCount'],
    ],
    where,
    raw: true,
  });
  const s = summaryRows[0] || {};
  const totalResponses = Number(s.totalResponses || 0);
  const completedResponses = Number(s.completedResponses || 0);
  const summary = {
    totalResponses,
    completedResponses,
    partialResponses: Math.max(totalResponses - completedResponses, 0),
    distinctSurveyCount: Number(s.distinctSurveyCount || 0),
    distinctEventCount: Number(s.distinctEventCount || 0),
    distinctSemesterCount: Number(s.distinctSemesterCount || 0),
  };

  return {
    rows: rows.map((r) => ({ ...r.toJSON(), answersCount: answerMap.get(r.id) || 0 })),
    pagination: { page, pageSize, total: count, totalPages: Math.ceil(count / pageSize) },
    summary,
  };
}

async function getResponseDetail(id) {
  const response = await SurveyModuleResponse.findByPk(id);
  if (!response) return null;
  const normalized = await normalizeSurveyResponseAnswers(response);
  return {
    response,
    answers: normalized.answers,
    schemaJson: normalized.schemaJson,
    warnings: normalized.warnings,
    dataIntegrity: normalized.dataIntegrity,
  };
}

async function analyticsOverview(query = {}) {
  const where = buildAnalyticsWhere(query);
  const total = await SurveyModuleResponse.count({ where });
  const submitted = await SurveyModuleResponse.count({ where: { ...where, submissionStatus: 'submitted' } });
  const activityCoverage = await SurveyModuleResponse.count({ where, distinct: true, col: 'eventId' });
  const surveyCoverage = await SurveyModuleResponse.count({ where, distinct: true, col: 'surveyId' });
  const likertRows = await SurveyResponseAnswer.findAll({
    attributes: [[fn('AVG', col('scoreValue')), 'avgScore']],
    include: [{ model: SurveyModuleResponse, required: true, attributes: [], where }],
    where: { scoreValue: { [Op.ne]: null } },
    raw: true,
  });
  const avgScore = Number(likertRows[0]?.avgScore || 0);
  return {
    totalResponses: total,
    completionRate: total ? Number(((submitted / total) * 100).toFixed(2)) : 0,
    averageSatisfaction: Number(avgScore.toFixed(2)),
    activityCoverage,
    surveyCoverage,
  };
}

function buildAnalyticsWhere(query = {}) {
  const where = {};
  if (query.semesterId) where.semesterId = query.semesterId;
  if (query.surveyId) where.surveyId = query.surveyId;
  if (query.versionId) where.surveyVersionId = query.versionId;
  if (query.activityType) where.activityType = query.activityType;
  if (query.eventId) where.eventId = query.eventId;
  if (query.startDate || query.endDate) {
    where.submittedAt = {};
    if (query.startDate) where.submittedAt[Op.gte] = new Date(query.startDate);
    if (query.endDate) where.submittedAt[Op.lte] = new Date(query.endDate);
  }
  return where;
}

async function analyticsDistribution(query = {}) {
  const where = buildAnalyticsWhere(query);
  const responseRows = await SurveyModuleResponse.findAll({ where, attributes: ['id'] });
  const ids = responseRows.map((r) => r.id);
  if (!ids.length) return { questions: [] };
  const answers = await SurveyResponseAnswer.findAll({ where: { responseId: { [Op.in]: ids } }, raw: true });
  const grouped = new Map();
  answers.forEach((a) => {
    if (!grouped.has(a.questionKey)) grouped.set(a.questionKey, []);
    grouped.get(a.questionKey).push(a);
  });
  const questions = [];
  grouped.forEach((arr, key) => {
    const type = arr[0]?.questionType || 'text';
    if (type === 'radio' || type === 'likert') {
      const dist = {};
      arr.forEach((x) => {
        const v = x.answerText || (x.scoreValue != null ? String(x.scoreValue) : null);
        if (!v) return;
        dist[v] = (dist[v] || 0) + 1;
      });
      const scored = arr.filter((x) => x.scoreValue != null);
      const avg = scored.length ? Number((scored.reduce((s, x) => s + Number(x.scoreValue || 0), 0) / scored.length).toFixed(2)) : null;
      questions.push({ questionKey: key, questionType: type, distribution: dist, averageScore: avg });
    } else if (type === 'checkbox') {
      const dist = {};
      arr.forEach((x) => {
        const list = Array.isArray(x.answerJson) ? x.answerJson : (typeof x.answerText === 'string' ? x.answerText.split('|') : []);
        list.forEach((it) => {
          const k = String(it).trim();
          if (!k) return;
          dist[k] = (dist[k] || 0) + 1;
        });
      });
      questions.push({ questionKey: key, questionType: type, distribution: dist });
    }
  });
  return { questions };
}

async function analyticsTrends(query = {}) {
  const where = buildAnalyticsWhere(query);
  const rows = await SurveyModuleResponse.findAll({
    attributes: [[fn('DATE', col('submittedAt')), 'day'], [fn('COUNT', col('id')), 'count']],
    where,
    group: [fn('DATE', col('submittedAt'))],
    order: [[fn('DATE', col('submittedAt')), 'ASC']],
    raw: true,
  });
  return { rows: rows.map((r) => ({ day: r.day, count: Number(r.count || 0) })) };
}

async function analyticsComparison(query = {}) {
  const by = query.by === 'activityType' ? 'activityType' : 'semesterId';
  const where = buildAnalyticsWhere(query);
  const rows = await SurveyModuleResponse.findAll({
    attributes: [by, [fn('COUNT', col('id')), 'count']],
    where,
    group: [col(by)],
    order: [[fn('COUNT', col('id')), 'DESC']],
    raw: true,
  });
  return { by, rows: rows.map((r) => ({ key: r[by] || 'N/A', count: Number(r.count || 0) })) };
}

async function analyticsOpenTextSummary(query = {}) {
  const where = buildAnalyticsWhere(query);
  const responseRows = await SurveyModuleResponse.findAll({ where, attributes: ['id'] });
  const ids = responseRows.map((r) => r.id);
  if (!ids.length) return { total: 0, rows: [], topTokens: [] };
  const answerWhere = { responseId: { [Op.in]: ids } };
  if (query.questionKey) answerWhere.questionKey = query.questionKey;
  const rows = await SurveyResponseAnswer.findAll({
    where: answerWhere,
    attributes: ['responseId', 'questionKey', 'answerText', 'createdAt'],
    limit: Math.min(Number(query.limit) || 50, 200),
    order: [['createdAt', 'DESC']],
    raw: true,
  });
  const filtered = rows.filter((r) => r.answerText && String(r.answerText).trim().length >= 2);
  const tokenCount = {};
  filtered.forEach((r) => {
    String(r.answerText)
      .split(/[\s,，。.!?！？;；:：()\[\]{}\/\\\n\r\t]+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= 2)
      .forEach((x) => {
        tokenCount[x] = (tokenCount[x] || 0) + 1;
      });
  });
  const topTokens = Object.entries(tokenCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([token, count]) => ({ token, count }));
  return { total: filtered.length, rows: filtered, topTokens };
}

async function gatingEffectiveForReservation({ eventId, activityType }) {
  let at = activityType || null;
  let semesterId = null;
  if (eventId) {
    const event = await Event.findByPk(eventId);
    if (event) {
      at = at || event.eventType || null;
      semesterId = event.semesterId || null;
    }
  }
  const rule = await getEffectiveRule({ semesterId, activityType: at, eventId });
  return { semesterId, activityType: at, rule };
}

async function submitSurvey(surveyKey, body, req) {
  // 仍使用既有提交引擎，確保不破壞既有流程
  return surveyModuleService.submitPublicResponse(surveyKey, body, req);
}

async function myStatus({ surveyId, studentId, semesterId }) {
  const where = { surveyId, studentId };
  if (semesterId) where.semesterId = semesterId;
  const row = await SurveyModuleResponse.findOne({ where, order: [['submittedAt', 'DESC']] });
  return { filled: !!row, latest: row || null };
}

async function listSemesters() {
  return Semester.findAll({ order: [['startDate', 'DESC']] });
}

async function exportSurveyResponsesXlsx(query, res, actorId) {
  const list = await listSurveyResponses({ ...query, page: 1, pageSize: Math.min(Number(query.maxRows) || 5000, 5000) });
  const rows = list.rows || [];
  const ids = rows.map((r) => r.id);
  const answers = ids.length ? await SurveyResponseAnswer.findAll({ where: { responseId: { [Op.in]: ids } }, raw: true }) : [];
  const answerMap = new Map();
  answers.forEach((a) => {
    if (!answerMap.has(a.responseId)) answerMap.set(a.responseId, []);
    answerMap.get(a.responseId).push(a);
  });
  const allKeys = Array.from(new Set(answers.map((a) => a.questionKey))).sort();

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('survey_responses');
  const fixedCols = [
    { header: 'responseId', key: 'responseId', width: 10 },
    { header: 'semester', key: 'semester', width: 14 },
    { header: 'survey', key: 'survey', width: 24 },
    { header: 'version', key: 'version', width: 10 },
    { header: 'activityType', key: 'activityType', width: 18 },
    { header: 'eventId', key: 'eventId', width: 10 },
    { header: 'studentId', key: 'studentId', width: 14 },
    { header: 'studentName', key: 'studentName', width: 16 },
    { header: 'status', key: 'status', width: 14 },
    { header: 'submittedAt', key: 'submittedAt', width: 22 },
    { header: 'source', key: 'source', width: 16 },
  ];
  ws.columns = fixedCols.concat(allKeys.map((k) => ({ header: `Q:${k}`, key: `q_${k}`, width: 25 })));

  rows.forEach((r) => {
    const row = {
      responseId: r.id,
      semester: r.Semester?.code || r.semester || '',
      survey: r.Survey?.title || r.Survey?.name || '',
      version: r.SurveyVersion?.versionNumber || '',
      activityType: r.activityType || '',
      eventId: r.eventId || '',
      studentId: r.studentId || '',
      studentName: r.studentName || '',
      status: r.submissionStatus || '',
      submittedAt: r.submittedAt || '',
      source: r.source || '',
    };
    const kv = {};
    (answerMap.get(r.id) || []).forEach((a) => {
      kv[`q_${a.questionKey}`] =
        a.answerText ||
        (Array.isArray(a.answerJson) ? a.answerJson.join(' | ') : a.answerJson ? JSON.stringify(a.answerJson) : '');
    });
    ws.addRow({ ...row, ...kv });
  });

  await surveyModuleService.writeAudit(
    actorId,
    'export',
    'SurveyModuleResponse',
    String(query.surveyId || 'all'),
    null,
    { count: rows.length },
    'export survey responses xlsx'
  );
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="survey-responses-export.xlsx"');
  await wb.xlsx.write(res);
  res.end();
}

module.exports = {
  listSurveyCenter,
  listSurveyRules,
  createSurveyRule,
  updateSurveyRule,
  getEffectiveRule,
  listSurveyResponses,
  getResponseDetail,
  analyticsOverview,
  analyticsDistribution,
  analyticsTrends,
  analyticsComparison,
  analyticsOpenTextSummary,
  gatingEffectiveForReservation,
  submitSurvey,
  myStatus,
  listSemesters,
  exportSurveyResponsesXlsx,
};
