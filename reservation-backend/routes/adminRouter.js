// routes/adminRouter.js
const express = require('express');
const router = express.Router();
const { Settings } = require('../models');
const auditLogService = require('../services/auditLogService');
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');

const manageSettingsAuth = [authMiddleware, requirePermission(P.CAN_MANAGE_SETTINGS)];

// 取得問卷啟用狀態（公開讀取：前台／登入頁可能需顯示）
router.get('/settings/survey-enabled', async (req, res, next) => {
  try {
    const setting = await Settings.findByPk('surveyEnabled');
    const surveyEnabled = !!(setting && setting.valueBool);
    res.json({ surveyEnabled });
  } catch (err) {
    next(err);
  }
});

// 更新問卷啟用狀態（需登入且具系統設定權限）
router.put('/settings/survey-enabled', ...manageSettingsAuth, async (req, res, next) => {
  try {
    const { surveyEnabled } = req.body;
    const prev = await Settings.findByPk('surveyEnabled');
    const beforeVal = prev ? !!prev.valueBool : null;

    // 使用 upsert 來建立或更新設定
    await Settings.upsert({
      key: 'surveyEnabled',
      valueBool: !!surveyEnabled
    });

    auditLogService.logAuditAsync({
      module: 'settings',
      action: 'survey_enabled_update',
      entityType: 'Settings',
      entityId: 'surveyEnabled',
      targetSummary: `surveyEnabled: ${beforeVal} → ${!!surveyEnabled}`,
      beforeData: { surveyEnabled: beforeVal },
      afterData: { surveyEnabled: !!surveyEnabled },
      req,
    });

    res.json({ surveyEnabled: !!surveyEnabled });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 