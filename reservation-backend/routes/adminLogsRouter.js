const express = require('express');
const { authMiddleware, requireSystemPermission, P } = require('../middlewares/auth');
const adminLogsController = require('../controllers/adminLogsController');

const router = express.Router();

// system-admin only: 必須 role=admin；executive 不可
router.use(authMiddleware, requireSystemPermission(P.CAN_VIEW_AUDIT_LOGS));

router.get('/audit', adminLogsController.listAudit);
router.get('/audit/:id', adminLogsController.getAuditDetail);
router.get('/system', adminLogsController.listSystem);
router.get('/email', adminLogsController.listEmailLogs);
router.get('/metrics/summary', adminLogsController.getMetricsSummary);
router.get('/request/:requestId', adminLogsController.getLogsByRequestId);

module.exports = router;
