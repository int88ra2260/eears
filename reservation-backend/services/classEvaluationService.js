/**
 * 班級教學評估（單一 classId + semester）
 */
const {
  Class,
  ClassMembership
} = require('../models');
const adminClasses = require('../controllers/adminClassesController');
const { getClassBestepOverview } = require('./bestepClassService');
const { SEMESTER_RANGES } = require('../utils/semesterConstants');
const kpiService = require('./kpiService');
const riskDetectionService = require('./riskDetectionService');

/**
 * @param {number} classId
 * @param {string} semester
 */
async function getClassEvaluation(classId, semester) {
  const range = SEMESTER_RANGES[semester];
  if (!range) {
    throw new Error('不支援的學期');
  }

  const classRecord = await Class.findByPk(classId);
  if (!classRecord) {
    throw new Error('找不到班級');
  }

  const members = await ClassMembership.findAll({
    where: { classId, semester }
  });

  const studentIds = kpiService.normalizeStudentIds(members.map((m) => adminClasses.cleanStudentId(m.studentId)));
  const studentCount = studentIds.length;

  const context = await kpiService.buildKpiContext(studentIds, semester);
  const participationMetrics = await kpiService.getParticipationMetrics(studentIds, semester, { context });
  const registrationMetrics = await kpiService.getBestepRegistrationMetrics(studentIds, semester, { context });
  const attendanceMetrics = await kpiService.getBestepAttendanceMetrics(studentIds, semester, {
    context,
    registrationMetrics
  });
  const passMetrics = await kpiService.getBestepPassMetrics(studentIds, semester, {
    context,
    attendanceMetrics
  });
  const exemptionMetrics = await kpiService.getExemptionMetrics(studentIds, semester, { context });
  const violationMetrics = await kpiService.getViolationMetrics(studentIds, semester, { context });
  const surveyMetrics = await kpiService.getSurveyMetrics(studentIds, semester, { context });

  const bestep = await getClassBestepOverview(classId, semester, 'all', {
    page: 1,
    pageSize: 50000,
    search: ''
  });
  const riskSummary = await riskDetectionService.getRiskSummary(studentIds, semester, {
    context
  });

  return {
    classId,
    semester,
    className: classRecord.name,
    teacherName: classRecord.teacherName,
    studentCount,
    participation: {
      participationRate: participationMetrics.participationRate,
      avgParticipationCount: participationMetrics.avgParticipationCount,
      participatedCount: participationMetrics.participatedCount,
      attendedCountTotal: participationMetrics.attendedCountTotal,
      noShowCountTotal: studentIds.reduce((sum, sid) => sum + (context.noShowCountByStudent[sid] || 0), 0)
    },
    bestep: {
      ...(bestep.statistics || {}),
      bestepRegistrationRate: registrationMetrics.bestepRegistrationRate,
      bestepAttendanceRate: attendanceMetrics.bestepAttendanceRate,
      bestepPassRate: passMetrics.bestepPassRate,
      exemptionApprovedCount: exemptionMetrics.exemptionApprovedCount,
      exemptionApprovedRate: exemptionMetrics.exemptionApprovedRate
    },
    violations: {
      reservationViolationCount: violationMetrics.violationCount,
      violationRate: violationMetrics.violationRate
    },
    survey: {
      estimatedCompletionRate: surveyMetrics.surveyCompletionRate
    },
    risk: {
      ...riskSummary
    },
    bestepOverview: {
      students: bestep.students,
      pagination: bestep.pagination
    }
  };
}

module.exports = {
  getClassEvaluation
};
