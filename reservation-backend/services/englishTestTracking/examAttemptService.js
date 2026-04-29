// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
'use strict';

const {
  sequelize,
  EtExamAttempt,
  EtExamAttemptScore,
  EtExamAttemptSkillScore
} = require('../../models');
const { toV2AttemptJson } = require('./legacyAttemptScoreAdapter');
const {
  normalizeExamType,
  mapScoreToCefr
} = require('./cefrMappingService');
const { buildCanonicalAttemptWhere } = require('./examAttemptNaturalKey');
const { normalizeDateOnlyForDb } = require('./examAttemptImportService');

const INFERENCE_VERSION = 'cefr-mapping-v1';
const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

function createServiceError(code, message, status = 400) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  return error;
}

function normalizeSkill(input) {
  if (input == null) return null;
  const value = String(input).trim().toLowerCase();
  return SKILLS.includes(value) ? value : null;
}

function normalizeScoresInput(scores) {
  if (!scores) return [];

  if (Array.isArray(scores)) {
    return scores
      .map((row) => ({
        skill: normalizeSkill(row && row.skill),
        rawScore: row ? row.rawScore : null,
        rawLevel: row ? row.rawLevel : null
      }))
      .filter((row) => row.skill);
  }

  if (typeof scores === 'object') {
    return Object.entries(scores)
      .map(([skill, row]) => ({
        skill: normalizeSkill(skill),
        rawScore: row ? row.rawScore : null,
        rawLevel: row ? row.rawLevel : null
      }))
      .filter((row) => row.skill);
  }

  return [];
}

function buildSkillRowsFromPayload(payload) {
  const normalizedExamType = normalizeExamType(payload && payload.examType);
  const scoreRows = normalizeScoresInput(payload && payload.scores);

  return scoreRows
    .filter((row) => {
      const hasRawScore = row.rawScore !== null && row.rawScore !== undefined && row.rawScore !== '';
      const hasRawLevel = row.rawLevel !== null && row.rawLevel !== undefined && String(row.rawLevel).trim() !== '';
      return hasRawScore || hasRawLevel;
    })
    .map((row) => {
      const mapping = mapScoreToCefr(normalizedExamType, row.skill, row.rawScore);
      return {
        skill: row.skill,
        rawScore: row.rawScore !== '' ? row.rawScore : null,
        rawLevel: row.rawLevel != null ? String(row.rawLevel).trim() || null : null,
        cefr: mapping.cefr,
        cefrRank: mapping.cefrRank,
        isInferred: mapping.isMapped,
        inferenceVersion: INFERENCE_VERSION
      };
    });
}

async function createAttempt(payload, options = {}) {
  if (!payload || !payload.studentId || String(payload.studentId).trim() === '') {
    throw createServiceError('MISSING_STUDENT_ID', 'studentId is required');
  }
  if (!payload.examType || String(payload.examType).trim() === '') {
    throw createServiceError('MISSING_EXAM_TYPE', 'examType is required');
  }

  const examType = normalizeExamType(payload.examType);
  if (!examType) {
    throw createServiceError('UNSUPPORTED_EXAM_TYPE', 'examType cannot be normalized');
  }

  const skillRows = buildSkillRowsFromPayload({ ...payload, examType });
  if (skillRows.length === 0) {
    throw createServiceError('EMPTY_SCORES', 'payload.scores is empty');
  }

  const transaction = options.transaction || await sequelize.transaction();
  const shouldCommit = !options.transaction;

  const studentId = String(payload.studentId).trim();
  const examDateNorm =
    payload.examDate != null && payload.examDate !== ''
      ? normalizeDateOnlyForDb(payload.examDate)
      : null;

  try {
    if (options.skipDuplicateCheck !== true) {
      const duplicate = await EtExamAttempt.findOne({
        where: {
          ...buildCanonicalAttemptWhere(EtExamAttempt, studentId, examDateNorm, examType),
          status: 'valid'
        },
        transaction
      });
      if (duplicate) {
        throw createServiceError(
          'DUPLICATE_ATTEMPT',
          '已存在相同學號、檢定日期、檢定類型之有效紀錄',
          409
        );
      }
    }

    const attempt = await EtExamAttempt.create({
      studentId,
      examType,
      examDate: payload.examDate || null,
      sourceType: payload.sourceType || 'manual',
      sourceBatchId: payload.sourceBatchId || null,
      rawPayload: payload.rawPayload || payload,
      status: payload.status || 'valid',
      createdBy: payload.createdBy || options.actor || null,
      updatedBy: payload.updatedBy || options.actor || null
    }, { transaction });

    const rowsToCreate = skillRows.map((row) => ({
      attemptId: attempt.id,
      skill: row.skill,
      rawScore: row.rawScore,
      rawLevel: row.rawLevel,
      cefr: row.cefr,
      cefrRank: row.cefrRank,
      isInferred: row.isInferred,
      inferenceVersion: row.inferenceVersion
    }));

    if (rowsToCreate.length > 0) {
      await EtExamAttemptSkillScore.bulkCreate(rowsToCreate, { transaction });
    }

    if (shouldCommit) await transaction.commit();

    const resultAttempt = await EtExamAttempt.findByPk(attempt.id, {
      include: [{ model: EtExamAttemptSkillScore, as: 'skillScores' }],
      transaction: options.transaction || undefined
    });
    return resultAttempt || attempt;
  } catch (error) {
    if (shouldCommit) await transaction.rollback();
    throw error;
  }
}

async function listAttemptsByStudent(studentId, options = {}) {
  if (!studentId || String(studentId).trim() === '') {
    throw createServiceError('MISSING_STUDENT_ID', 'studentId is required');
  }

  const rows = await EtExamAttempt.findAll({
    where: { studentId: String(studentId).trim() },
    include: [
      { model: EtExamAttemptSkillScore, as: 'skillScores', required: false },
      { model: EtExamAttemptScore, as: 'scores', required: false }
    ],
    order: [['examDate', 'DESC'], ['id', 'DESC']],
    limit: options.limit,
    offset: options.offset
  });
  const sorted = [...rows].sort((a, b) => {
    const da = new Date(a.examDate || a.testDate || 0).getTime();
    const db = new Date(b.examDate || b.testDate || 0).getTime();
    if (db !== da) return db - da;
    return (b.id || 0) - (a.id || 0);
  });
  return sorted.map((r) => toV2AttemptJson(r));
}

module.exports = {
  createAttempt,
  buildSkillRowsFromPayload,
  listAttemptsByStudent
};
