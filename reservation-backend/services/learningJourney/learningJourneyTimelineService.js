const {
  Student,
  ExamRegistration,
  ExamAttempt,
  ExamAttemptSkillScore,
  ActivityParticipation
} = require('../../models');
const { Op } = require('sequelize');
const { normalizeStudentId } = require('./utils/studentNormalization');

function normalizeInclude(include = []) {
  if (!Array.isArray(include) || include.length === 0) {
    return ['registrations', 'attempts', 'activities', 'courses'];
  }
  return include;
}

function groupEventsBySemester(events = []) {
  const map = new Map();
  for (const event of events) {
    const semesterId = event.semesterId || 'unknown';
    if (!map.has(semesterId)) {
      map.set(semesterId, []);
    }
    map.get(semesterId).push(event);
  }

  return Array.from(map.entries())
    .map(([semesterId, groupedEvents]) => ({
      semesterId,
      events: groupedEvents.sort((a, b) => {
        const ad = a.at ? new Date(a.at).getTime() : 0;
        const bd = b.at ? new Date(b.at).getTime() : 0;
        return ad - bd;
      })
    }))
    .sort((a, b) => a.semesterId.localeCompare(b.semesterId));
}

async function getStudentTimeline(studentId, { fromSemester, toSemester, include } = {}) {
  const normalizedStudentId = normalizeStudentId(studentId);
  const requestedInclude = normalizeInclude(include);
  const student = await Student.findOne({ where: { studentId: normalizedStudentId } });
  if (!student) {
    return null;
  }

  const timelineEvents = [];
  const rangeWhere = {};
  if (fromSemester) rangeWhere[Op.gte] = fromSemester;
  if (toSemester) rangeWhere[Op.lte] = toSemester;
  const semesterClause = Object.keys(rangeWhere).length ? { semesterId: rangeWhere } : {};

  if (requestedInclude.includes('registrations')) {
    const registrations = await ExamRegistration.findAll({
      where: { studentPk: student.id, ...semesterClause },
      order: [['appliedAt', 'ASC'], ['id', 'ASC']]
    });
    for (const reg of registrations) {
      timelineEvents.push({
        type: 'registration',
        eventId: `reg_${reg.id}`,
        semesterId: reg.semesterId,
        status: reg.status,
        examScope: reg.examScope,
        at: reg.appliedAt || reg.createdAt
      });
    }
  }

  if (requestedInclude.includes('attempts')) {
    const attempts = await ExamAttempt.findAll({
      where: { studentPk: student.id, ...semesterClause },
      include: [{ model: ExamAttemptSkillScore, as: 'skillScores' }],
      order: [['examDate', 'ASC'], ['id', 'ASC']]
    });
    for (const attempt of attempts) {
      timelineEvents.push({
        type: 'attempt',
        eventId: `att_${attempt.id}`,
        semesterId: attempt.semesterId,
        source: attempt.sourceType,
        status: attempt.status,
        examScope: attempt.examScope,
        examDate: attempt.examDate,
        scores: (attempt.skillScores || []).reduce((acc, row) => {
          acc[row.skill] = {
            cefrLevel: row.cefrLevel,
            rawScore: row.rawScore
          };
          return acc;
        }, {}),
        at: attempt.examDate || attempt.createdAt
      });
    }
  }

  if (requestedInclude.includes('activities')) {
    const activities = await ActivityParticipation.findAll({
      where: { studentPk: student.id, ...semesterClause },
      order: [['participatedAt', 'ASC'], ['id', 'ASC']]
    });
    for (const row of activities) {
      timelineEvents.push({
        type: 'activity',
        eventId: row.eventId,
        semesterId: row.semesterId,
        activityType: row.activityType,
        attendanceStatus: row.attendanceStatus,
        at: row.participatedAt || row.createdAt
      });
    }
  }

  const grouped = groupEventsBySemester(timelineEvents);
  return {
    studentId: student.studentId,
    range: { fromSemester: fromSemester || null, toSemester: toSemester || null },
    include: requestedInclude,
    timeline: grouped,
    summary: {
      registrationCount: timelineEvents.filter((e) => e.type === 'registration').length,
      attemptCount: timelineEvents.filter((e) => e.type === 'attempt').length,
      activityCount: timelineEvents.filter((e) => e.type === 'activity').length,
      courseCount: 0
    },
    warnings: requestedInclude.includes('courses') ? ['Courses timeline is not implemented yet'] : []
  };
}

module.exports = {
  getStudentTimeline
};
