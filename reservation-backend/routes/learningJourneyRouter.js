'use strict';

const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth');
const controller = require('../controllers/learningJourneyController');

const router = express.Router();
const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) return cb(null, true);
    return cb(new Error('只允許上傳 Excel 檔案 (.xlsx, .xls)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

function isSuperAdminUser(user) {
  if (!user) return false;
  return String(user.role || '').toLowerCase() === 'admin';
}

function isAdminPlusUser(user) {
  if (!user) return false;
  if (isSuperAdminUser(user)) return true;
  const role = String(user.role || '').toLowerCase();
  const level = String(user.teacherLevel || '').toLowerCase();
  if (role !== 'teacher') return false;
  return level === 'executive' || level === 'et_manager';
}

function requireAdminPlus(req, res, next) {
  if (!isAdminPlusUser(req.user)) {
    return res.status(403).json({ error: '權限不足（需 admin+）', requestId: req.requestId });
  }
  return next();
}

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdminUser(req.user)) {
    return res.status(403).json({ error: '權限不足（需 super_admin）', requestId: req.requestId });
  }
  return next();
}

router.use(authMiddleware);
router.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const latencyMs = Math.max(0, Date.now() - startedAt);
    console.info(
      `[learning-journey-latency] method=${req.method} path=${req.originalUrl} status=${res.statusCode} latencyMs=${latencyMs}`
    );
  });
  next();
});

router.get('/admin/reconciliation', requireAdminPlus, controller.getReconciliation);
router.get('/admin/readiness', requireAdminPlus, controller.getReadinessHandler);
router.get('/admin/read-model-status', requireAdminPlus, controller.getReadModelStatusHandler);
router.get('/admin/data-freshness', requireAdminPlus, controller.getDataFreshnessHandler);
router.get('/admin/governance-overview', requireAdminPlus, controller.getGovernanceOverviewHandler);
router.get('/admin/jobs/recent', requireAdminPlus, controller.getRecentJobsHandler);
router.get('/admin/legacy-usage-audit', requireAdminPlus, controller.getLegacyUsageAuditReportHandler);
router.post('/admin/jobs/run-daily-governance', requireSuperAdmin, controller.postRunDailyGovernanceJob);
router.post('/admin/jobs/reconcile-semester', requireSuperAdmin, controller.postRunReconcileSemesterJob);
router.post('/admin/sync', requireSuperAdmin, controller.postSync);
router.post('/admin/course-import/dry-run', requireAdminPlus, excelUpload.single('file'), controller.postCourseImportDryRun);
router.post('/admin/course-import/apply', requireSuperAdmin, excelUpload.single('file'), controller.postCourseImportApply);
router.post('/admin/enrollment-import/dry-run', requireAdminPlus, excelUpload.single('file'), controller.postFinalEnrollmentImportDryRun);
router.post('/admin/enrollment-import/apply', requireSuperAdmin, excelUpload.single('file'), controller.postFinalEnrollmentImportApply);
router.post('/admin/external-exam-import/dry-run', requireAdminPlus, excelUpload.single('file'), controller.postFinalExternalExamImportDryRun);
router.post('/admin/external-exam-import/apply', requireSuperAdmin, excelUpload.single('file'), controller.postFinalExternalExamImportApply);
router.post('/admin/rebuild-final', requireSuperAdmin, controller.postFinalRebuildHandler);

router.get('/semesters', controller.getFinalSemestersHandler);
router.get('/semesters/:id/overview', controller.getFinalSemesterOverviewHandler);
router.get('/semesters/:id/import-histories', requireAdminPlus, controller.getFinalImportHistoriesHandler);
router.get('/semesters/:id/students', controller.getFinalSemesterStudentsHandler);
router.get('/students/:studentId', controller.getFinalStudentDetailHandler);

router.get('/semesters/:semesterId/english-test-summary', controller.getEnglishTestSummaryV3Handler);

router.get(
  '/semesters/:semesterId/english-test-students/:studentId',
  controller.getEnglishTestStudentDetailV3Handler
);
router.get('/semesters/:semesterId/english-test-students', controller.getEnglishTestStudentsV3ListHandler);
router.get('/semesters/:semesterId/risk-students', controller.getRiskStudentsHandler);

router.get('/students/:studentId/profile', controller.getStudentProfile);
router.get('/students/:studentId/timeline', controller.getStudentTimeline);
router.get('/students/:studentId/courses', controller.getStudentCoursesHandler);
router.get('/students/:studentId/consistency', controller.getStudentConsistencyHandler);
router.get('/students/:studentId/report', controller.getStudentReportHandler);
router.get('/semesters/:semesterId/dashboard', controller.getSemesterDashboard);
router.get('/semesters/:semesterId/metrics', controller.getSemesterMetrics);
router.post('/admin/rebuild-cache', requireSuperAdmin, controller.rebuildCache);

module.exports = router;
