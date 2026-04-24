'use strict';

const {
  Student,
  StudentSemesterProfile,
  ExamAttempt,
  ExamAttemptSkillScore,
  ExamRegistration,
  ActivityParticipation,
  EtEnrollmentSnapshot
} = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');
const { getCefrRank, getCefrFromRank } = require('../englishTestTracking/cefrMappingService');
const { computeBestSkillsFromAttemptsJson } = require('../englishTestTracking/legacyAttemptScoreAdapter');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

function normSid(s) {
  return String(s || '').trim().toUpperCase();
}

function pushWarning(warnings, code, message, severity = 'warning') {
  warnings.push({ code, message: String(message || ''), severity });
}

function ljsAttemptToFrontendJson(att) {
  const plain = typeof att.toJSON === 'function' ? att.toJSON() : att;
  const scores = (plain.skillScores || []).map((s) => {
    const row = typeof s.toJSON === 'function' ? s.toJSON() : s;
    const cefrLvl = row.cefrLevel ? String(row.cefrLevel).trim().toUpperCase() : null;
    let rank = row.cefrRank != null && row.cefrRank !== '' ? Number(row.cefrRank) : null;
    if (!Number.isFinite(rank) && cefrLvl) rank = getCefrRank(cefrLvl);
    const cefr = cefrLvl || (Number.isFinite(rank) ? getCefrFromRank(rank) : null);
    return {
      id: row.id,
      skill: row.skill,
      rawScore: row.rawScore != null && row.rawScore !== '' ? Number(row.rawScore) : null,
      cefr: cefr || null,
      cefrRank: Number.isFinite(rank) ? rank : null
    };
  }).filter((s) => SKILLS.includes(s.skill));
  return {
    id: plain.id,
    examType: plain.sourceType || plain.examVendor || 'LJS',
    examDate: plain.examDate || null,
    skillScores: scores
  };
}

function buildRosterJson(profile, student, etSnap) {
  const sid = profile ? normSid(profile.studentId) : student ? normSid(student.studentId) : '';
  const et = etSnap ? (typeof etSnap.toJSON === 'function' ? etSnap.toJSON() : etSnap) : null;
  const st = student ? (typeof student.toJSON === 'function' ? student.toJSON() : student) : null;
  const prof = profile ? (typeof profile.toJSON === 'function' ? profile.toJSON() : profile) : null;
  return {
    semesterId: prof ? prof.semesterId : et ? et.semesterId : null,
    studentId: sid,
    studentName: (et && et.studentName) || (st && st.nameZh) || sid,
    grade: (et && et.grade) || (st && st.grade != null ? String(st.grade) : null),
    department: (et && et.department) || (st && st.departmentName) || null,
    isActive: et ? et.isActive : true,
    isRostered: prof ? prof.isRostered : false,
    rosterSource: prof ? prof.rosterSource : null,
    studentPk: prof ? prof.studentPk : st ? st.id : null
  };
}

/**
 * LJS 學生詳情（欄位對齊 admin student detail，並附 activities／examRegistrations）。
 */
