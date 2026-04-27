'use strict';

/**
 * @deprecated
 * Will be removed after Learning Journey v3 fully replaces legacy tracking.
 */

const { Op } = require('sequelize');
const {
  sequelize,
  EtEnrollmentSnapshot,
  EtExamAttempt,
  EtExamAttemptScore,
  EtExamAttemptSkillScore,
  EtSemesterStudentBestSkill
} = require('../../models');
const { buildUnifiedSkillScoresForAttempt } = require('./legacyAttemptScoreAdapter');

const COMPUTE_VERSION = 'best-skill-v1';
const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

function createServiceError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function compareSkillCandidate(a, b) {
  // Higher rank first
  if (a.cefrRank !== b.cefrRank) return b.cefrRank - a.cefrRank;

  // Newer examDate first; null examDate is treated as older
  const aDate = a.examDate ? new Date(a.examDate).getTime() : 0;
  const bDate = b.examDate ? new Date(b.examDate).getTime() : 0;
  if (aDate !== bDate) return bDate - aDate;

  // Same/missing date: larger attempt id first
  return (b.attemptId || 0) - (a.attemptId || 0);
}

function getBestSkillByStudent(attempts) {
  const best = {
    listening: null,
    reading: null,
    speaking: null,
    writing: null
  };

  for (const attempt of attempts) {
    const unified = buildUnifiedSkillScoresForAttempt(attempt);
    const examDate = attempt.examDate || attempt.testDate || null;
    for (const score of unified) {
      if (score.cefrRank == null || !Number.isFinite(Number(score.cefrRank))) continue;
      if (!SKILLS.includes(score.skill)) continue;
      const candidate = {
        attemptId: attempt.id,
        examDate,
        cefr: score.cefr || null,
        cefrRank: Number(score.cefrRank)
      };
      const current = best[score.skill];
      if (!current || compareSkillCandidate(current, candidate) > 0) {
        best[score.skill] = candidate;
      }
    }
  }

  return best;
}

async function rebuildSemesterBestSkills(semesterId, options = {}) {
  if (!semesterId || String(semesterId).trim() === '') {
    throw createServiceError('MISSING_SEMESTER_ID', 'semesterId is required');
  }

  const normalizedSemesterId = String(semesterId).trim();
  const activeOnly = options.activeOnly !== false;
  const transaction = options.transaction || await sequelize.transaction();
  const shouldCommit = !options.transaction;

  try {
    const rosterWhere = { semesterId: normalizedSemesterId };
    if (activeOnly) rosterWhere.isActive = true;

    const rosters = await EtEnrollmentSnapshot.findAll({
      where: rosterWhere,
      attributes: ['studentId'],
      transaction
    });

    const rosterStudentIds = [...new Set(rosters.map((row) => String(row.studentId).trim()).filter(Boolean))];

    // Full rebuild for one semester: delete old rows first
    await EtSemesterStudentBestSkill.destroy({
      where: { semesterId: normalizedSemesterId },
      transaction
    });

    let insertedCount = 0;
    let skippedCount = 0;
    const now = new Date();
    const rowsToInsert = [];

    if (rosterStudentIds.length > 0) {
      const attempts = await EtExamAttempt.findAll({
        where: {
          studentId: { [Op.in]: rosterStudentIds },
          status: 'valid'
        },
        include: [
          {
            model: EtExamAttemptSkillScore,
            as: 'skillScores',
            required: false
          },
          {
            model: EtExamAttemptScore,
            as: 'scores',
            required: false
          }
        ],
        transaction
      });

      const attemptsByStudent = new Map();
      for (const attempt of attempts) {
        const studentId = String(attempt.studentId).trim();
        if (!attemptsByStudent.has(studentId)) attemptsByStudent.set(studentId, []);
        attemptsByStudent.get(studentId).push(attempt);
      }

      for (const studentId of rosterStudentIds) {
        const studentAttempts = attemptsByStudent.get(studentId) || [];
        const bestSkills = getBestSkillByStudent(studentAttempts);
        const hasAnyBest =
          !!bestSkills.listening ||
          !!bestSkills.reading ||
          !!bestSkills.speaking ||
          !!bestSkills.writing;

        if (!hasAnyBest) {
          skippedCount += 1;
          continue;
        }

        rowsToInsert.push({
          semesterId: normalizedSemesterId,
          studentId,
          // 舊表相容欄位：V2 快取為整列聚合，明確寫 NULL 避免 strict 模式缺欄錯誤
          skill: null,
          attemptId: null,
          rawScore: null,
          cefr: null,
          cefrRank: null,
          bestListeningCefr: bestSkills.listening ? bestSkills.listening.cefr : null,
          bestListeningCefrRank: bestSkills.listening ? bestSkills.listening.cefrRank : null,
          bestReadingCefr: bestSkills.reading ? bestSkills.reading.cefr : null,
          bestReadingCefrRank: bestSkills.reading ? bestSkills.reading.cefrRank : null,
          bestSpeakingCefr: bestSkills.speaking ? bestSkills.speaking.cefr : null,
          bestSpeakingCefrRank: bestSkills.speaking ? bestSkills.speaking.cefrRank : null,
          bestWritingCefr: bestSkills.writing ? bestSkills.writing.cefr : null,
          bestWritingCefrRank: bestSkills.writing ? bestSkills.writing.cefrRank : null,
          computedAt: now,
          computeVersion: COMPUTE_VERSION
        });
      }
    }

    if (rowsToInsert.length > 0) {
      const insertedRows = await EtSemesterStudentBestSkill.bulkCreate(rowsToInsert, { transaction });
      insertedCount = insertedRows.length;
    }

    if (shouldCommit) await transaction.commit();

    return {
      semesterId: normalizedSemesterId,
      rosterStudentCount: rosterStudentIds.length,
      processedStudentCount: rosterStudentIds.length,
      insertedCount,
      skippedCount,
      computeVersion: COMPUTE_VERSION
    };
  } catch (error) {
    if (shouldCommit) await transaction.rollback();
    throw error;
  }
}

module.exports = {
  rebuildSemesterBestSkills
};
