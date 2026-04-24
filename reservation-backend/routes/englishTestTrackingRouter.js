const express = require('express');
const router = express.Router();
const { authMiddleware, adminOrExecutiveMiddleware } = require('../middlewares/auth');
const config = require('../config/englishTestTracking');
const {
  listSemesters,
  importEnrollmentHandler,
  importAttemptsHandler,
  recomputeHandler,
  reportGradeSkillSummary,
  reportDrilldown,
  getStudentAttempts,
  getStudentBestSkills,
  rollbackBatchHandler,
  upload
} = require('../controllers/englishTestTrackingController');

if (config.enabled) {
  router.use(authMiddleware);
  // Domain 管理權限：admin 或 executive（追蹤模組非 system-admin only）
  router.use(adminOrExecutiveMiddleware);

  router.get('/semesters', listSemesters);
  router.post('/enrollment/import', upload.single('file'), importEnrollmentHandler);
  router.post('/attempts/import', upload.single('file'), importAttemptsHandler);
  router.post('/recompute', recomputeHandler);
  router.get('/report/semester/:semesterId/grade-skill-summary', reportGradeSkillSummary);
  router.get('/report/semester/:semesterId/drilldown/:grade/:skill', reportDrilldown);
  router.get('/student/:studentId/attempts', getStudentAttempts);
  router.get('/student/:studentId/best-skills', getStudentBestSkills);
  router.post('/rollback-batch', rollbackBatchHandler);
}

module.exports = router;
