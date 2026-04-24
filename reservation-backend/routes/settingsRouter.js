// routes/settingsRouter.js
const express = require('express');
const router = express.Router();
const { Settings } = require('../models');
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const auditLogService = require('../services/auditLogService');

/** 與全站一致：管理員或執行長可變更系統設定 */
const manageSettingsAuth = [authMiddleware, requirePermission(P.CAN_MANAGE_SETTINGS)];

// GET /api/settings/survey-required
router.get('/survey-required', async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'survey_required' } });
    const enabled = setting ? (setting.valueBool !== null ? setting.valueBool : setting.value === 'true') : false;
    
    return res.json({ enabled });
  } catch (error) {
    console.error('取得 survey_required 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// PUT /api/settings/survey-required
router.put('/survey-required', ...manageSettingsAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 必須為布林值' });
    }

    const prevSr = await Settings.findOne({ where: { key: 'survey_required' } });
    const beforeEnabled = prevSr
      ? prevSr.valueBool !== null
        ? prevSr.valueBool
        : prevSr.value === 'true'
      : null;
    
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'survey_required' },
      defaults: { 
        value: enabled.toString(),
        valueBool: enabled
      }
    });
    
    if (!created) {
      await setting.update({ 
        value: enabled.toString(),
        valueBool: enabled
      });
    }

    auditLogService.logAuditAsync({
      module: 'settings',
      action: 'survey_required_update',
      entityType: 'Settings',
      entityId: 'survey_required',
      targetSummary: `survey_required: ${beforeEnabled} → ${enabled}`,
      beforeData: { enabled: beforeEnabled },
      afterData: { enabled },
      changedFields: auditLogService.diffShallow({ enabled: beforeEnabled }, { enabled }),
      req,
    });
    
    return res.json({ 
      message: '設定已更新',
      enabled: enabled
    });
  } catch (error) {
    console.error('更新 survey_required 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// GET /api/settings/english-test-registration-enabled（個人報名開關）
router.get('/english-test-registration-enabled', async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'english_test_registration_enabled' } });
    const enabled = setting ? (setting.valueBool !== null ? setting.valueBool : setting.value === 'true') : true; // 預設為 true（啟用）
    
    return res.json({ enabled });
  } catch (error) {
    console.error('取得 english_test_registration_enabled 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// PUT /api/settings/english-test-registration-enabled（個人報名開關）
router.put('/english-test-registration-enabled', ...manageSettingsAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 必須為布林值' });
    }

    const prevEt = await Settings.findOne({ where: { key: 'english_test_registration_enabled' } });
    const beforeEt = prevEt
      ? prevEt.valueBool !== null
        ? prevEt.valueBool
        : prevEt.value === 'true'
      : null;
    
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'english_test_registration_enabled' },
      defaults: { 
        value: enabled.toString(),
        valueBool: enabled
      }
    });
    
    if (!created) {
      await setting.update({ 
        value: enabled.toString(),
        valueBool: enabled
      });
    }

    auditLogService.logAuditAsync({
      module: 'settings',
      action: 'english_test_registration_enabled_update',
      entityType: 'Settings',
      entityId: 'english_test_registration_enabled',
      targetSummary: `個人報名開關: ${beforeEt} → ${enabled}`,
      beforeData: { enabled: beforeEt },
      afterData: { enabled },
      changedFields: auditLogService.diffShallow({ enabled: beforeEt }, { enabled }),
      req,
    });
    
    return res.json({ 
      message: '設定已更新',
      enabled: enabled
    });
  } catch (error) {
    console.error('更新 english_test_registration_enabled 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// GET /api/settings/english-test-registration-group-enabled（團體報名開關，與 learning-partner-enabled 對應同一用途，可選獨立 key 以利區分截止時間）
router.get('/english-test-registration-group-enabled', async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'english_test_registration_group_enabled' } });
    if (setting) {
      const enabled = setting.valueBool !== null ? setting.valueBool : setting.value === 'true';
      return res.json({ enabled });
    }
    const fallback = await Settings.findOne({ where: { key: 'learning_partner_enabled' } });
    const enabled = fallback ? (fallback.valueBool !== null ? fallback.valueBool : fallback.value === 'true') : true;
    return res.json({ enabled });
  } catch (error) {
    console.error('取得團體報名開關設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// PUT /api/settings/english-test-registration-group-enabled（團體報名開關）
router.put('/english-test-registration-group-enabled', ...manageSettingsAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 必須為布林值' });
    }
    
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'english_test_registration_group_enabled' },
      defaults: { value: enabled.toString(), valueBool: enabled }
    });
    
    if (!created) {
      await setting.update({ value: enabled.toString(), valueBool: enabled });
    }
    
    return res.json({ message: '設定已更新', enabled });
  } catch (error) {
    console.error('更新團體報名開關設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// GET /api/settings/learning-partner-enabled
router.get('/learning-partner-enabled', async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'learning_partner_enabled' } });
    const enabled = setting ? (setting.valueBool !== null ? setting.valueBool : setting.value === 'true') : true; // 預設為 true（啟用）
    
    return res.json({ enabled });
  } catch (error) {
    console.error('取得 learning_partner_enabled 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// PUT /api/settings/learning-partner-enabled
router.put('/learning-partner-enabled', ...manageSettingsAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled 必須為布林值' });
    }
    
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'learning_partner_enabled' },
      defaults: { 
        value: enabled.toString(),
        valueBool: enabled
      }
    });
    
    if (!created) {
      await setting.update({ 
        value: enabled.toString(),
        valueBool: enabled
      });
    }
    
    return res.json({ 
      message: '設定已更新',
      enabled: enabled
    });
  } catch (error) {
    console.error('更新 learning_partner_enabled 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// GET /api/settings/learning-partner-quota
router.get('/learning-partner-quota', async (req, res) => {
  try {
    const setting = await Settings.findOne({ where: { key: 'learning_partner_quota' } });
    const quota = setting ? parseInt(setting.value) || 50 : 50; // 預設為 50
    
    return res.json({ quota });
  } catch (error) {
    console.error('取得 learning_partner_quota 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

// PUT /api/settings/learning-partner-quota
router.put('/learning-partner-quota', ...manageSettingsAuth, async (req, res) => {
  try {
    const { quota } = req.body;
    
    if (typeof quota !== 'number' || quota < 1) {
      return res.status(400).json({ error: 'quota 必須為正整數' });
    }
    
    const [setting, created] = await Settings.findOrCreate({
      where: { key: 'learning_partner_quota' },
      defaults: { 
        value: quota.toString(),
        valueInt: quota
      }
    });
    
    if (!created) {
      await setting.update({ 
        value: quota.toString(),
        valueInt: quota
      });
    }
    
    return res.json({ 
      message: '設定已更新',
      quota: quota
    });
  } catch (error) {
    console.error('更新 learning_partner_quota 設定失敗：', error);
    return res.status(500).json({ error: '伺服器錯誤' });
  }
});

module.exports = router;


