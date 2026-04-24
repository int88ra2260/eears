'use strict';

const express = require('express');
const { authMiddleware, adminOrExecutiveMiddleware } = require('../middlewares/auth');
const controller = require('../controllers/learningJourneyController');

const router = express.Router();

router.use(authMiddleware, adminOrExecutiveMiddleware);

router.get('/admin/reconciliation', controller.getReconciliation);
router.get('/admin/readiness', controller.getReadinessHandler);
router.post('/admin/sync', controller.postSync);

router.get(
  '/semesters/:semesterId/english-test-summary/compare',
  controller.getEnglishTestSummaryCompareHandler
);
router.get('/semesters/:semesterId/english-test-summary', controller.getEnglishTestSummaryV3Handler);

router.get(
  '/semesters/:semesterId/english-test-students/compare',
  controller.getEnglishTestStudentsCompareHandler
);
router.get(
  '/semesters/:semesterId/english-test-students/:studentId/compare',
  controller.getEnglishTestStudentDetailCompareHandler
);
router.get(
  '/semesters/:semesterId/english-test-students/:studentId',
  controller.getEnglishTestStudentDetailV3Handler
);
router.get('/semesters/:semesterId/english-test-students', controller.getEnglishTestStudentsV3ListHandler);

router.get('/students/:studentId/profile', controller.getStudentProfile);
router.get('/students/:studentId/timeline', controller.getStudentTimeline);
router.get('/semesters/:semesterId/dashboard', controller.getSemesterDashboard);
router.get('/semesters/:semesterId/metrics', controller.getSemesterMetrics);
router.post('/admin/rebuild-cache', controller.rebuildCache);

module.exports = router;
