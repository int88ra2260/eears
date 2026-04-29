'use strict';

const { Op } = require('sequelize');
const {
  EtEnrollmentSnapshot,
  EtExamAttempt,
  EtExamAttemptSkillScore
} = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');
const { compareBestScoreCandidate, getCefrRank } = require('./utils/cefrRules');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const B2_RANK = getCefrRank('B2') || 4;
const CEFR_BY_RANK = Object.freeze({
  1: 'A1',
  2: 'A2',
  3: 'B1',
  4: 'B2',
  5: 'C1',
  6: 'C2'
});

function normSid(s) {
  return String(s || '').trim().toUpperCase();
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

function pushWarning(warnings, code, message, severity = 'warning') {
  warnings.push({ code, message: String(message || ''), severity });
}

function resolveSkillRank(row) {
  if (row.cefrRank != null && row.cefrRank !== '') {
    const n = Number(row.cefrRank);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return getCefrRank(row.cefr || row.cefrLevel) || null;
}

function toCandidate(row, attempt) {
  const rank = resolveSkillRank(row);
  const lvl = (row.cefr || row.cefrLevel) ? String(row.cefr || row.cefrLevel).trim().toUpperCase() : null;
  return {
    cefrLevel: lvl && ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(lvl) ? lvl : null,
    cefrRank: rank != null ? Number(rank) : -1,
    rawScore: row.rawScore != null && row.rawScore !== '' ? Number(row.rawScore) : -1,
    examDate: attempt.testDate || attempt.examDate,
    id: attempt.id
  };
}

function mergeBestForStudent(attempts) {
  const best = { listening: null, reading: null, speaking: null, writing: null };
  for (const att of attempts) {
    if (String(att.status || '') !== 'valid') continue;
    const scores = att.skillScores || [];
    for (const row of scores) {
      const skill = row.skill;
      if (!SKILLS.includes(skill)) continue;
      const cand = toCandidate(row, att);
      if (!best[skill]) best[skill] = cand;
      else if (compareBestScoreCandidate(cand, best[skill]) > 0) best[skill] = cand;
    }
  }
  return best;
}

function cefrDisplayFromBestCell(cell) {
  if (!cell) return null;
  if (cell.cefrLevel) return cell.cefrLevel;
  if (Number(cell.cefrRank || 0) > 0) return CEFR_BY_RANK[Number(cell.cefrRank)] || null;
  return null;
}

function attainedFromBest(best) {
  return SKILLS.some((s) => {
    const x = best[s];
    return x && Number(x.cefrRank || 0) >= B2_RANK;
  });
}

function countValidAttempts(attempts) {
  return (attempts || []).filter((a) => String(a.status || '') === 'valid').length;
}

function emptyStudents(semesterId, warnings, err) {
  return {
    semesterId,
    items: [],
    pagination: { limit: DEFAULT_LIMIT, offset: 0, total: 0, returned: 0 },
    source: 'learning_journey_v3',
    dataQuality: { warnings },
    ...(err ? { error: err } : {})
  };
}

/**
 * V3 學生列表，以 et_enrollment_snapshots 與 et_exam_attempts/skill_scores 為來源。
 * options.all === true 時不分頁，供 readiness 內部檢查使用。
 */
async function getEnglishTestStudentsV3(semesterIdRaw, options = {}) {
  const warnings = [];
  const semesterId = String(semesterIdRaw || '').trim();

  if (!isValidSemesterId(semesterId)) {
    pushWarning(warnings, 'INVALID_SEMESTER_ID', 'semesterId 格式不正確', 'error');
    return emptyStudents(semesterId, warnings, 'semesterId 格式不正確');
  }

  let rosterRows = [];
  try {
    rosterRows = await EtEnrollmentSnapshot.findAll({
      where: { semesterId, isActive: true },
      order: [['studentId', 'ASC']]
    });
  } catch (e) {
    pushWarning(warnings, 'PROFILE_QUERY_FAILED', e.message || '查詢失敗', 'error');
    return emptyStudents(semesterId, warnings, e.message);
  }

  const normIds = [...new Set(rosterRows.map((p) => normSid(p.studentId)).filter(Boolean))];

  let attempts = [];
  if (normIds.length) {
    try {
      attempts = await EtExamAttempt.findAll({
        where: {
          studentId: { [Op.in]: normIds },
          status: 'valid'
        },
        include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }]
      });
    } catch (e) {
      pushWarning(warnings, 'ATTEMPTS_QUERY_FAILED', e.message || 'et_exam_attempts 查詢失敗');
      return emptyStudents(semesterId, warnings, e.message);
    }
  }

  const byStudentId = new Map();
  for (const a of attempts) {
    const sid = normSid(a.studentId);
    if (!byStudentId.has(sid)) byStudentId.set(sid, []);
    byStudentId.get(sid).push(a);
  }

  let rows = rosterRows.map((prof) => {
    const sid = normSid(prof.studentId);
    const attList = byStudentId.get(sid) || [];
    const best = mergeBestForStudent(attList);
    return {
      studentId: sid,
      studentName: prof.studentName || sid,
      grade: prof.grade != null ? String(prof.grade) : null,
      department: prof.department || null,
      bestListeningCefr: cefrDisplayFromBestCell(best.listening),
      bestReadingCefr: cefrDisplayFromBestCell(best.reading),
      bestSpeakingCefr: cefrDisplayFromBestCell(best.speaking),
      bestWritingCefr: cefrDisplayFromBestCell(best.writing),
      attained: attainedFromBest(best),
      attemptCount: countValidAttempts(attList)
    };
  });

  const keyword = options.keyword != null ? String(options.keyword).trim() : '';
  const departmentKeyword = options.department != null ? String(options.department).trim() : '';
  if (options.grade) {
    const g = String(options.grade).trim();
    rows = rows.filter((row) => String(row.grade || '').trim() === g);
  }
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
      semesterId,
      items: rows,
      pagination: {
        limit: totalRows,
        offset: 0,
        total: totalRows,
        returned: totalRows
      },
      source: 'learning_journey_v3',
      dataQuality: { warnings }
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
    semesterId,
    items: pagedRows,
    pagination: {
      limit,
      offset,
      total: totalRows,
      returned: pagedRows.length
    },
    source: 'learning_journey_v3',
    dataQuality: { warnings }
  };
}

module.exports = {
  getEnglishTestStudentsV3
};