async function getEnglishTestStudentDetailV3(semesterIdRaw, studentIdRaw) {
  const warnings = [];
  const semesterId = String(semesterIdRaw || '').trim();
  const studentId = normSid(studentIdRaw);

  if (!isValidSemesterId(semesterId)) {
    pushWarning(warnings, 'INVALID_SEMESTER_ID', 'semesterId 格式不正確', 'error');
    return {
      semesterId,
      studentId,
      roster: null,
      bestSkills: null,
      attempts: [],
      activities: [],
      examRegistrations: [],
      source: 'learning_journey_v3',
      dataQuality: { warnings },
      error: 'semesterId 格式不正確'
    };
  }
  if (!studentId) {
    pushWarning(warnings, 'MISSING_STUDENT_ID', 'studentId 為必填', 'error');
    return {
      semesterId,
      studentId: '',
      roster: null,
      bestSkills: null,
      attempts: [],
      activities: [],
      examRegistrations: [],
      source: 'learning_journey_v3',
      dataQuality: { warnings },
      error: 'studentId 為必填'
    };
  }

  let student = null;
  try {
    student = await Student.findOne({ where: { studentId } });
  } catch (e) {
    pushWarning(warnings, 'STUDENT_QUERY_FAILED', e.message || 'students 查詢失敗', 'error');
    return {
      semesterId,
      studentId,
      roster: null,
      bestSkills: null,
      attempts: [],
      activities: [],
      examRegistrations: [],
      source: 'learning_journey_v3',
      dataQuality: { warnings },
      error: e.message
    };
  }

  if (!student) {
    pushWarning(warnings, 'NO_STUDENT', 'LJS 查無 students 列', 'warning');
    return {
      semesterId,
      studentId,
      roster: null,
      bestSkills: null,
      attempts: [],
      activities: [],
      examRegistrations: [],
      source: 'learning_journey_v3',
      dataQuality: { warnings },
      error: 'NO_STUDENT'
    };
  }

  let profile = null;
  try {
    profile = await StudentSemesterProfile.findOne({
      where: { semesterId, studentPk: student.id }
    });
  } catch (e) {
    pushWarning(warnings, 'PROFILE_QUERY_FAILED', e.message || 'profile 查詢失敗', 'error');
  }

  if (!profile || !profile.isRostered) {
    pushWarning(warnings, 'ROSTER_NOT_LJS', '本學期無 is_rostered 之 student_semester_profiles', 'warning');
  }

  let etSnap = null;
  try {
    etSnap = await EtEnrollmentSnapshot.findOne({
      where: { semesterId, studentId, isActive: true }
    });
  } catch (_) {
    /* 選填 */
  }

  const rosterJson = buildRosterJson(profile, student, etSnap);

  let attemptsRows = [];
  try {
    attemptsRows = await ExamAttempt.findAll({
      where: {
        studentPk: student.id,
        semesterId,
        status: 'valid'
      },
      include: [{ model: ExamAttemptSkillScore, as: 'skillScores', required: false }],
      order: [['examDate', 'DESC'], ['id', 'DESC']]
    });
  } catch (e) {
    pushWarning(warnings, 'ATTEMPTS_QUERY_FAILED', e.message || 'exam_attempts 查詢失敗', 'error');
  }

  const attemptsJson = attemptsRows.map((a) => ljsAttemptToFrontendJson(a));
  const bestSkills = computeBestSkillsFromAttemptsJson(attemptsJson) || null;

  let examRegs = [];
  try {
    examRegs = await ExamRegistration.findAll({
      where: { studentPk: student.id, semesterId },
      order: [['id', 'ASC']]
    });
  } catch (e) {
    pushWarning(warnings, 'EXAM_REG_QUERY_FAILED', e.message || 'exam_registrations 查詢失敗', 'warning');
  }

  let activities = [];
  try {
    activities = await ActivityParticipation.findAll({
      where: { studentPk: student.id, semesterId },
      order: [['id', 'ASC']]
    });
  } catch (e) {
    pushWarning(warnings, 'ACTIVITY_QUERY_FAILED', e.message || 'activity_participations 查詢失敗', 'warning');
  }

  const examRegistrations = examRegs.map((r) => {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : r;
    return {
      id: j.id,
      status: j.status,
      examScope: j.examScope,
      registrationChannel: j.registrationChannel,
      legacyRegistrationId: j.legacyRegistrationId
    };
  });

  const activitiesOut = activities.map((r) => {
    const j = typeof r.toJSON === 'function' ? r.toJSON() : r;
    return {
      id: j.id,
      eventId: j.eventId,
      activityType: j.activityType,
      attendanceStatus: j.attendanceStatus,
      sourceRef: j.sourceRef,
      semesterId: j.semesterId
    };
  });

  return {
    semesterId,
    studentId,
    roster: rosterJson,
    bestSkills,
    attempts: attemptsJson,
    activities: activitiesOut,
    examRegistrations,
    source: 'learning_journey_v3',
    dataQuality: { warnings }
  };
}

function val(v) {
  if (v === undefined) return null;
  return v;
}

function rosterDiffs(legacyR, v3R, diff) {
  if (!legacyR && !v3R) return;
  const keys = ['studentName', 'grade', 'department'];
  for (const k of keys) {
    const a = val(legacyR && legacyR[k]);
    const b = val(v3R && v3R[k]);
    if (String(a || '') !== String(b || '')) {
      diff.push({ category: 'roster', field: k, legacy: a, v3: b });
    }
  }
}

function bestSkillsDiffs(legacyB, v3B, diff) {
  const keys = ['bestListeningCefr', 'bestReadingCefr', 'bestSpeakingCefr', 'bestWritingCefr'];
  for (const k of keys) {
    const a = String((legacyB && legacyB[k]) || '').trim().toUpperCase();
    const b = String((v3B && v3B[k]) || '').trim().toUpperCase();
    if (a !== b) diff.push({ category: 'bestSkills', field: k, legacy: legacyB ? legacyB[k] : null, v3: v3B ? v3B[k] : null });
  }
}

