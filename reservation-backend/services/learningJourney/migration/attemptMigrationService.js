const { Op } = require('sequelize');
const { runStage, recordQuarantine } = require('./migrationCommonService');
const {
  BestepExamScore,
  Student,
  ExamAttempt,
  ExamAttemptSkillScore
} = require('../../../models');
const { normalizeStudentId } = require('../utils/studentNormalization');
const { buildAttemptDedupeKey } = require('../utils/dedupeKeyBuilder');
const { getCefrRank, DEFAULT_MAPPING_VERSION } = require('../utils/cefrRules');
const { deriveExamScopeFromSkillRows } = require('../utils/examScopeRules');

const SKILL_MAP = [
  { skill: 'listening', scoreKey: 'listeningScore', levelKey: 'listeningLevel' },
  { skill: 'reading', scoreKey: 'readingScore', levelKey: 'readingLevel' },
  { skill: 'speaking', scoreKey: 'speakingScore', levelKey: 'speakingLevel' },
  { skill: 'writing', scoreKey: 'writingScore', levelKey: 'writingLevel' }
];

function normalizeCefrLevel(level) {
  if (!level) return null;
  const normalized = String(level).trim().toUpperCase();
  return ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(normalized) ? normalized : null;
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function buildSkillRows(row) {
  const skills = [];
  for (const cfg of SKILL_MAP) {
    const rawScore = toNullableNumber(row[cfg.scoreKey]);
    const rawLevel = row[cfg.levelKey] ? String(row[cfg.levelKey]).trim() : null;
    const sourceLevel = normalizeCefrLevel(rawLevel);
    const inferredLevel = !sourceLevel ? normalizeCefrLevel(row.overallLevel) : null;
    const cefrLevel = sourceLevel || inferredLevel;
    if (rawScore === null && !rawLevel && !cefrLevel) {
      continue;
    }
    skills.push({
      skill: cfg.skill,
      rawScore,
      rawLevel,
      cefrLevel,
      cefrRank: getCefrRank(cefrLevel),
      isInferred: Boolean(!sourceLevel && inferredLevel),
      mappingVersion: DEFAULT_MAPPING_VERSION
    });
  }
  return skills;
}

async function migrateAttempts(batchContext) {
  return runStage('exam_attempts', batchContext, async (ctx) => {
    if (ctx.options && ctx.options.simulateFailureStage === 'exam_attempts') {
      throw new Error('Simulated failure in exam_attempts stage');
    }

    const rows = await BestepExamScore.findAll({ raw: true });
    const stats = {
      processed: rows.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      duplicate: 0,
      quarantined: 0,
      errors: 0,
      warnings: 0
    };

    if (!rows.length) {
      return {
        stats,
        message: 'no bestep exam scores to migrate',
        payload: { sourceRows: 0, insertedAttempts: 0, insertedSkills: 0 }
      };
    }

    const normalizedIds = Array.from(new Set(rows.map((r) => normalizeStudentId(r.studentId)).filter(Boolean)));
    const students = await Student.findAll({
      where: { studentId: { [Op.in]: normalizedIds } },
      attributes: ['id', 'studentId'],
      raw: true
    });
    const studentByStudentId = new Map(students.map((s) => [s.studentId, s]));

    const dedupeCandidates = [];
    const candidateBySourceId = new Map();
    const stageWarnings = [];
    const scopeQuality = {
      scopeMismatchCount: 0,
      nonStandardSkillSetCount: 0
    };
    const quarantineByReason = {
      INVALID_STUDENT_ID: 0,
      STUDENT_NOT_FOUND: 0,
      MISSING_EXAM_DATE: 0,
      MISSING_SKILL_SCORES: 0,
      NON_STANDARD_SKILL_SET: 0
    };

    for (const row of rows) {
      const normalizedStudentId = normalizeStudentId(row.studentId);
      if (!normalizedStudentId || !row.examDate) continue;
      const sourceRef = row.sourceFile || `bestep:${row.semester || 'unknown'}:${row.id}`;
      const skillRows = buildSkillRows(row);
      const derivedScope = deriveExamScopeFromSkillRows(skillRows);
      if (!derivedScope.scope) continue;
      const dedupeKey = buildAttemptDedupeKey({
        studentId: normalizedStudentId,
        examVendor: 'BESTEP',
        examDate: row.examDate,
        examScope: derivedScope.scope,
        sourceRef
      });
      dedupeCandidates.push(dedupeKey);
      candidateBySourceId.set(row.id, {
        normalizedStudentId,
        sourceRef,
        skillRows,
        derivedScope,
        dedupeKey
      });
    }

    const existingAttempts = dedupeCandidates.length
      ? await ExamAttempt.findAll({
          where: { dedupeKey: { [Op.in]: dedupeCandidates } },
          attributes: ['id', 'dedupeKey'],
          raw: true
        })
      : [];
    const existingDedupeKeys = new Set(existingAttempts.map((a) => a.dedupeKey));
    let insertedSkillRows = 0;
    const affectedTargets = new Set();

    for (const row of rows) {
      const normalizedStudentId = normalizeStudentId(row.studentId);
      if (!normalizedStudentId) {
        quarantineByReason.INVALID_STUDENT_ID += 1;
        await recordQuarantine(ctx, {
          stageName: 'exam_attempts',
          sourceType: 'bestep_exam_scores',
          sourceRef: String(row.id),
          studentId: row.studentId || null,
          reasonCode: 'INVALID_STUDENT_ID',
          reasonMessage: 'studentId is empty after normalization',
          rawPayload: row
        });
        stats.quarantined += 1;
        continue;
      }

      const mappedStudent = studentByStudentId.get(normalizedStudentId);
      if (!mappedStudent) {
        quarantineByReason.STUDENT_NOT_FOUND += 1;
        await recordQuarantine(ctx, {
          stageName: 'exam_attempts',
          sourceType: 'bestep_exam_scores',
          sourceRef: String(row.id),
          studentId: normalizedStudentId,
          reasonCode: 'STUDENT_NOT_FOUND',
          reasonMessage: 'student_pk not found for normalized student_id',
          rawPayload: row
        });
        stats.quarantined += 1;
        continue;
      }

      if (!row.examDate) {
        quarantineByReason.MISSING_EXAM_DATE += 1;
        await recordQuarantine(ctx, {
          stageName: 'exam_attempts',
          sourceType: 'bestep_exam_scores',
          sourceRef: String(row.id),
          studentId: normalizedStudentId,
          reasonCode: 'MISSING_EXAM_DATE',
          reasonMessage: 'examDate is required for exam_attempts',
          rawPayload: row
        });
        stats.quarantined += 1;
        continue;
      }

      const candidate = candidateBySourceId.get(row.id);
      const sourceRef = candidate ? candidate.sourceRef : (row.sourceFile || `bestep:${row.semester || 'unknown'}:${row.id}`);
      const skillRows = candidate ? candidate.skillRows : buildSkillRows(row);
      const derivedScope = candidate ? candidate.derivedScope : deriveExamScopeFromSkillRows(skillRows);
      const dedupeKey = candidate
        ? candidate.dedupeKey
        : buildAttemptDedupeKey({
            studentId: normalizedStudentId,
            examVendor: 'BESTEP',
            examDate: row.examDate,
            examScope: derivedScope.scope || 'ALL',
            sourceRef
          });

      if (!derivedScope.scope) {
        const isNonStandard = String(derivedScope.reason || '').startsWith('NON_STANDARD_SKILL_SET');
        if (isNonStandard) {
          scopeQuality.nonStandardSkillSetCount += 1;
          quarantineByReason.NON_STANDARD_SKILL_SET += 1;
        } else {
          quarantineByReason.MISSING_SKILL_SCORES += 1;
        }
        await recordQuarantine(ctx, {
          stageName: 'exam_attempts',
          sourceType: 'bestep_exam_scores',
          sourceRef: String(row.id),
          studentId: normalizedStudentId,
          reasonCode: isNonStandard ? 'NON_STANDARD_SKILL_SET' : 'MISSING_SKILL_SCORES',
          reasonMessage: `unable to derive exam scope from skill rows: ${derivedScope.reason || 'UNKNOWN'}`,
          rawPayload: row
        });
        stats.quarantined += 1;
        continue;
      }

      const declaredScope = row.examScope || row.examType || null;
      if (declaredScope && String(declaredScope).trim().toUpperCase() !== derivedScope.scope) {
        scopeQuality.scopeMismatchCount += 1;
        const warning = `source scope mismatch, derived=${derivedScope.scope}, source=${declaredScope}, sourceId=${row.id}`;
        stageWarnings.push(warning);
        ctx.warnings.push(warning);
      }

      if (existingDedupeKeys.has(dedupeKey)) {
        stats.duplicate += 1;
        continue;
      }

      if (!skillRows.length) {
        quarantineByReason.MISSING_SKILL_SCORES += 1;
        await recordQuarantine(ctx, {
          stageName: 'exam_attempts',
          sourceType: 'bestep_exam_scores',
          sourceRef: String(row.id),
          studentId: normalizedStudentId,
          reasonCode: 'MISSING_SKILL_SCORES',
          reasonMessage: 'bestep row does not contain usable skill scores',
          rawPayload: row
        });
        stats.quarantined += 1;
        continue;
      }

      const attempt = await ExamAttempt.create({
        studentPk: mappedStudent.id,
        studentId: normalizedStudentId,
        semesterId: row.semester || null,
        sourceType: 'BESTEP',
        sourceRef,
        examVendor: 'BESTEP',
        examScope: derivedScope.scope,
        examDate: row.examDate,
        status: 'valid',
        rawPayload: {
          ...row,
          derivedExamScope: derivedScope.scope,
          declaredExamScope: declaredScope || null
        },
        dedupeKey
      });

      await ExamAttemptSkillScore.bulkCreate(
        skillRows.map((skillRow) => ({
          attemptId: attempt.id,
          ...skillRow
        }))
      );
      insertedSkillRows += skillRows.length;
      existingDedupeKeys.add(dedupeKey);
      stats.inserted += 1;
      if (attempt.studentPk && attempt.semesterId) {
        affectedTargets.add(`${attempt.studentPk}:${attempt.semesterId}`);
      } else {
        const warning = `skip rebuild target due to missing semester/studentPk, attemptId=${attempt.id}`;
        stageWarnings.push(warning);
        ctx.warnings.push(warning);
      }
    }

    ctx.rebuildTargets = Array.from(affectedTargets).map((value) => {
      const [studentPk, semesterId] = value.split(':');
      return { studentPk: Number(studentPk), semesterId };
    });

    return {
      stats,
      message: 'bestep_exam_scores migrated to exam_attempts and exam_attempt_skill_scores',
      payload: {
        sourceRows: rows.length,
        insertedAttempts: stats.inserted,
        duplicateAttempts: stats.duplicate,
        quarantinedRows: stats.quarantined,
        insertedSkillRows,
        rebuildTargets: ctx.rebuildTargets.length
      },
      warnings: stageWarnings,
      scopeQuality,
      quarantineByReason
    };
  });
}

module.exports = {
  migrateAttempts
};
