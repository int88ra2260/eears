'use strict';

const { Op } = require('sequelize');
const {
  EtEnrollmentSnapshot,
  Student,
  EtExamAttempt,
  EtExamAttemptSkillScore,
  ActivityParticipation,
  CourseEnrollment,
  Course,
  ExamRegistration,
  BestepAttendance,
  BestepExamScore
} = require('../../models');
const { getStudentBestSkillsWithSource, getStudentsBestSkillsMap, SKILLS } = require('./bestSkillService');
const { getCefrFromRank } = require('./utils/cefr');

const B2_RANK = 4;
const EMPTY_SKILLS = { listening: null, reading: null, speaking: null, writing: null };

function normSid(v) {
  return String(v || '').trim().toUpperCase();
}

function text(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function examDateOfAttempt(att) {
  return text(att.testDate || att.examDate);
}

function examTypeOfAttempt(att) {
  return text(att.testType || att.examType || att.sourceType || att.source);
}

function buildAttemptSkills(skillRows) {
  const skills = { ...EMPTY_SKILLS };
  for (const row of skillRows || []) {
    const j = typeof row.toJSON === 'function' ? row.toJSON() : row;
    if (!SKILLS.includes(j.skill)) continue;
    skills[j.skill] = {
      score: j.rawScore == null ? null : String(j.rawScore),
      cefr: j.cefr || null
    };
  }
  return skills;
}

function buildWarning(section, code, message) {
  return { section, code, message };
}

function resolveRank(score) {
  const n = Number(score?.cefrRank);
  if (Number.isFinite(n) && n >= 1 && n <= 6) return n;
  return null;
}

/**
 * @param {string} semesterId
 * @param {{ limit?: number, offset?: number }} opts
 */
async function getSemesterStudents(semesterId, opts = {}) {
  const sem = String(semesterId || '').trim();
  const lim = Math.min(Math.max(parseInt(opts.limit, 10) || 50, 1), 200);
  const off = Math.max(parseInt(opts.offset, 10) || 0, 0);
  const hasAllowedFilter = Array.isArray(opts.allowedStudentIds);
  const allowSet = new Set((opts.allowedStudentIds || []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean));
  const where = { semesterId: sem, isActive: true };
  if (hasAllowedFilter) {
    if (!allowSet.size) {
      return {
        semesterId: sem,
        items: [],
        pagination: { limit: lim, offset: off, total: 0, returned: 0 }
      };
    }
    where.studentId = { [Op.in]: [...allowSet] };
  }

  const { rows, count } = await EtEnrollmentSnapshot.findAndCountAll({
    where,
    order: [['studentId', 'ASC']],
    limit: lim,
    offset: off
  });

  const ids = rows.map((r) => String(r.studentId || '').trim().toUpperCase()).filter(Boolean);
  const bestMap = await getStudentsBestSkillsMap(ids);

  const items = rows.map((snap) => {
    const sid = String(snap.studentId || '').trim().toUpperCase();
    const best = bestMap.get(sid) || {};
    const attained = {};
    for (const sk of SKILLS) {
      const cell = best[sk];
      attained[sk] = !!(cell && Number(cell.rank) >= B2_RANK);
    }
    return {
      studentId: sid,
      studentName: snap.studentName,
      department: snap.department,
      college: snap.college,
      className: snap.className,
      grade: snap.grade,
      bestSkills: best,
      attained
    };
  });

  return {
    semesterId: sem,
    items,
    pagination: { limit: lim, offset: off, total: count, returned: items.length }
  };
}

/**
 * @param {string} studentId
 * @param {{ semesterId?: string }} opts
 */
async function getStudentProfile(studentId, opts = {}) {
  const sid = normSid(studentId);
  const sem = text(opts.semesterId);
  if (!sid) {
    return { error: 'studentId 必填' };
  }

  const warnings = [];
  let latestSnapshot;
  let studentMaster;
  let bestSkills;
  let attempts;
  try {
    latestSnapshot = sem
      ? await EtEnrollmentSnapshot.findOne({
        where: { studentId: sid, semesterId: sem, isActive: true }
      })
      : await EtEnrollmentSnapshot.findOne({
        where: { studentId: sid, isActive: true },
        order: [['semesterId', 'DESC']]
      });
    [studentMaster, bestSkills, attempts] = await Promise.all([
      Student.findOne({ where: { studentId: sid } }),
      getStudentBestSkillsWithSource(sid),
      EtExamAttempt.findAll({
        where: { studentId: sid, status: 'valid' },
        include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }],
        order: [
          ['testDate', 'DESC'],
          ['examDate', 'DESC'],
          ['id', 'DESC']
        ]
      })
    ]);
  } catch (e) {
    throw e;
  }

  const dedupe = new Set();
  const examAttempts = [];
  for (const a of attempts) {
    const examDate = examDateOfAttempt(a);
    const examType = examTypeOfAttempt(a);
    const key = `${sid}|${examDate || ''}|${examType || ''}`;
    if (dedupe.has(key)) continue;
    dedupe.add(key);
    examAttempts.push({
      id: a.id,
      examType,
      examDate,
      skills: buildAttemptSkills(a.skillScores || [])
    });
  }

  let activitySummary = { byType: [], records: [] };
  try {
    const activityRows = await ActivityParticipation.findAll({
      where: sem ? { studentId: sid, semesterId: sem } : { studentId: sid },
      order: [['id', 'DESC']]
    });
    const activityMap = new Map();
    for (const row of activityRows) {
      const type = text(row.activityType) || 'UNKNOWN';
      if (!activityMap.has(type)) {
        activityMap.set(type, { activityType: type, signedIn: 0, absent: 0, cancelled: 0 });
      }
      const stat = activityMap.get(type);
      const status = text(row.attendanceStatus) || '';
      if (status === 'attended') stat.signedIn += 1;
      else if (status === 'absent') stat.absent += 1;
      else if (status === 'cancelled') stat.cancelled += 1;
    }
    activitySummary = { byType: [...activityMap.values()], records: [] };
  } catch (_) {
    warnings.push(buildWarning('activitySummary', 'ACTIVITY_SOURCE_UNAVAILABLE', '活動參與資料來源暫時不可用'));
  }

  let courseRecords = [];
  try {
    const courseRows = await CourseEnrollment.findAll({
      where: sem ? { studentId: sid, semesterId: sem } : { studentId: sid },
      include: [{ model: Course, as: 'course', required: false }],
      order: [['semesterId', 'DESC'], ['id', 'DESC']]
    });
    courseRecords = courseRows.map((row) => ({
      semesterId: row.semesterId,
      courseCode: row.course?.courseCode || null,
      courseName: row.course?.courseName || null,
      enrollmentStatus: row.enrollmentStatus || null,
      finalScore: row.finalScore == null ? null : String(row.finalScore),
      passStatus: row.passStatus || null
    }));
  } catch (_) {
    warnings.push(buildWarning('courseRecords', 'COURSE_SOURCE_UNAVAILABLE', '修課資料來源暫時不可用'));
    courseRecords = [];
  }

  let bestepRecords = [];
  try {
    const [regRows, attendanceRows, scoreRows] = await Promise.all([
      ExamRegistration.findAll({
        where: sem ? { studentId: sid, semesterId: sem } : { studentId: sid },
        order: [['semesterId', 'DESC'], ['id', 'DESC']]
      }),
      BestepAttendance.findAll({
        where: sem ? { studentId: sid, semester: sem } : { studentId: sid },
        order: [['semester', 'DESC'], ['examDate', 'DESC']]
      }),
      BestepExamScore.findAll({
        where: sem ? { studentId: sid, semester: sem } : { studentId: sid },
        order: [['semester', 'DESC'], ['examDate', 'DESC']]
      })
    ]);
    const bestepMap = new Map();
    const bestepKey = (semesterId, scope) => `${semesterId || ''}::${scope || ''}`;
    for (const reg of regRows) {
      const key = bestepKey(reg.semesterId, reg.examScope);
      if (!bestepMap.has(key)) bestepMap.set(key, { semesterId: reg.semesterId, examScope: reg.examScope, registrationStatus: null, attendanceStatus: null, score: null });
      bestepMap.get(key).registrationStatus = reg.status || null;
    }
    for (const at of attendanceRows) {
      const key = bestepKey(at.semester, at.examType);
      if (!bestepMap.has(key)) bestepMap.set(key, { semesterId: at.semester, examScope: at.examType, registrationStatus: null, attendanceStatus: null, score: null });
      bestepMap.get(key).attendanceStatus = at.attended ? 'attended' : 'absent';
    }
    for (const sc of scoreRows) {
      const key = bestepKey(sc.semester, 'ALL');
      if (!bestepMap.has(key)) bestepMap.set(key, { semesterId: sc.semester, examScope: 'ALL', registrationStatus: null, attendanceStatus: null, score: null });
      bestepMap.get(key).score = {
        listening: sc.listeningScore == null ? null : String(sc.listeningScore),
        reading: sc.readingScore == null ? null : String(sc.readingScore),
        speaking: sc.speakingScore == null ? null : String(sc.speakingScore),
        writing: sc.writingScore == null ? null : String(sc.writingScore),
        overallLevel: sc.overallLevel || null
      };
    }
    bestepRecords = [...bestepMap.values()].sort((a, b) => String(b.semesterId || '').localeCompare(String(a.semesterId || '')));
  } catch (_) {
    warnings.push(buildWarning('bestepRecords', 'BESTEP_SOURCE_UNAVAILABLE', '培力英檢資料來源暫時不可用'));
    bestepRecords = [];
  }

  const studentPayload = {
    studentId: sid,
    studentName: latestSnapshot?.studentName || studentMaster?.nameZh || null,
    currentSemester: sem || latestSnapshot?.semesterId || null,
    department: latestSnapshot?.department || studentMaster?.departmentName || null,
    college: latestSnapshot?.college || null,
    className: latestSnapshot?.className || null,
    grade: latestSnapshot?.grade || (studentMaster?.grade == null ? null : String(studentMaster.grade))
  };

  return {
    student: studentPayload,
    bestSkills,
    examAttempts,
    activitySummary,
    courseRecords,
    bestepRecords,
    warnings
  };
}