function attemptsSignature(attempts) {
  const arr = Array.isArray(attempts) ? attempts : [];
  const parts = arr.map((a) => {
    const m = {};
    SKILLS.forEach((sk) => {
      const row = (a.skillScores || []).find((s) => s.skill === sk);
      m[sk] = row ? String(row.cefr || '').toUpperCase() : '';
    });
    return `${a.id}:${a.examDate}:${SKILLS.map((sk) => m[sk]).join(',')}`;
  });
  parts.sort();
  return parts.join('|');
}

function examRegSignature(regs) {
  const arr = Array.isArray(regs) ? regs : [];
  return arr
    .map((r) => `${r.id}:${r.status}:${r.examScope || ''}:${r.registrationChannel || ''}`)
    .sort()
    .join('|');
}

function activitySignature(acts) {
  const arr = Array.isArray(acts) ? acts : [];
  return arr
    .map((a) => `${a.id}:${a.eventId}:${a.attendanceStatus || ''}`)
    .sort()
    .join('|');
}

function normalizeDetailShape(detail) {
  if (!detail || typeof detail !== 'object') return detail;
  return {
    ...detail,
    activities: Array.isArray(detail.activities) ? detail.activities : [],
    examRegistrations: Array.isArray(detail.examRegistrations) ? detail.examRegistrations : []
  };
}

async function compareEnglishTestStudentDetail(semesterIdRaw, studentIdRaw) {
  const englishTestReportService = require('../englishTestTracking/englishTestReportService');
  const semesterId = String(semesterIdRaw || '').trim();
  const studentId = normSid(studentIdRaw);

  if (!isValidSemesterId(semesterId) || !studentId) {
    return {
      semesterId,
      studentId,
      legacy: null,
      v3: null,
      diff: [],
      status: 'error',
      legacyError: !isValidSemesterId(semesterId) ? 'bad semesterId' : 'missing studentId',
      v3Error: null
    };
  }

  let legacy = null;
  let legacyErr = null;
  try {
    legacy = await englishTestReportService.getStudentDetail(semesterId, studentId);
  } catch (e) {
    legacyErr = e.message || String(e);
  }

  const v3raw = await getEnglishTestStudentDetailV3(semesterId, studentId);
  const v3Err = v3raw.error || null;

  if (legacyErr || v3Err) {
    return {
      semesterId,
      studentId,
      legacy: legacyErr ? null : normalizeDetailShape(legacy),
      v3: v3Err ? null : normalizeDetailShape(v3raw),
      diff: [],
      status: 'error',
      legacyError: legacyErr,
      v3Error: v3Err
    };
  }

  const legacyN = normalizeDetailShape(legacy);
  const v3 = normalizeDetailShape(v3raw);

  const diff = [];
  rosterDiffs(legacyN.roster, v3.roster, diff);
  bestSkillsDiffs(legacyN.bestSkills, v3.bestSkills, diff);

  const lc = Array.isArray(legacyN.attempts) ? legacyN.attempts.length : 0;
  const vc = Array.isArray(v3.attempts) ? v3.attempts.length : 0;
  if (lc !== vc) {
    diff.push({ category: 'attempts', field: 'count', legacy: lc, v3: vc });
  }
  const sigL = attemptsSignature(legacyN.attempts);
  const sigV = attemptsSignature(v3.attempts);
  if (sigL !== sigV) {
    diff.push({ category: 'attempts', field: 'skillCefrSignature', legacy: sigL, v3: sigV });
  }

  const regL = examRegSignature(legacyN.examRegistrations);
  const regV = examRegSignature(v3.examRegistrations);
  if (regL !== regV) {
    diff.push({ category: 'examRegistrations', field: 'signature', legacy: regL, v3: regV });
  }

  const actL = activitySignature(legacyN.activities);
  const actV = activitySignature(v3.activities);
  if (actL !== actV) {
    diff.push({ category: 'activities', field: 'signature', legacy: actL, v3: actV });
  }

  return {
    semesterId,
    studentId,
    legacy: legacyN,
    v3,
    diff,
    status: diff.length === 0 ? 'ok' : 'warning',
    legacyError: null,
    v3Error: null
  };
}

module.exports = {
  getEnglishTestStudentDetailV3,
  compareEnglishTestStudentDetail
};
