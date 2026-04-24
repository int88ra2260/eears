const { Op, fn, col } = require('sequelize');
const {
  StudentSemesterProfile,
  ActivityParticipation,
  ExamRegistration
} = require('../../models');

async function getSemesterMetrics(semesterId, { scope = 'school', classId, department, includeTrend = false } = {}) {
  const profileWhere = { semesterId };
  if (department) {
    // department filter reserved for future join with students table
  }
  if (classId) {
    // class scope reserved for future join with class memberships
  }

  const profiles = await StudentSemesterProfile.findAll({ where: profileWhere });
  const total = profiles.length;
  const bestAttainedCount = profiles.filter((p) => p.bestAttained).length;
  const latestAttainedCount = profiles.filter((p) => p.latestAttained).length;

  const registrationCount = await ExamRegistration.count({ where: { semesterId } });
  const activityAttendanceCount = await ActivityParticipation.count({
    where: { semesterId, attendanceStatus: 'attended' }
  });
  const activityRegisteredCount = await ActivityParticipation.count({
    where: { semesterId, attendanceStatus: { [Op.in]: ['registered', 'attended'] } }
  });

  const segments = await StudentSemesterProfile.findAll({
    where: { semesterId },
    attributes: [[col('semester_id'), 'segmentId'], [fn('COUNT', col('id')), 'population']],
    group: ['semester_id'],
    raw: true
  });

  const trend = includeTrend
    ? await StudentSemesterProfile.findAll({
        attributes: ['semesterId', [fn('COUNT', col('id')), 'population'], [fn('SUM', col('best_attained')), 'bestAttained']],
        group: ['semester_id'],
        order: [['semesterId', 'ASC']],
        raw: true
      })
    : [];

  return {
    semesterId,
    scope,
    filters: { classId: classId || null, department: department || null },
    population: {
      rosteredStudents: total,
      validStudents: total
    },
    kpis: {
      registrationRate: total > 0 ? registrationCount / total : 0,
      attendanceRate: activityRegisteredCount > 0 ? activityAttendanceCount / activityRegisteredCount : 0,
      attainmentRateBest: total > 0 ? bestAttainedCount / total : 0,
      attainmentRateLatest: total > 0 ? latestAttainedCount / total : 0
    },
    cefrDistribution: {
      listening: {},
      reading: {},
      speaking: {},
      writing: {}
    },
    segments,
    trend
  };
}

module.exports = {
  getSemesterMetrics
};
