const express = require('express');
const { authMiddleware, requireSystemPermission, P } = require('../middlewares/auth');
const { getInternalDiagnostics } = require('../services/internalDiagnosticsService');

const router = express.Router();

// system-admin only: 必須 role=admin；executive 不可
router.get('/diagnostics', authMiddleware, requireSystemPermission(P.CAN_VIEW_INTERNAL_DIAGNOSTICS), async (req, res, next) => {
  try {
    const data = await getInternalDiagnostics();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
