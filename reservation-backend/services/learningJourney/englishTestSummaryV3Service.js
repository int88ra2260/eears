'use strict';

const { Op } = require('sequelize');
const { StudentSemesterProfile, ExamAttempt, ExamAttemptSkillScore } = require('../../models');
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
  return getCefrRank(row.cefrLevel) || null;
}

function toCandidate(row, attempt) {
  const rank = resolveSkillRank(row);
  return {
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
 * 以 LJS read model（student_semester_profiles + exam_attempts + skill scores）組出與 V2 summary 對齊之欄位。
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

  let profiles = [];
  let attempts = [];

  try {
    profiles = await StudentSemesterProfile.findAll({
      where: { semesterId, isRostered: true },
      attributes: ['studentPk', 'studentId']
    });
  } catch (e) {
    pushWarning(warnings, 'ROSTER_QUERY_FAILED', e.message || 'student_semester_profiles 查詢失敗', 'error');
    return emptySummary(semesterId, warnings);
  }

  if (!profiles.length) {
    pushWarning(warnings, 'NO_ROSTER_PROFILES', '本學期尚無 is_rostered 之 student_semester_profiles，名冊人數為 0', 'warning');
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

  const studentPks = [...new Set(profiles.map((p) => p.studentPk).filter((x) => x != null))];

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
    pushWarning(warnings, 'ATTEMPTS_QUERY_FAILED', e.message || 'exam_attempts 查詢失敗', 'error');
    return emptySummary(semesterId, warnings);
  }

  if (!attempts.length) {
    pushWarning(warnings, 'NO_EXAM_ATTEMPTS', '本學期 LJS 尚無 status=valid 之 exam_attempts（請確認是否已同步 BESTEP／遷移）', 'warning');
  }

  const byPk = new Map();
  for (const att of attempts) {
    const pk = att.studentPk;
    if (!byPk.has(pk)) byPk.set(pk, []);
    byPk.get(pk).push(att);
  }

  const rosterActiveStudentCount = profiles.length;
  let validBestScoreStudentCount = 0;
  let attainedStudentCount = 0;
  let listeningCount = 0;
  let readingCount = 0;
  let speakingCount = 0;
  let writingCount = 0;

  for (const p of profiles) {
    const list = byPk.get(p.studentPk) || [];
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

async function getEnglishTestSummaryCompare(semesterIdRaw) {
  const englishTestReportService = require('../englishTestTracking/englishTestReportService');
  const { isLearningJourneyV3ReadModelEnabled } = require('./learningJourneyFeatureFlags');

  const semesterId = String(semesterIdRaw || '').trim();

  let legacy = null;
  let legacyError = null;
  try {
    legacy = await englishTestReportService.getSemesterSummary(semesterId, { activeOnly: true });
  } catch (e) {
    legacyError = e.message || String(e);
  }

  const v3 = await getEnglishTestSummaryV3(semesterId);

  let diff = null;
  let status = 'ok';

  if (legacyError || v3.error) {
    status = 'error';
  } else {
    diff = {
      rosterActiveStudentCount: v3.rosterActiveStudentCount - legacy.rosterActiveStudentCount,
      validBestScoreStudentCount: v3.validBestScoreStudentCount - legacy.validBestScoreStudentCount,
      attainedStudentCount: v3.attainedStudentCount - legacy.attainedStudentCount,
      attainmentRate: Number((v3.attainmentRate - legacy.attainmentRate).toFixed(4))
    };
    const warns = (v3.dataQuality && v3.dataQuality.warnings) || [];
    const hasSeverity = (sev) => warns.some((w) => w && w.severity === sev);
    const maxAbsCount = Math.max(
      Math.abs(diff.rosterActiveStudentCount),
      Math.abs(diff.validBestScoreStudentCount),
      Math.abs(diff.attainedStudentCount)
    );
    const rateAbs = Math.abs(diff.attainmentRate);
    if (hasSeverity('error')) status = 'error';
    else if (hasSeverity('warning') || maxAbsCount > 0 || rateAbs > 0.0001) status = 'warning';
    else status = 'ok';
  }

  return {
    semesterId,
    legacy: legacyError ? { error: legacyError } : legacy,
    v3,
    diff,
    status,
    enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
  };
}

module.exports = {
  getEnglishTestSummaryV3,
  getEnglishTestSummaryCompare
};
