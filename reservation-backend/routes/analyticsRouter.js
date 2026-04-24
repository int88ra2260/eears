const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const analyticsController = require('../controllers/analyticsController');

// 學習歷程／行政分析 API：與後台側欄 admin 區塊一致
router.use('/analytics', authMiddleware, requirePermission(P.CAN_VIEW_ANALYTICS));

router.get('/analytics/students/:studentId', analyticsController.getStudentProfile);
router.get('/analytics/classes/:classId', analyticsController.getClassEvaluation);
router.get('/analytics/overview', analyticsController.getOverview);
router.get('/analytics/classes', analyticsController.getReservationClasses);
router.get('/analytics/events', analyticsController.getReservationEvents);
router.get('/analytics/risk', analyticsController.getRisk);
router.get('/analytics/risk/predict/:studentId', analyticsController.predictRisk);
router.get('/analytics/teachers/:teacherId/dashboard', analyticsController.getTeacherDashboard);
router.get('/analytics/trends', analyticsController.getStudentTrends);
router.get('/analytics/trends/classes/:classId', analyticsController.getClassTrends);
router.get('/analytics/trends/overview', analyticsController.getOverviewTrends);

module.exports = router;
