const { Op } = require('sequelize');
const { runStage, recordQuarantine } = require('./migrationCommonService');
const { BestepExamScore, Student } = require('../../../models');
const { normalizeStudentId } = require('../utils/studentNormalization');

async function migrateStudents(batchContext) {
  return runStage('students', batchContext, async (ctx) => {
    if (ctx.options && ctx.options.simulateFailureStage === 'students') {
      throw new Error('Simulated failure in students stage');
    }

    const rows = await BestepExamScore.findAll({
      attributes: ['id', 'studentId'],
      raw: true
    });

    const distinctStudentIds = new Set();
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

    for (const row of rows) {
      const normalizedStudentId = normalizeStudentId(row.studentId);
      if (!normalizedStudentId) {
        await recordQuarantine(ctx, {
          stageName: 'students',
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
      distinctStudentIds.add(normalizedStudentId);
    }

    if (!distinctStudentIds.size) {
      return {
        stats,
        message: 'no valid student ids found in bestep_exam_scores',
        payload: { distinctStudentIds: 0 }
      };
    }

    const studentIds = Array.from(distinctStudentIds);
    const existingStudents = await Student.findAll({
      where: { studentId: { [Op.in]: studentIds } },
      attributes: ['studentId'],
      raw: true
    });
    const existingIdSet = new Set(existingStudents.map((s) => s.studentId));

    const studentsToInsert = [];
    for (const studentId of studentIds) {
      if (existingIdSet.has(studentId)) {
        stats.duplicate += 1;
        continue;
      }
      studentsToInsert.push({
        studentId,
        // TODO(todo3): backfill display name from authoritative roster source.
        nameZh: studentId,
        status: 'active'
      });
    }

    if (studentsToInsert.length) {
      await Student.bulkCreate(studentsToInsert);
      stats.inserted = studentsToInsert.length;
    }

    return {
      stats,
      message: 'students migrated from bestep_exam_scores',
      payload: {
        sourceRows: rows.length,
        distinctStudentIds: studentIds.length,
        inserted: stats.inserted,
        duplicates: stats.duplicate
      }
    };
  });
}

module.exports = {
  migrateStudents
};