/**
 * 依 examDate 建立四技能趨勢：
 * - 依日期排序
 * - 同一天同技能取最高 CEFR(rank)
 * @param {string} studentId
 */
async function getStudentTrends(studentId) {
  const sid = normSid(studentId);
  if (!sid) return { error: 'studentId 必填' };

  const attempts = await EtExamAttempt.findAll({
    where: { studentId: sid, status: 'valid' },
    include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }],
    order: [
      ['testDate', 'ASC'],
      ['examDate', 'ASC'],
      ['id', 'ASC']
    ]
  });

  const daySkillMax = new Map();
  for (const att of attempts) {
    const examDate = examDateOfAttempt(att);
    if (!examDate) continue;
    for (const row of att.skillScores || []) {
      const j = typeof row.toJSON === 'function' ? row.toJSON() : row;
      if (!SKILLS.includes(j.skill)) continue;
      const rank = resolveRank(j);
      if (!rank) continue;
      const key = `${examDate}|${j.skill}`;
      const prev = daySkillMax.get(key);
      if (!prev || rank > prev.rank) {
        daySkillMax.set(key, {
          examDate,
          skill: j.skill,
          rank,
          cefr: j.cefr || getCefrFromRank(rank)
        });
      }
    }
  }

  const series = { listening: [], reading: [], speaking: [], writing: [] };
  for (const item of daySkillMax.values()) {
    series[item.skill].push({
      examDate: item.examDate,
      rank: item.rank,
      cefr: item.cefr
    });
  }
  for (const sk of SKILLS) {
    series[sk].sort((a, b) => String(a.examDate).localeCompare(String(b.examDate)));
  }

  return { studentId: sid, series, warnings: [] };
}

module.exports = {
  getSemesterStudents,
  getStudentProfile,
  getStudentTrends
};
