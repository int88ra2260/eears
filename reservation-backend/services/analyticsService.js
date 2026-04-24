// services/analyticsService.js
// Phase 2.5：Admin Analytics 聚合（重用 KPI + 風險 + 快取）

const { Class, ClassMembership, Reservation, Event, EnglishTestRegistration, sequelize } = require('../models');
const { Op } = require('sequelize');
const kpiService = require('./kpiService');
const riskDetectionService = require('./riskDetectionService');
const { getCache, setCache } = require('../utils/analyticsCache');
const { SEMESTER_RANGES } = require('../utils/semesterConstants');

const OVERVIEW_CACHE_TTL_MS = 5 * 60 * 1000;

function avg(numbers) {
  const arr = (numbers || []).filter((n) => typeof n === 'number' && !Number.isNaN(n));
  if (!arr.length) return null;
  return Number((arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2));
}

function buildSurveyGroups(studentIds, surveyCompletedSet) {
  const withSurvey = [];
  const withoutSurvey = [];
  studentIds.forEach((sid) => {
    if (surveyCompletedSet.has(sid)) withSurvey.push(sid);
    else withoutSurvey.push(sid);
  });
  return { withSurvey, withoutSurvey };
}

function computeGroupParticipationMetrics(groupStudentIds, attendedCountByStudent) {
  if (!groupStudentIds.length) return null;
  return avg(groupStudentIds.map((sid) => attendedCountByStudent[sid] || 0));
}

function computeGroupScoreMetrics(groupStudentIds, scoreByStudent) {
  if (!groupStudentIds.length) return null;
  return avg(
    groupStudentIds
      .map((sid) => scoreByStudent[sid]?.totalScore)
      .filter((v) => typeof v === 'number')
  );
}

function computeSurveyCrossAnalysis(studentIds, context) {
  const groups = buildSurveyGroups(studentIds, context.surveyCompletedSet);
  return {
    withSurvey: {
      avgParticipation: computeGroupParticipationMetrics(groups.withSurvey, context.attendedCountByStudent),
      avgScore: computeGroupScoreMetrics(groups.withSurvey, context.scoreByStudent)
    },
    withoutSurvey: {
      avgParticipation: computeGroupParticipationMetrics(groups.withoutSurvey, context.attendedCountByStudent),
      avgScore: computeGroupScoreMetrics(groups.withoutSurvey, context.scoreByStudent)
    }
  };
}

function buildGroupStats(uniqueStudentMembership, highRiskStudentIds) {
  const byGradeMap = {};
  const byDepartmentMap = {};

  Object.entries(uniqueStudentMembership).forEach(([sid, m]) => {
    const grade = m.grade || 'unknown';
    const department = m.department || 'unknown';

    if (!byGradeMap[grade]) byGradeMap[grade] = { totalStudents: 0, highRiskStudentCount: 0 };
    if (!byDepartmentMap[department]) byDepartmentMap[department] = { totalStudents: 0, highRiskStudentCount: 0 };

    byGradeMap[grade].totalStudents += 1;
    byDepartmentMap[department].totalStudents += 1;

    if (highRiskStudentIds.has(sid)) {
      byGradeMap[grade].highRiskStudentCount += 1;
      byDepartmentMap[department].highRiskStudentCount += 1;
    }
  });

  return {
    byGrade: Object.entries(byGradeMap).map(([grade, v]) => ({ grade, ...v })),
    byDepartment: Object.entries(byDepartmentMap).map(([department, v]) => ({ department, ...v }))
  };
}

async function buildClassRiskRanking(uniqueStudentMembership, highRiskStudentIds) {
  const classHighRiskCount = {};
  Object.entries(uniqueStudentMembership).forEach(([sid, m]) => {
    if (!highRiskStudentIds.has(sid)) return;
    const classId = Number(m.classId);
    if (!classId) return;
    if (!classHighRiskCount[classId]) classHighRiskCount[classId] = 0;
    classHighRiskCount[classId] += 1;
  });

  const classIds = Object.keys(classHighRiskCount).map((id) => Number(id));
  if (!classIds.length) {
    return { top10Classes: [], highRiskClasses: [] };
  }

  const classRows = await Class.findAll({
    where: { id: { [Op.in]: classIds } },
    attributes: ['id', 'name'],
    raw: true
  });
  const classNameById = {};
  classRows.forEach((c) => {
    classNameById[c.id] = c.name;
  });

  const ranking = classIds.map((classId) => ({
    classId,
    className: classNameById[classId] || null,
    riskStudentCount: classHighRiskCount[classId]
  }));
  ranking.sort((a, b) => (b.riskStudentCount || 0) - (a.riskStudentCount || 0));
  return {
    top10Classes: ranking.slice(0, 10),
    highRiskClasses: ranking
  };
}

