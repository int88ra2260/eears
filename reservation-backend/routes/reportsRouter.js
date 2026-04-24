const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const reportController = require('../controllers/reportController');

// PDF/Excel 報表下載：與前台「分析與報表」一致，限管理員或執行長
router.use('/reports', authMiddleware, requirePermission(P.CAN_EXPORT_REPORTS));

router.get('/reports/class/:classId', reportController.getClassReport);
router.get('/reports/teacher/:teacherId', reportController.getTeacherReport);
router.get('/reports/overview', reportController.getOverviewReport);

module.exports = router;

