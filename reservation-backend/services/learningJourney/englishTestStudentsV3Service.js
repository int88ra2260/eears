'use strict';

const { Op } = require('sequelize');
const {
  StudentSemesterProfile,
  Student,
  ExamAttempt,
  ExamAttemptSkillScore,
  EtEnrollmentSnapshot
} = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');
const { compareBestScoreCandidate, getCefrRank } = require('./utils/cefrRules');
const { getCefrFromRank } = require('../englishTestTracking/cefrMappingService');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];
const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;
const B2_RANK = getCefrRank('B2') || 4;

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
  return getCefrRank(row.cefrLevel) || null;
}

function toCandidate(row, attempt) {
  const rank = resolveSkillRank(row);
  const lvl = row.cefrLevel ? String(row.cefrLevel).trim().toUpperCase() : null;
  return {
    cefrLevel: lvl && ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(lvl) ? lvl : null,
    cefrRank: rank != null ? Number(rank) : -1,
    rawScore: row.rawScore != null && row.rawScore !== '' ? Number(row.rawScore) : -1,
    examDate: attempt.examDate,
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
  if (Number(cell.cefrRank || 0) > 0) return getCefrFromRank(cell.cefrRank) || null;
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
 * LJS 學生列表（對齊 V2 getSemesterStudents 欄位）。
 * options.all === true 時不分頁，供 compare 使用。
 */
async function getEnglishTestStudentsV3(semesterIdRaw, options = {}) {
  const warnings = [];
  const semesterId = String(semesterIdRaw || '').trim();

  if (!isValidSemesterId(semesterId)) {
    pushWarning(warnings, 'INVALID_SEMESTER_ID', 'semesterId 格式不正確', 'error');
    return emptyStudents(semesterId, warnings, 'semesterId 格式不正確');
  }

  let profiles = [];
  try {
    profiles = await StudentSemesterProfile.findAll({
      where: { semesterId, isRostered: true },
      include: [
        {
          model: Student,
          as: 'student',
          attributes: ['studentId', 'nameZh', 'nameEn', 'departmentName', 'departmentCode', 'grade'],
          required: false
        }
      ],
      order: [['studentId', 'ASC']]
    });
  } catch (e) {
    pushWarning(warnings, 'PROFILE_QUERY_FAILED', e.message || '查詢失敗', 'error');
    return emptyStudents(semesterId, warnings, e.message);
  }

  const studentPks = profiles.map((p) => p.studentPk).filter((x) => x != null);
  const normIds = [...new Set(profiles.map((p) => normSid(p.studentId)).filter(Boolean))];

  const etById = new Map();
  if (normIds.length) {
    try {
      const etRows = await EtEnrollmentSnapshot.findAll({
        where: { semesterId, isActive: true, studentId: { [Op.in]: normIds } },
        attributes: ['studentId', 'studentName', 'department', 'grade']
      });
      for (const r of etRows) {
        etById.set(normSid(r.studentId), r);
      }
    } catch (_) {
      /* 僅補齊年級／系所，失敗可略 */
    }
  }

  let attempts = [];
  if (studentPks.length) {
    try {
      attempts = await ExamAttempt.findAll({
        where: {
          semesterId,
          studentPk: { [Op.in]: studentPks },
          status: 'valid'
        },
        include: [{ model: ExamAttemptSkillScore, as: 'skillScores', required: false }]
      });
    } catch (e) {
      pushWarning(warnings, 'ATTEMPTS_QUERY_FAILED', e.message || 'exam_attempts 查詢失敗');
      return emptyStudents(semesterId, warnings, e.message);
    }
  }

  const byPk = new Map();
  for (const a of attempts) {
    if (!byPk.has(a.studentPk)) byPk.set(a.studentPk, []);
    byPk.get(a.studentPk).push(a);
  }

  let rows = profiles.map((prof) => {
    const sid = normSid(prof.studentId);
    const stu = prof.student;
    const et = etById.get(sid);
    const attList = byPk.get(prof.studentPk) || [];
    const best = mergeBestForStudent(attList);
    return {
      studentId: sid,
      studentName: (stu && stu.nameZh) || (et && et.studentName) || sid,
      grade: et && et.grade != null ? et.grade : stu && stu.grade != null ? String(stu.grade) : null,
      department: (et && et.department) || (stu && stu.departmentName) || null,
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

function rowKey(row) {
  return normSid(row && row.studentId);
}

function cefrNorm(v) {
  if (v == null || v === '') return '';
  return String(v).trim().toUpperCase();
}

function rowDiffers(legacyRow, v3Row) {
  if (!legacyRow || !v3Row) return true;
  if (Boolean(legacyRow.attained) !== Boolean(v3Row.attained)) return true;
  if (cefrNorm(legacyRow.bestListeningCefr) !== cefrNorm(v3Row.bestListeningCefr)) return true;
  if (cefrNorm(legacyRow.bestReadingCefr) !== cefrNorm(v3Row.bestReadingCefr)) return true;
  if (cefrNorm(legacyRow.bestSpeakingCefr) !== cefrNorm(v3Row.bestSpeakingCefr)) return true;
  if (cefrNorm(legacyRow.bestWritingCefr) !== cefrNorm(v3Row.bestWritingCefr)) return true;
  return false;
}

async function compareEnglishTestStudents(semesterIdRaw) {
  const englishTestReportService = require('../englishTestTracking/englishTestReportService');
  const semesterId = String(semesterIdRaw || '').trim();

  if (!isValidSemesterId(semesterId)) {
    return {
      semesterId,
      legacyCount: 0,
      v3Count: 0,
      diffCount: 0,
      sampleDiff: [],
      status: 'error',
      error: 'semesterId 格式不正確'
    };
  }

  let legacyRes = null;
  let legacyErr = null;
  try {
    legacyRes = await englishTestReportService.getSemesterStudents(semesterId, { all: true, activeOnly: true });
  } catch (e) {
    legacyErr = e.message || String(e);
  }
  if (legacyErr) {
    return {
      semesterId,
      legacyCount: 0,
      v3Count: 0,
      diffCount: 0,
      sampleDiff: [],
      status: 'error',
      legacyError: legacyErr,
      v3Error: null
    };
  }

  let v3Res = null;
  let v3Err = null;
  try {
    v3Res = await getEnglishTestStudentsV3(semesterId, { all: true });
    if (v3Res.error) v3Err = v3Res.error;
  } catch (e) {
    v3Err = e.message || String(e);
  }
  if (v3Err) {
    return {
      semesterId,
      legacyCount: (legacyRes && legacyRes.items) ? legacyRes.items.length : 0,
      v3Count: 0,
      diffCount: 0,
      sampleDiff: [],
      status: 'error',
      legacyError: null,
      v3Error: v3Err
    };
  }

  const legacyItems = (legacyRes && legacyRes.items) || [];
  const v3Items = (v3Res && v3Res.items) || [];
  const legacyCount = legacyItems.length;
  const v3Count = v3Items.length;

  const legacyMap = new Map();
  for (const r of legacyItems) legacyMap.set(rowKey(r), r);
  const v3Map = new Map();
  for (const r of v3Items) v3Map.set(rowKey(r), r);

  const allIds = new Set([...legacyMap.keys(), ...v3Map.keys()]);
  const differingIds = [];
  for (const id of allIds) {
    const L = legacyMap.get(id);
    const V = v3Map.get(id);
    if (!L || !V) {
      differingIds.push(id);
      continue;
    }
    if (rowDiffers(L, V)) differingIds.push(id);
  }

  const diffCount = differingIds.length;
  const sampleDiff = [];
  const SAMPLE = 20;
  for (let i = 0; i < Math.min(SAMPLE, differingIds.length); i += 1) {
    const id = differingIds[i];
    sampleDiff.push({
      studentId: id,
      legacy: legacyMap.get(id) || null,
      v3: v3Map.get(id) || null
    });
  }

  const status = diffCount === 0 ? 'ok' : 'warning';

  return {
    semesterId,
    legacyCount,
    v3Count,
    diffCount,
    sampleDiff,
    status,
    legacyError: null,
    v3Error: null
  };
}

module.exports = {
  getEnglishTestStudentsV3,
  compareEnglishTestStudents
};