async function getAdminOverview(semester) {
  if (!SEMESTER_RANGES[semester]) {
    throw new Error('不支援的學期');
  }
  const cacheKey = `overview:${semester}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const memberships = await ClassMembership.findAll({
    where: { semester },
    attributes: ['studentId', 'classId', 'grade', 'department'],
    raw: true
  });
  const studentIds = kpiService.normalizeStudentIds(memberships.map((m) => m.studentId));
  const totalStudents = studentIds.length;

  if (totalStudents === 0) {
    const empty = {
      semester,
      totalStudents: 0,
      participationRate: 0,
      avgParticipationCount: 0,
      bestepRegistrationRate: 0,
      bestepAttendanceRate: 0,
      bestepPassRate: 0,
      exemptionApprovedRate: 0,
      surveyCompletionRate: 0,
      violationRate: 0,
      highRiskStudentCount: 0,
      distribution: { riskLevelCounts: { low: 0, medium: 0, high: 0 } },
      surveyCrossAnalysis: null,
      byGrade: [],
      byDepartment: [],
      top10Classes: [],
      highRiskClasses: []
    };
    setCache(cacheKey, empty, OVERVIEW_CACHE_TTL_MS);
    return empty;
  }

  const context = await kpiService.buildKpiContext(studentIds, semester);
  const participationMetrics = await kpiService.getParticipationMetrics(studentIds, semester, { context });
  const registrationMetrics = await kpiService.getBestepRegistrationMetrics(studentIds, semester, { context });
  const attendanceMetrics = await kpiService.getBestepAttendanceMetrics(studentIds, semester, {
    context,
    registrationMetrics
  });
  const passMetrics = await kpiService.getBestepPassMetrics(studentIds, semester, {
    context,
    attendanceMetrics
  });
  const exemptionMetrics = await kpiService.getExemptionMetrics(studentIds, semester, { context });
  const surveyMetrics = await kpiService.getSurveyMetrics(studentIds, semester, { context });
  const violationMetrics = await kpiService.getViolationMetrics(studentIds, semester, { context });

  const risks = await riskDetectionService.getRisksForStudents(studentIds, semester, { context });
  const riskLevelCounts = { low: 0, medium: 0, high: 0 };
  const highRiskStudentIds = new Set();
  risks.forEach((r) => {
    riskLevelCounts[r.riskLevel] = (riskLevelCounts[r.riskLevel] || 0) + 1;
    if (r.riskLevel === 'high') highRiskStudentIds.add(r.studentId);
  });

  const uniqueStudentMembership = {};
  memberships.forEach((m) => {
    const sid = kpiService.normalizeStudentIds([m.studentId])[0];
    if (!sid) return;
    if (!uniqueStudentMembership[sid]) uniqueStudentMembership[sid] = m;
  });

  const surveyCrossAnalysis = computeSurveyCrossAnalysis(studentIds, context);
  const { byGrade, byDepartment } = buildGroupStats(uniqueStudentMembership, highRiskStudentIds);
  const { top10Classes, highRiskClasses } = await buildClassRiskRanking(uniqueStudentMembership, highRiskStudentIds);

  const result = {
    semester,
    totalStudents,
    participationRate: participationMetrics.participationRate,
    avgParticipationCount: participationMetrics.avgParticipationCount,
    bestepRegistrationRate: registrationMetrics.bestepRegistrationRate,
    bestepAttendanceRate: attendanceMetrics.bestepAttendanceRate,
    bestepPassRate: passMetrics.bestepPassRate,
    exemptionApprovedRate: exemptionMetrics.exemptionApprovedRate,
    surveyCompletionRate: surveyMetrics.surveyCompletionRate,
    violationRate: violationMetrics.violationRate,
    highRiskStudentCount: highRiskStudentIds.size,
    distribution: { riskLevelCounts },
    surveyCrossAnalysis,
    byGrade,
    byDepartment,
    top10Classes,
    highRiskClasses
  };

  setCache(cacheKey, result, OVERVIEW_CACHE_TTL_MS);
  return result;
}

function safePct(n, d) {
  const dn = typeof d === 'number' ? d : Number(d);
  const nn = typeof n === 'number' ? n : Number(n);
  if (!dn || Number.isNaN(dn)) return 0;
  if (Number.isNaN(nn)) return 0;
  return Number(((nn / dn) * 100).toFixed(2));
}

function toSeries(rows, mapFn) {
  if (!Array.isArray(rows)) return [];
  return rows.map(mapFn).filter(Boolean);
}

/**
 * Phase 8：預約分析（SQL aggregation）
 * KPI：
 * - 總預約數
 * - 出席率（已簽到 / 總預約）
 * - 違規率（已登記違規 / 總預約）
 * - 英檢通過率（hasCEFRB2 = 是 / true / yes）
 */
async function getReservationOverview(semester) {
  if (!SEMESTER_RANGES[semester]) {
    throw new Error('不支援的學期');
  }
  const { start, end } = SEMESTER_RANGES[semester];

  const overviewSql = `
    SELECT
      COUNT(*) AS totalReservations,
      SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) AS attendedCount,
      SUM(CASE WHEN r.checkinStatus = '已登記違規' THEN 1 ELSE 0 END) AS violationCount
    FROM reservations r
    INNER JOIN events e ON e.id = r.eventId
    WHERE e.date BETWEEN :start AND :end
  `;

  const [ovRows] = await sequelize.query(overviewSql, {
    replacements: { start, end },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  const ov = ovRows?.[0] || {};

  const totalReservations = Number(ov?.totalReservations || 0);
  const attendedCount = Number(ov?.attendedCount || 0);
  const violationCount = Number(ov?.violationCount || 0);

  const attendanceRate = safePct(attendedCount, totalReservations);
  const violationRate = safePct(violationCount, totalReservations);

  const englishSql = `
    SELECT
      COUNT(*) AS totalRegistrations,
      SUM(
        CASE
          WHEN et.hasCEFRB2 IN ('是', 'true', 'yes', '1') THEN 1
          ELSE 0
        END
      ) AS passCount
    FROM english_test_registrations et
    WHERE et.semester = :semester
  `;

  const [enRows] = await sequelize.query(englishSql, {
    replacements: { semester },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  const en = enRows?.[0] || {};

  const totalRegistrations = Number(en?.totalRegistrations || 0);
  const passCount = Number(en?.passCount || 0);
  const englishPassRate = safePct(passCount, totalRegistrations);

  return {
    semester,
    totalReservations,
    attendanceRate,
    violationRate,
    englishPassRate,
  };
}

async function getReservationActivityTrends(semester) {
  if (!SEMESTER_RANGES[semester]) {
    throw new Error('不支援的學期');
  }
  const { start, end } = SEMESTER_RANGES[semester];

  const sql = `
    SELECT
      e.date AS date,
      COUNT(*) AS reservationsCount
    FROM reservations r
    INNER JOIN events e ON e.id = r.eventId
    WHERE e.date BETWEEN :start AND :end
    GROUP BY e.date
    ORDER BY e.date ASC
  `;

  const [rows] = await sequelize.query(sql, {
    replacements: { start, end },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  return toSeries(rows, (row) => ({
    date: row.date,
    reservationsCount: Number(row.reservationsCount || 0),
  }));
}

async function getReservationEventsAttendanceTrend(semester) {
  if (!SEMESTER_RANGES[semester]) {
    throw new Error('不支援的學期');
  }
  const { start, end } = SEMESTER_RANGES[semester];

  const sql = `
    SELECT
      e.date AS date,
      SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) AS attendedCount,
      COUNT(*) AS totalCount
    FROM reservations r
    INNER JOIN events e ON e.id = r.eventId
    WHERE e.date BETWEEN :start AND :end
    GROUP BY e.date
    ORDER BY e.date ASC
  `;

  const [rows] = await sequelize.query(sql, {
    replacements: { start, end },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  return toSeries(rows, (row) => {
    const totalCount = Number(row.totalCount || 0);
    const attendedCount = Number(row.attendedCount || 0);
    return {
      date: row.date,
      attendanceRate: safePct(attendedCount, totalCount),
    };
  });
}

async function getReservationClassRankings(semester, { limit = 10 } = {}) {
  if (!SEMESTER_RANGES[semester]) {
    throw new Error('不支援的學期');
  }
  const { start, end } = SEMESTER_RANGES[semester];
  const lim = Number(limit) > 0 ? Number(limit) : 10;

  const sql = `
    SELECT
      c.id AS classId,
      c.name AS className,
      COUNT(*) AS reservationsCount,
      SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) AS attendedCount,
      SUM(CASE WHEN r.checkinStatus = '已登記違規' THEN 1 ELSE 0 END) AS violationCount,
      SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS attendanceRate,
      SUM(CASE WHEN r.checkinStatus = '已登記違規' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) AS violationRate
    FROM class_memberships m
    INNER JOIN classes c ON c.id = m.classId
    INNER JOIN reservations r ON r.studentId = m.studentId
    INNER JOIN events e ON e.id = r.eventId
    WHERE m.semester = :semester
      AND c.semester = :semester
      AND e.date BETWEEN :start AND :end
    GROUP BY c.id, c.name
    ORDER BY violationRate DESC
    LIMIT ${lim}
  `;

  const [rows] = await sequelize.query(sql, {
    replacements: { semester, start, end },
    type: sequelize.QueryTypes.SELECT,
    raw: true,
  });

  return toSeries(rows, (row) => ({
    classId: Number(row.classId || 0),
    className: row.className || null,
    reservationsCount: Number(row.reservationsCount || 0),
    attendanceRate: Number(row.attendanceRate || 0),
    violationRate: Number(row.violationRate || 0),
  }));
}

module.exports = {
  getAdminOverview,
  // Phase 8 reservation analytics
  getReservationOverview,
  getReservationActivityTrends,
  getReservationEventsAttendanceTrend,
  getReservationClassRankings,
};

