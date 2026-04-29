// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
const {
  EtExamAttempt,
  EtExamAttemptScore,
  EtEnrollmentSnapshot,
  EtSemesterStudentBestSkill,
  EtCefrLevel,
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const { getCefrRankMap, getRankForLevel } = require('./cefrService');
const config = require('../../config/englishTestTracking');

const SKILLS = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];

/**
 * 比較兩筆 (rawScore, cefr, cefrRank, testDate, attemptId) 誰較佳
 * 規則：cefrRank 高 > rawScore 高 > testDate 新 > attemptId 大
 */
function compareScores(a, b, rankMap) {
  const rankA = getRankForLevel(a.cefr, rankMap);
  const rankB = getRankForLevel(b.cefr, rankMap);
  if (rankA !== rankB) return rankB - rankA;
  const rawA = a.rawScore != null ? Number(a.rawScore) : -1;
  const rawB = b.rawScore != null ? Number(b.rawScore) : -1;
  if (rawA !== rawB) return rawB - rawA;
  const dateA = a.testDate ? new Date(a.testDate).getTime() : 0;
  const dateB = b.testDate ? new Date(b.testDate).getTime() : 0;
  if (dateA !== dateB) return dateB - dateA;
  return (b.attemptId || 0) - (a.attemptId || 0);
}

/**
 * 單一學生在單一學期的 best-skill 計算並寫入
 * @param {string} semesterId
 * @param {string} studentId
 * @param {object} rankMap - CEFR rank 對照
 * @returns {Promise<number>} 更新的 skill 數
 */
async function recomputeOneStudent(semesterId, studentId, rankMap) {
  const attempts = await EtExamAttempt.findAll({
    where: { studentId, status: 'valid' },
    include: [{ model: EtExamAttemptScore, as: 'scores', required: false }],
    order: [['testDate', 'DESC'], ['id', 'DESC']]
  });

  const bySkill = {};
  for (const skill of SKILLS) bySkill[skill] = [];

  for (const att of attempts) {
    const scores = att.scores || [];
    for (const s of scores) {
      if (!SKILLS.includes(s.skill)) continue;
      bySkill[s.skill].push({
        attemptId: att.id,
        testDate: att.testDate,
        rawScore: s.rawScore,
        cefr: s.cefr,
        cefrRank: getRankForLevel(s.cefr, rankMap)
      });
    }
  }

  const now = new Date();
  let updated = 0;

  for (const skill of SKILLS) {
    const list = bySkill[skill];
    if (list.length === 0) continue;

    list.sort((a, b) => -compareScores(a, b, rankMap));
    const best = list[0];

    const [rec, created] = await EtSemesterStudentBestSkill.findOrCreate({
      where: { semesterId, studentId, skill },
      defaults: {
        semesterId,
        studentId,
        skill,
        attemptId: best.attemptId,
        rawScore: best.rawScore,
        cefr: best.cefr,
        cefrRank: best.cefrRank,
        computedAt: now
      }
    });

    if (created || rec.attemptId !== best.attemptId || String(rec.cefr) !== String(best.cefr)) {
      await rec.update({
        attemptId: best.attemptId,
        rawScore: best.rawScore,
        cefr: best.cefr,
        cefrRank: best.cefrRank,
        computedAt: now
      });
      updated++;
    }
  }

  return updated;
}

/**
 * 重算指定學期、可選學生清單的 best-skill
 * @param {string} semesterId
 * @param {object} options - { studentIds?: string[], fullRecompute?: boolean }
 * @returns {Promise<{ recomputed: number, studentsProcessed: number }>}
 */
async function recomputeBestSkills(semesterId, options = {}) {
  const rankMap = await getCefrRankMap();
  const fullRecompute = options.fullRecompute === true;
  const studentIds = options.studentIds;

  let targetStudentIds = [];
  if (studentIds && studentIds.length > 0) {
    targetStudentIds = studentIds;
  } else if (fullRecompute) {
    const enrollments = await EtEnrollmentSnapshot.findAll({
      where: { semesterId, isActive: true },
      attributes: ['studentId']
    });
    targetStudentIds = [...new Set(enrollments.map(e => e.studentId))];
  }

  let studentsProcessed = 0;
  let totalUpdated = 0;

  for (const studentId of targetStudentIds) {
    const n = await recomputeOneStudent(semesterId, studentId, rankMap);
    totalUpdated += n;
    studentsProcessed++;
  }

  return { recomputed: totalUpdated, studentsProcessed };
}

module.exports = {
  recomputeBestSkills,
  recomputeOneStudent,
  compareScores
};
