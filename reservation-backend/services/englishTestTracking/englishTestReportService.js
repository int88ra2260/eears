// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
'use strict';

/**
 * @deprecated
 * Will be removed after Learning Journey fully replaces legacy English-test data flows.
 */
if (process.env.NODE_ENV !== 'production') {
  console.warn('Legacy Learning Journey English-test report service is deprecated. Use Learning Journey APIs.');
}

const { Op } = require('sequelize');
const {
  EtEnrollmentSnapshot,
  EtStudentMaster,
  EtSemesterStudentBestSkill,
  EtAttemptImportHistory,
  EtExamAttempt,
  EtExamAttemptScore,
  EtExamAttemptSkillScore
} = require('../../models');
const {
  toV2AttemptJson,
  enrichBestSkillsCacheRow,
  computeBestSkillsFromAttemptsJson,
  mergeBestSkillsCacheAndComputed,
  dedupeAttemptsForDisplay
} = require('./legacyAttemptScoreAdapter');
const { getCefrRank, getCefrFromRank } = require('./cefrMappingService');

const B2_RANK_THRESHOLD = getCefrRank('B2') || 4;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function createServiceError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function validateSemesterId(semesterId) {
  const normalized = String(semesterId || '').trim();
  if (!normalized) {
    throw createServiceError('INVALID_SEMESTER_ID', 'semesterId is required');
  }
  if (!/^[0-9]{2,4}-[0-9]{1,2}$/.test(normalized)) {
    throw createServiceError('INVALID_SEMESTER_ID', 'semesterId format is invalid');
  }
  return normalized;
}

function validateStudentId(studentId) {
  const normalized = String(studentId || '').trim();
  if (!normalized) {
    throw createServiceError('MISSING_STUDENT_ID', 'studentId is required');
  }
  return normalized;
}

function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return null;
}

function hasAnyBestSkillRank(best) {
  if (!best) return false;
  return (
    best.bestListeningCefrRank != null ||
    best.bestReadingCefrRank != null ||
    best.bestSpeakingCefrRank != null ||
    best.bestWritingCefrRank != null
  );
}

function hasAnyAttained(best, threshold = B2_RANK_THRESHOLD) {
  if (!best) return false;
  return (
    Number(best.bestListeningCefrRank || 0) >= threshold ||
    Number(best.bestReadingCefrRank || 0) >= threshold ||
    Number(best.bestSpeakingCefrRank || 0) >= threshold ||
    Number(best.bestWritingCefrRank || 0) >= threshold
  );
}

function roundRate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
}

/**
 * 將名冊年級欄位歸一到顯示用 bucket（與系所表常見 1～4 對齊）
 */
function normalizeGradeBucket(raw) {
  const g = String(raw || '').trim();
  if (!g) return '未填年級';
  const lower = g.toLowerCase();
  const map = {
    '1': '1',
    '2': '2',
    '3': '3',
    '4': '4',
    一: '1',
    二: '2',
    三: '3',
    四: '4',
    大一: '1',
    大二: '2',
    大三: '3',
    大四: '4',
    一年級: '1',
    二年級: '2',
    三年級: '3',
    四年級: '4',
    'year 1': '1',
    'year 2': '2',
    'year 3': '3',
    'year 4': '4',
    'year1': '1',
    'year2': '2',
    'year3': '3',
    'year4': '4'
  };
  if (map[g]) return map[g];
  if (map[lower]) return map[lower];
  return g;
}

function resolveSkillCefrFromBest(best, skill) {
  if (!best) return null;
  const key = {
    listening: ['bestListeningCefr', 'bestListeningCefrRank'],
    reading: ['bestReadingCefr', 'bestReadingCefrRank'],
    speaking: ['bestSpeakingCefr', 'bestSpeakingCefrRank'],
    writing: ['bestWritingCefr', 'bestWritingCefrRank']
  }[skill];
  if (!key) return null;
  const [cefrField, rankField] = key;
  const rawCefr = best[cefrField];
  if (rawCefr != null && String(rawCefr).trim() !== '') {
    return String(rawCefr).trim().toUpperCase();
  }
  return getCefrFromRank(best[rankField]);
}

