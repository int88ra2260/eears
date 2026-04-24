const profileService = require('./learningJourneyProfileService');
const timelineService = require('./learningJourneyTimelineService');
const metricsService = require('./learningJourneyMetricsService');
const rebuildService = require('./learningJourneyRebuildService');

async function getStudentProfile(studentId, options = {}) {
  return profileService.getStudentProfile(studentId, options);
}

async function getStudentTimeline(studentId, options = {}) {
  return timelineService.getStudentTimeline(studentId, options);
}

async function getSemesterMetrics(semesterId, options = {}) {
  return metricsService.getSemesterMetrics(semesterId, options);
}

module.exports = {
  getStudentProfile,
  getStudentTimeline,
  getSemesterMetrics,
  rebuildStudentSemesterProfile: rebuildService.rebuildStudentSemesterProfile,
  rebuildSemesterProfilesBySemester: rebuildService.rebuildSemesterProfilesBySemester,
  rebuildAllAffectedProfilesFromAttempt: rebuildService.rebuildAllAffectedProfilesFromAttempt
};
