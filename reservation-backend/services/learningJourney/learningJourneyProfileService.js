const { Op } = require('sequelize');
const {
  Student,
  StudentSemesterProfile,
  ExamAttempt,
  ExamAttemptSkillScore
} = require('../../models');
const { normalizeStudentId } = require('./utils/studentNormalization');
const { compareBestScoreCandidate } = require('./utils/cefrRules');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

function toScoreSnapshot(scoreRow, attempt) {
  return {
    attemptId: attempt.id,
    examDate: attempt.examDate,
    source: attempt.sourceType,
    examScope: attempt.examScope,
    cefrLevel: scoreRow.cefrLevel,
    cefrRank: scoreRow.cefrRank,
    rawScore: scoreRow.rawScore
  };
}

function computeBestLatestBySkill(attempts = []) {
  const best = {};
  const latest = {};
  for (const skill of SKILLS) {
    best[skill] = null;
    latest[skill] = null;
  }

  const validAttempts = attempts.filter((a) => a.status === 'valid');
  for (const attempt of validAttempts) {
    const skillScores = attempt.skillScores || [];
    for (const row of skillScores) {
      const skill = row.skill;
      if (!SKILLS.includes(skill)) continue;
      if (!best[skill]) {
        best[skill] = toScoreSnapshot(row, attempt);
      } else {
        const nextCandidate = toScoreSnapshot(row, attempt);
        const compare = compareBestScoreCandidate(nextCandidate, best[skill]);
        if (compare > 0) {
          best[skill] = nextCandidate;
        }
      }
    }
  }

  for (const skill of SKILLS) {
    const skillCandidates = [];
    for (const attempt of validAttempts) {
      const found = (attempt.skillScores || []).find((s) => s.skill === skill);
      if (found) {
        skillCandidates.push(toScoreSnapshot(found, attempt));
      }
    }
    skillCandidates.sort((a, b) => {
      const ad = a.examDate ? new Date(a.examDate).getTime() : 0;
      const bd = b.examDate ? new Date(b.examDate).getTime() : 0;
      if (ad !== bd) return bd - ad;
      return b.attemptId - a.attemptId;
    });
    latest[skill] = skillCandidates[0] || null;
  }

  return { best, latest };
}

function computeSourceBreakdown(attempts = []) {
  return attempts.reduce((acc, attempt) => {
    const key = attempt.sourceType || 'UNKNOWN';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function getStudentProfile(studentId, { semesterId } = {}) {
  const normalizedStudentId = normalizeStudentId(studentId);
  if (!normalizedStudentId) {
    return null;
  }

  const student = await Student.findOne({ where: { studentId: normalizedStudentId } });
  if (!student) {
    return null;
  }

  const profileWhere = { studentPk: student.id };
  if (semesterId) {
    profileWhere.semesterId = semesterId;
  }

  const currentSemesterProfile = await StudentSemesterProfile.findOne({
    where: profileWhere,
    order: [['semesterId', 'DESC']]
  });

  const attempts = await ExamAttempt.findAll({
    where: {
      studentPk: student.id,
      sourceType: 'BESTEP',
      ...(semesterId ? { semesterId } : {})
    },
    include: [{ model: ExamAttemptSkillScore, as: 'skillScores' }],
    order: [['examDate', 'DESC'], ['id', 'DESC']]
  });

  const { best, latest } = computeBestLatestBySkill(attempts);
  const sourceBreakdown = computeSourceBreakdown(attempts);
  const warnings = [];
  if (!attempts.length) {
    warnings.push('No attempts found for the requested scope');
  }
  if (attempts.some((a) => a.status !== 'valid')) {
    warnings.push('Some attempts are marked as invalid or duplicate');
  }

  return {
    student: {
      studentPk: student.id,
      studentId: student.studentId,
      nameZh: student.nameZh,
      nameEn: student.nameEn,
      departmentCode: student.departmentCode,
      departmentName: student.departmentName,
      grade: student.grade,
      enrollmentYear: student.enrollmentYear,
      status: student.status
    },
    currentSemesterProfile: currentSemesterProfile
      ? {
          semesterId: currentSemesterProfile.semesterId,
          isRostered: currentSemesterProfile.isRostered,
          rosterSource: currentSemesterProfile.rosterSource,
          attemptCount: currentSemesterProfile.attemptCount,
          bestAttained: currentSemesterProfile.bestAttained,
          latestAttained: currentSemesterProfile.latestAttained,
          dataQualityFlag: currentSemesterProfile.dataQualityFlag
        }
      : null,
    bestScores: best,
    latestScores: latest,
    attemptCount: attempts.length,
    sourceBreakdown,
    warnings
  };
}

async function getProfilesBySemester(semesterId) {
  const where = semesterId ? { semesterId } : {};
  return StudentSemesterProfile.findAll({
    where,
    limit: 5000,
    order: [['updatedAt', 'DESC']]
  });
}

module.exports = {
  getStudentProfile,
  getProfilesBySemester,
  computeBestLatestBySkill
};