function buildRosterWhere(semesterId, options = {}) {
  const where = { semesterId };
  if (options.activeOnly !== false) where.isActive = true;
  return where;
}

async function getStudentMasterMap(studentIds) {
  if (!studentIds || studentIds.length === 0) return new Map();
  const masters = await EtStudentMaster.findAll({
    where: { studentId: { [Op.in]: studentIds } },
    attributes: ['studentId', 'name', 'dept']
  });
  return new Map(masters.map((row) => [String(row.studentId).trim(), row]));
}

async function getBestByStudentMap(semesterId, studentIds) {
  if (!studentIds || studentIds.length === 0) return new Map();
  const bestRows = await EtSemesterStudentBestSkill.findAll({
    where: {
      semesterId,
      studentId: { [Op.in]: studentIds }
    }
  });
  return new Map(bestRows.map((row) => [String(row.studentId).trim(), row]));
}

/**
 * 與 legacyAttemptScoreAdapter.dedupeAttemptsForDisplay 相同鍵：
 * studentId + COALESCE(examDate,testDate) + UPPER(TRIM(COALESCE(examType,testType,'')))
 * 每組只計 1 筆（與畫面去重後筆數一致）
 */
async function getDedupedAttemptCountByStudentMap(studentIds) {
  if (!studentIds || studentIds.length === 0) return new Map();
  const sequelize = EtExamAttempt.sequelize;
  const chunkSize = 400;
  const map = new Map();
  for (let i = 0; i < studentIds.length; i += chunkSize) {
    const chunk = studentIds.slice(i, i + chunkSize);
    const placeholders = chunk.map(() => '?').join(',');
    const [rows] = await sequelize.query(
      `
      SELECT sub.studentId AS studentId, COUNT(*) AS attemptCount
      FROM (
        SELECT
          studentId,
          COALESCE(examDate, testDate) AS d,
          UPPER(TRIM(COALESCE(examType, testType, ''))) AS examKind
        FROM et_exam_attempts
        WHERE studentId IN (${placeholders})
        GROUP BY
          studentId,
          COALESCE(examDate, testDate),
          UPPER(TRIM(COALESCE(examType, testType, '')))
      ) AS sub
      GROUP BY sub.studentId
      `,
      { replacements: chunk }
    );
    for (const r of rows) {
      map.set(String(r.studentId).trim(), Number(r.attemptCount || 0));
    }
  }
  return map;
}

async function getSemesterSummary(semesterId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const rosterWhere = buildRosterWhere(normalizedSemesterId, options);
  const rosterRows = await EtEnrollmentSnapshot.findAll({
    where: rosterWhere,
    attributes: ['studentId']
  });

  const rosterStudentIds = [...new Set(rosterRows.map((row) => String(row.studentId).trim()).filter(Boolean))];
  const rosterActiveStudentCount = rosterStudentIds.length;

  const bestByStudent = await getBestByStudentMap(normalizedSemesterId, rosterStudentIds);

  let validBestScoreStudentCount = 0;
  let attainedStudentCount = 0;
  let listeningCount = 0;
  let readingCount = 0;
  let speakingCount = 0;
  let writingCount = 0;

  for (const studentId of rosterStudentIds) {
    const best = bestByStudent.get(studentId);
    if (!best) continue;

    if (hasAnyBestSkillRank(best)) validBestScoreStudentCount += 1;
    if (hasAnyAttained(best, B2_RANK_THRESHOLD)) attainedStudentCount += 1;

    if (Number(best.bestListeningCefrRank || 0) >= B2_RANK_THRESHOLD) listeningCount += 1;
    if (Number(best.bestReadingCefrRank || 0) >= B2_RANK_THRESHOLD) readingCount += 1;
    if (Number(best.bestSpeakingCefrRank || 0) >= B2_RANK_THRESHOLD) speakingCount += 1;
    if (Number(best.bestWritingCefrRank || 0) >= B2_RANK_THRESHOLD) writingCount += 1;
  }

  return {
    semesterId: normalizedSemesterId,
    rosterActiveStudentCount,
    validBestScoreStudentCount,
    attainedStudentCount,
    attainmentRate: roundRate(attainedStudentCount, rosterActiveStudentCount),
    skills: {
      listening: { count: listeningCount, rate: roundRate(listeningCount, rosterActiveStudentCount) },
      reading: { count: readingCount, rate: roundRate(readingCount, rosterActiveStudentCount) },
      speaking: { count: speakingCount, rate: roundRate(speakingCount, rosterActiveStudentCount) },
      writing: { count: writingCount, rate: roundRate(writingCount, rosterActiveStudentCount) }
    }
  };
}

