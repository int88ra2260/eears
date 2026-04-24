// routes/featureFlagsRouter.js
// Feature Flags 管理 API（管理員專用）

const express = require('express');
const router = express.Router();
const { authMiddleware, requireSystemPermission, P } = require('../middlewares/auth');
// system-admin only: 必須 role=admin；executive 不可
const featureFlagAuth = [authMiddleware, requireSystemPermission(P.CAN_MANAGE_FEATURE_FLAGS)];
const { getFeatureFlag, setFeatureFlag, getAllFeatureFlags } = require('../utils/featureFlags');

// 取得所有 Feature Flags（管理員專用）
// GET /api/admin/feature-flags
router.get('/admin/feature-flags', ...featureFlagAuth, async (req, res, next) => {
  try {
    const flags = await getAllFeatureFlags();
    res.json({
      success: true,
      data: flags
    });
  } catch (error) {
    next(error);
  }
});

// 取得單一 Feature Flag
// GET /api/admin/feature-flags/:flagName
router.get('/admin/feature-flags/:flagName', ...featureFlagAuth, async (req, res, next) => {
  try {
    const { flagName } = req.params;
    const value = await getFeatureFlag(flagName);
    
    res.json({
      success: true,
      data: {
        flagName,
        value
      }
    });
  } catch (error) {
    next(error);
  }
});

// 設定 Feature Flag（管理員專用）
// PUT /api/admin/feature-flags/:flagName
router.put('/admin/feature-flags/:flagName', ...featureFlagAuth, async (req, res, next) => {
  try {
    const { flagName } = req.params;
    const { value } = req.body;

    if (typeof value !== 'boolean') {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_VALUE',
        message: 'value 必須為布林值',
        error: 'value 必須為布林值'
      });
    }

    await setFeatureFlag(flagName, value);

    res.json({
      success: true,
      message: `Feature Flag ${flagName} 已設定為 ${value}`,
      data: {
        flagName,
        value
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

