'use strict';

const { Op } = require('sequelize');
const { EtEnrollmentSnapshot, EtExamAttempt, EtExamAttemptSkillScore } = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');
const { compareBestScoreCandidate, getCefrRank } = require('./utils/cefrRules');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];
const B2_RANK = getCefrRank('B2') || 4;

function roundRate(numerator, denominator) {
  if (!denominator) return 0;
  return Number((numerator / denominator).toFixed(4));
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
  return {
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

function hasAnyBestSkillRank(best) {
  if (!best) return false;
  return SKILLS.some((s) => {
    const x = best[s];
    return x && Number(x.cefrRank || 0) > 0;
  });
}

function hasAnyAttainedB2(best) {
  if (!best) return false;
  return SKILLS.some((s) => {
    const x = best[s];
    return x && Number(x.cefrRank || 0) >= B2_RANK;
  });
}

function countSkillB2(best, skill) {
  const x = best && best[skill];
  return x && Number(x.cefrRank || 0) >= B2_RANK ? 1 : 0;
}

function emptySummary(semesterId, warnings) {
  return {
    semesterId,
    rosterActiveStudentCount: 0,
    validBestScoreStudentCount: 0,
    attainedStudentCount: 0,
    attainmentRate: 0,
    skills: {
      listening: { count: 0, rate: 0 },
      reading: { count: 0, rate: 0 },
      speaking: { count: 0, rate: 0 },
      writing: { count: 0, rate: 0 }
    },
    source: 'learning_journey_v3',
    dataQuality: { warnings }
  };
}

/**
 * 以 V3 核心 et_* 資料（名冊 + 測驗嘗試 + 技能分數）組出摘要欄位。
 * 不拋錯；查詢失敗時回退為 0 並附 dataQuality.warnings。
 */
async function getEnglishTestSummaryV3(semesterIdRaw) {
  const warnings = [];
  const semesterId = String(semesterIdRaw || '').trim();

  if (!isValidSemesterId(semesterId)) {
    pushWarning(warnings, 'INVALID_SEMESTER_ID', 'semesterId 格式不正確（須如 114-2）', 'error');
    return {
      semesterId,
      rosterActiveStudentCount: 0,
      validBestScoreStudentCount: 0,
      attainedStudentCount: 0,
      attainmentRate: 0,
      skills: {
        listening: { count: 0, rate: 0 },
        reading: { count: 0, rate: 0 },
        speaking: { count: 0, rate: 0 },
        writing: { count: 0, rate: 0 }
      },
      source: 'learning_journey_v3',
      dataQuality: { warnings },
      error: 'semesterId 格式不正確'
    };
  }

  let enrollments = [];
  let attempts = [];

  try {
    enrollments = await EtEnrollmentSnapshot.findAll({
      where: { semesterId, isActive: true },
      attributes: ['studentId']
    });
  } catch (e) {
    pushWarning(warnings, 'ROSTER_QUERY_FAILED', e.message || 'et_enrollment_snapshots 查詢失敗', 'error');
    return emptySummary(semesterId, warnings);
  }

  if (!enrollments.length) {
    pushWarning(warnings, 'NO_ROSTER_PROFILES', '本學期尚無 isActive 之 et_enrollment_snapshots，名冊人數為 0', 'warning');
    return {
      semesterId,
      rosterActiveStudentCount: 0,
      validBestScoreStudentCount: 0,
      attainedStudentCount: 0,
      attainmentRate: 0,
      skills: {
        listening: { count: 0, rate: 0 },
        reading: { count: 0, rate: 0 },
        speaking: { count: 0, rate: 0 },
        writing: { count: 0, rate: 0 }
      },
      source: 'learning_journey_v3',
      dataQuality: { warnings }
    };
  }

  const studentIds = [...new Set(enrollments.map((p) => String(p.studentId || '').trim().toUpperCase()).filter(Boolean))];

  try {
    attempts = await EtExamAttempt.findAll({
      where: {
        studentId: { [Op.in]: studentIds },
        status: 'valid'
      },
      include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }]
    });
  } catch (e) {
    pushWarning(warnings, 'ATTEMPTS_QUERY_FAILED', e.message || 'et_exam_attempts 查詢失敗', 'error');
    return emptySummary(semesterId, warnings);
  }

  if (!attempts.length) {
    pushWarning(warnings, 'NO_EXAM_ATTEMPTS', '本學期尚無 status=valid 之 et_exam_attempts（請確認是否已匯入外部英檢成績）', 'warning');
  }

  const byStudentId = new Map();
  for (const att of attempts) {
    const sid = String(att.studentId || '').trim().toUpperCase();
    if (!byStudentId.has(sid)) byStudentId.set(sid, []);
    byStudentId.get(sid).push(att);
  }

  const rosterActiveStudentCount = enrollments.length;
  let validBestScoreStudentCount = 0;
  let attainedStudentCount = 0;
  let listeningCount = 0;
  let readingCount = 0;
  let speakingCount = 0;
  let writingCount = 0;

  for (const p of enrollments) {
    const sid = String(p.studentId || '').trim().toUpperCase();
    const list = byStudentId.get(sid) || [];
    const best = mergeBestForStudent(list);
    if (hasAnyBestSkillRank(best)) validBestScoreStudentCount += 1;
    if (hasAnyAttainedB2(best)) attainedStudentCount += 1;
    listeningCount += countSkillB2(best, 'listening');
    readingCount += countSkillB2(best, 'reading');
    speakingCount += countSkillB2(best, 'speaking');
    writingCount += countSkillB2(best, 'writing');
  }

  return {
    semesterId,
    rosterActiveStudentCount,
    validBestScoreStudentCount,
    attainedStudentCount,
    attainmentRate: roundRate(attainedStudentCount, rosterActiveStudentCount),
    skills: {
      listening: { count: listeningCount, rate: roundRate(listeningCount, rosterActiveStudentCount) },
      reading: { count: readingCount, rate: roundRate(readingCount, rosterActiveStudentCount) },
      speaking: { count: speakingCount, rate: roundRate(speakingCount, rosterActiveStudentCount) },
      writing: { count: writingCount, rate: roundRate(writingCount, rosterActiveStudentCount) }
    },
    source: 'learning_journey_v3',
    dataQuality: { warnings }
  };
}

module.exports = {
  getEnglishTestSummaryV3
};
