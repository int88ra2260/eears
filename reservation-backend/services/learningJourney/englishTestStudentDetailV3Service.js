'use strict';

const {
  ExamRegistration,
  ActivityParticipation,
  EtEnrollmentSnapshot,
  EtExamAttempt,
  EtExamAttemptSkillScore
} = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');
const { compareBestScoreCandidate, getCefrRank } = require('./utils/cefrRules');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];
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

function pushWarning(warnings, code, message, severity = 'warning') {
  warnings.push({ code, message: String(message || ''), severity });
}

function getCefrFromRank(rank) {
  return CEFR_BY_RANK[Number(rank)] || null;
}

function resolveSkillRank(row) {
  if (row.cefrRank != null && row.cefrRank !== '') {
    const n = Number(row.cefrRank);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return getCefrRank(row.cefr) || null;
}

function etAttemptToFrontendJson(att) {
  const plain = typeof att.toJSON === 'function' ? att.toJSON() : att;
  const scores = (plain.skillScores || []).map((s) => {
    const row = typeof s.toJSON === 'function' ? s.toJSON() : s;
    const cefrLvl = row.cefr ? String(row.cefr).trim().toUpperCase() : null;
    const rank = resolveSkillRank(row);
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
    examType: plain.testType || plain.examType || plain.sourceType || 'ET',
    examDate: plain.testDate || plain.examDate || null,
    skillScores: scores
  };
}

function buildRosterJson(etSnap, semesterId, studentId) {
  const et = etSnap ? (typeof etSnap.toJSON === 'function' ? etSnap.toJSON() : etSnap) : null;
  const sid = et ? normSid(et.studentId) : studentId;
  return {
    semesterId: et ? et.semesterId : semesterId,
    studentId: sid,
    studentName: (et && et.studentName) || sid,
    grade: et && et.grade != null ? String(et.grade) : null,
    department: (et && et.department) || null,
    isActive: et ? et.isActive : true,
    isRostered: !!et,
    rosterSource: et ? et.sourceType : null
  };
}

function skillCandidate(row, attempt) {
  const rank = resolveSkillRank(row);
  return {
    cefr: row.cefr || getCefrFromRank(rank),
    cefrRank: rank != null ? Number(rank) : -1,
    rawScore: row.rawScore != null && row.rawScore !== '' ? Number(row.rawScore) : -1,
    examDate: attempt.examDate,
    id: attempt.id
  };
}

function computeBestSkills(attemptsJson) {
  const best = { listening: null, reading: null, speaking: null, writing: null };
  for (const attempt of attemptsJson || []) {
    for (const score of attempt.skillScores || []) {
      if (!SKILLS.includes(score.skill)) continue;
      const cand = skillCandidate(score, attempt);
      if (!best[score.skill] || compareBestScoreCandidate(cand, best[score.skill]) > 0) {
        best[score.skill] = cand;
      }
    }
  }
  return {
    bestListeningCefr: best.listening && best.listening.cefr ? best.listening.cefr : null,
    bestReadingCefr: best.reading && best.reading.cefr ? best.reading.cefr : null,
    bestSpeakingCefr: best.speaking && best.speaking.cefr ? best.speaking.cefr : null,
    bestWritingCefr: best.writing && best.writing.cefr ? best.writing.cefr : null,
    listening: best.listening,
    reading: best.reading,
    speaking: best.speaking,
    writing: best.writing
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

  let etSnap = null;
  try {
    etSnap = await EtEnrollmentSnapshot.findOne({
      where: { semesterId, studentId, isActive: true }
    });
  } catch (_) {
    /* 選填 */
  }

  if (!etSnap) {
    pushWarning(warnings, 'NO_ENROLLMENT_SNAPSHOT', '本學期無 et_enrollment_snapshots 名冊列', 'warning');
  }

  const rosterJson = buildRosterJson(etSnap, semesterId, studentId);

  let attemptsRows = [];
  try {
    attemptsRows = await EtExamAttempt.findAll({
      where: {
        studentId,
        status: 'valid'
      },
      include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }],
      order: [['testDate', 'DESC'], ['examDate', 'DESC'], ['id', 'DESC']]
    });
  } catch (e) {
    pushWarning(warnings, 'ATTEMPTS_QUERY_FAILED', e.message || 'et_exam_attempts 查詢失敗', 'error');
  }

  const attemptsJson = attemptsRows.map((a) => etAttemptToFrontendJson(a));
  const bestSkills = computeBestSkills(attemptsJson);

  let examRegs = [];
  try {
    examRegs = await ExamRegistration.findAll({
      where: { studentId, semesterId },
      order: [['id', 'ASC']]
    });
  } catch (e) {
    pushWarning(warnings, 'EXAM_REG_QUERY_FAILED', e.message || 'exam_registrations 查詢失敗', 'warning');
  }

  let activities = [];
  try {
    activities = await ActivityParticipation.findAll({
      where: { studentId, semesterId },
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

module.exports = {
  getEnglishTestStudentDetailV3
};