async function getSemesterStudents(semesterId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const rosterWhere = buildRosterWhere(normalizedSemesterId, options);
  const keyword = options.keyword != null ? String(options.keyword).trim() : '';
  const departmentKeyword = options.department != null ? String(options.department).trim() : '';
  if (options.grade) rosterWhere.grade = options.grade;

  const rosterRows = await EtEnrollmentSnapshot.findAll({
    where: rosterWhere,
    order: [['studentId', 'ASC']]
  });
  const studentIds = [...new Set(rosterRows.map((row) => String(row.studentId).trim()).filter(Boolean))];

  const [studentMasterByStudent, bestByStudent, attemptCountByStudent] = await Promise.all([
    getStudentMasterMap(studentIds),
    getBestByStudentMap(normalizedSemesterId, studentIds),
    getDedupedAttemptCountByStudentMap(studentIds)
  ]);

  let rows = rosterRows.map((roster) => {
    const studentId = String(roster.studentId).trim();
    const best = bestByStudent.get(studentId);
    const bestDisplay = best ? enrichBestSkillsCacheRow(best) : null;
    const attained = hasAnyAttained(best, B2_RANK_THRESHOLD);
    const studentMaster = studentMasterByStudent.get(studentId);
    const resolvedStudentName = roster.studentName || (studentMaster ? studentMaster.name : null) || null;
    const resolvedDepartment = roster.department || (studentMaster ? studentMaster.dept : null) || null;

    return {
      studentId,
      studentName: resolvedStudentName,
      grade: roster.grade || null,
      department: resolvedDepartment,
      bestListeningCefr: bestDisplay ? bestDisplay.bestListeningCefr || null : null,
      bestReadingCefr: bestDisplay ? bestDisplay.bestReadingCefr || null : null,
      bestSpeakingCefr: bestDisplay ? bestDisplay.bestSpeakingCefr || null : null,
      bestWritingCefr: bestDisplay ? bestDisplay.bestWritingCefr || null : null,
      attained,
      attemptCount: attemptCountByStudent.get(studentId) || 0
    };
  });

  if (keyword) {
    const kw = keyword.toLowerCase();
    rows = rows.filter((row) => {
      const sid = String(row.studentId || '').toLowerCase();
      const sname = String(row.studentName || '').toLowerCase();
      return sid.includes(kw) || sname.includes(kw);
    });
  }
  if (departmentKeyword) {
    const deptKw = departmentKeyword.toLowerCase();
    rows = rows.filter((row) => String(row.department || '').toLowerCase().includes(deptKw));
  }

  const attainedFilter = toBoolean(options.attained);
  if (attainedFilter != null) {
    rows = rows.filter((row) => row.attained === attainedFilter);
  }

  const totalRows = rows.length;

  if (options.all === true) {
    return {
      semesterId: normalizedSemesterId,
      items: rows,
      pagination: {
        limit: totalRows,
        offset: 0,
        total: totalRows,
        returned: totalRows
      }
    };
  }

  const offsetRaw = Number(options.offset);
  const limitRaw = Number(options.limit);
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0
    ? Math.min(Math.floor(limitRaw), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const pagedRows = rows.slice(offset, offset + limit);

  return {
    semesterId: normalizedSemesterId,
    items: pagedRows,
    pagination: {
      limit,
      offset,
      total: totalRows,
      returned: pagedRows.length
    }
  };
}

async function getStudentDetail(semesterId, studentId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const normalizedStudentId = validateStudentId(studentId);

  const rosterWhere = { semesterId: normalizedSemesterId, studentId: normalizedStudentId };
  if (options.activeOnly !== false) rosterWhere.isActive = true;

  const [roster, studentMaster, bestSkills, attempts] = await Promise.all([
    EtEnrollmentSnapshot.findOne({ where: rosterWhere }),
    EtStudentMaster.findOne({
      where: { studentId: normalizedStudentId },
      attributes: ['studentId', 'name', 'dept']
    }),
    EtSemesterStudentBestSkill.findOne({
      where: { semesterId: normalizedSemesterId, studentId: normalizedStudentId }
    }),
    EtExamAttempt.findAll({
      where: { studentId: normalizedStudentId },
      include: [
        { model: EtExamAttemptSkillScore, as: 'skillScores', required: false },
        { model: EtExamAttemptScore, as: 'scores', required: false }
      ]
    })
  ]);

  if (!roster) {
    throw createServiceError(
      'ROSTER_NOT_FOUND',
      `roster not found for semesterId=${normalizedSemesterId}, studentId=${normalizedStudentId}`,
      404
    );
  }

  const rosterJson = typeof roster.toJSON === 'function' ? roster.toJSON() : roster;
  if (rosterJson) {
    if (!rosterJson.studentName) rosterJson.studentName = (studentMaster && studentMaster.name) || rosterJson.studentName || null;
    if (!rosterJson.department) rosterJson.department = (studentMaster && studentMaster.dept) || rosterJson.department || null;
  }

  const dedupedAttempts = dedupeAttemptsForDisplay(attempts);
  const sortedAttempts = Array.isArray(dedupedAttempts)
    ? [...dedupedAttempts].sort((a, b) => {
      const da = new Date(a.examDate || a.testDate || 0).getTime();
      const db = new Date(b.examDate || b.testDate || 0).getTime();
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    })
    : [];

  const attemptsJson = sortedAttempts.map((row) => toV2AttemptJson(row));
  const cachedEnriched = bestSkills ? enrichBestSkillsCacheRow(bestSkills) : null;
  const computedFromAttempts = computeBestSkillsFromAttemptsJson(attemptsJson);
  const bestSkillsJson = mergeBestSkillsCacheAndComputed(cachedEnriched, computedFromAttempts);

  return {
    roster: rosterJson,
    bestSkills: bestSkillsJson,
    attempts: attemptsJson
  };
}

async function getSemesterDepartmentStats(semesterId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const rosterRows = await EtEnrollmentSnapshot.findAll({
    where: buildRosterWhere(normalizedSemesterId, options),
    order: [['studentId', 'ASC']]
  });
  const studentIds = [...new Set(rosterRows.map((row) => String(row.studentId).trim()).filter(Boolean))];
  const [studentMasterByStudent, bestByStudent, attemptCountByStudent] = await Promise.all([
    getStudentMasterMap(studentIds),
    getBestByStudentMap(normalizedSemesterId, studentIds),
    getDedupedAttemptCountByStudentMap(studentIds)
  ]);

  const gradeKeys = ['1', '2', '3', '4'];
  const byDepartment = {};
  for (const roster of rosterRows) {
    const sid = String(roster.studentId).trim();
    const master = studentMasterByStudent.get(sid);
    const dept = (roster.department || (master && master.dept) || '未列出系所').trim();
    const grade = String(roster.grade || '').trim();
    const best = bestByStudent.get(sid);
    const attemptCount = attemptCountByStudent.get(sid) || 0;
    const hasRecord = hasAnyBestSkillRank(best) || attemptCount > 0;

    if (!byDepartment[dept]) {
      byDepartment[dept] = {
        department: dept,
        total: 0,
        recorded: 0,
        grades: {
          '1': { total: 0, recorded: 0 },
          '2': { total: 0, recorded: 0 },
          '3': { total: 0, recorded: 0 },
          '4': { total: 0, recorded: 0 }
        }
      };
    }
    byDepartment[dept].total += 1;
    if (hasRecord) byDepartment[dept].recorded += 1;
    if (gradeKeys.includes(grade)) {
      byDepartment[dept].grades[grade].total += 1;
      if (hasRecord) byDepartment[dept].grades[grade].recorded += 1;
    }
  }

  const items = Object.values(byDepartment)
    .map((row) => ({
      ...row,
      recordRate: row.total > 0 ? Number((row.recorded / row.total).toFixed(4)) : 0
    }))
    .sort((a, b) => b.recordRate - a.recordRate || a.department.localeCompare(b.department));

  return {
    semesterId: normalizedSemesterId,
    rosterStudentCount: studentIds.length,
    items
  };
}

async function getSemesterCefrDistribution(semesterId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const rosterRows = await EtEnrollmentSnapshot.findAll({
    where: buildRosterWhere(normalizedSemesterId, options),
    attributes: ['studentId', 'grade']
  });
  const studentIds = [...new Set(rosterRows.map((row) => String(row.studentId).trim()).filter(Boolean))];
  const bestByStudent = await getBestByStudentMap(normalizedSemesterId, studentIds);
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NO_DATA'];
  const levelsForCount = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const skills = ['listening', 'reading', 'speaking', 'writing'];
  const gradeSet = [...new Set(rosterRows.map((r) => normalizeGradeBucket(r.grade)))].sort((a, b) => {
    const order = ['1', '2', '3', '4', '未填年級'];
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return String(a).localeCompare(String(b));
  });

  const byGrade = {};
  for (const grade of gradeSet) {
    byGrade[grade] = { total: 0, skills: {} };
    for (const skill of skills) {
      byGrade[grade].skills[skill] = { NO_DATA: 0 };
      levelsForCount.forEach((lv) => { byGrade[grade].skills[skill][lv] = 0; });
    }
  }

  for (const roster of rosterRows) {
    const grade = normalizeGradeBucket(roster.grade);
    if (!byGrade[grade]) {
      byGrade[grade] = { total: 0, skills: {} };
      for (const skill of skills) {
        byGrade[grade].skills[skill] = { NO_DATA: 0 };
        levelsForCount.forEach((lv) => { byGrade[grade].skills[skill][lv] = 0; });
      }
    }
    byGrade[grade].total += 1;
    const sid = String(roster.studentId).trim();
    const best = bestByStudent.get(sid);
    for (const skill of skills) {
      const lv = resolveSkillCefrFromBest(best, skill);
      if (lv && levelsForCount.includes(lv)) byGrade[grade].skills[skill][lv] += 1;
      else byGrade[grade].skills[skill].NO_DATA += 1;
    }
  }

  return {
    semesterId: normalizedSemesterId,
    levels,
    skills,
    grades: gradeSet.map((grade) => ({
      grade,
      total: byGrade[grade].total,
      skills: byGrade[grade].skills
    }))
  };
}

async function getSemesterDataQuality(semesterId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const rosterRows = await EtEnrollmentSnapshot.findAll({
    where: buildRosterWhere(normalizedSemesterId, options)
  });
  const rosterStudentIds = [...new Set(rosterRows.map((row) => String(row.studentId).trim()).filter(Boolean))];
  const [bestByStudent, attemptCountByStudent, studentMasterByStudent] = await Promise.all([
    getBestByStudentMap(normalizedSemesterId, rosterStudentIds),
    getDedupedAttemptCountByStudentMap(rosterStudentIds),
    getStudentMasterMap(rosterStudentIds)
  ]);

  let noScoreStudentCount = 0;
  let missingNameCount = 0;
  let missingDepartmentCount = 0;
  let missingGradeCount = 0;
  for (const row of rosterRows) {
    const sid = String(row.studentId).trim();
    const master = studentMasterByStudent.get(sid);
    const resolvedName = row.studentName || (master && master.name) || null;
    const resolvedDept = row.department || (master && master.dept) || null;

    const best = bestByStudent.get(sid);
    const attemptCount = attemptCountByStudent.get(sid) || 0;
    if (!hasAnyBestSkillRank(best) && attemptCount === 0) noScoreStudentCount += 1;
    if (!resolvedName) missingNameCount += 1;
    if (!resolvedDept) missingDepartmentCount += 1;
    if (!row.grade) missingGradeCount += 1;
  }

  const allBestRows = await EtSemesterStudentBestSkill.findAll({
    where: { semesterId: normalizedSemesterId },
    attributes: ['studentId']
  });
  const rosterIdSet = new Set(rosterStudentIds);
  const orphanBestSkillCount = allBestRows.filter((row) => !rosterIdSet.has(String(row.studentId).trim())).length;

  const n = rosterRows.length;
  const totalRosterFields = n * 3;
  const filledRosterFields = totalRosterFields - missingNameCount - missingDepartmentCount - missingGradeCount;

  return {
    semesterId: normalizedSemesterId,
    kpis: {
      rosterStudentCount: rosterStudentIds.length,
      noScoreStudentCount,
      orphanBestSkillCount,
      missingNameCount,
      missingDepartmentCount,
      missingGradeCount
    },
    rates: {
      scoreCoverageRate: roundRate(rosterStudentIds.length - noScoreStudentCount, rosterStudentIds.length),
      /** 姓名／系所／年級 三欄位填寫比例（0～1），已用學籍主檔補齊缺漏後再計算 */
      rosterCompletenessRate: roundRate(filledRosterFields, totalRosterFields),
      nameFillRate: roundRate(n - missingNameCount, n),
      departmentFillRate: roundRate(n - missingDepartmentCount, n),
      gradeFillRate: roundRate(n - missingGradeCount, n)
    }
  };
}

async function getSemesterImportHistories(semesterId, options = {}) {
  const normalizedSemesterId = validateSemesterId(semesterId);
  const limitRaw = Number(options.limit);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), MAX_LIMIT) : 100;
  const rows = await EtAttemptImportHistory.findAll({
    where: { semesterId: normalizedSemesterId },
    order: [['importedAt', 'DESC'], ['id', 'DESC']],
    limit
  });

  const items = rows.map((row) => {
    const json = typeof row.toJSON === 'function' ? row.toJSON() : row;
    return {
      id: json.id,
      importBatchId: json.importBatchId,
      importName: json.importName,
      importedAt: json.importedAt,
      operatorId: json.operatorId || null,
      importedCount: Number(json.importedCount || 0),
      skippedCount: Number(json.skippedCount || 0),
      errorCount: Number(json.errorCount || 0),
      beforeStats: json.beforeStats || null,
      afterStats: json.afterStats || null,
      deltaStats: json.deltaStats || null,
      newB2BySkill: json.newB2BySkill || null
    };
  });
  return { semesterId: normalizedSemesterId, items };
}

module.exports = {
  getSemesterSummary,
  getSemesterStudents,
  getStudentDetail,
  getSemesterDepartmentStats,
  getSemesterCefrDistribution,
  getSemesterDataQuality,
  getSemesterImportHistories,
  B2_RANK_THRESHOLD
};
