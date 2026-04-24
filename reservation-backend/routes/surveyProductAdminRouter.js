// routes/surveyProductAdminRouter.js
// 掛載於 /api/admin/surveys，需置於舊 surveyRouter 之前；路徑使用數字 id 避免與 /stats/:surveyId 衝突
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const surveyModuleService = require('../services/surveyModuleService');

const auth = [authMiddleware];

router.get('/', ...auth, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const list = await surveyModuleService.listSurveysAdmin();
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/', ...auth, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const row = await surveyModuleService.createSurvey(req.body, req.user?.id);
    res.status(201).json(row);
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: 'surveyKey 已存在' });
    }
    next(e);
  }
});

router.get('/:id(\\d+)', ...auth, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const { Survey, SurveyRule, SurveyVersion } = require('../models');
    const row = await Survey.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: '找不到問卷' });
    const rule = await SurveyRule.findOne({ where: { surveyId: row.id } });
    let published = null;
    if (row.currentPublishedVersionId) {
      published = await SurveyVersion.findByPk(row.currentPublishedVersionId);
    }
    res.json({ survey: row, rule, publishedVersion: published });
  } catch (e) {
    next(e);
  }
});

router.put('/:id(\\d+)', ...auth, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const row = await surveyModuleService.updateSurvey(Number(req.params.id), req.body, req.user?.id);
    if (!row) return res.status(404).json({ error: '找不到問卷' });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)/versions', ...auth, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const list = await surveyModuleService.listVersions(Number(req.params.id));
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/:id(\\d+)/versions', ...auth, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const ver = await surveyModuleService.createVersion(Number(req.params.id), req.body, req.user?.id);
    if (!ver) return res.status(404).json({ error: '找不到問卷' });
    res.status(201).json(ver);
  } catch (e) {
    next(e);
  }
});

router.put('/:id(\\d+)/versions/:versionId(\\d+)', ...auth, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const ver = await surveyModuleService.updateVersion(
      Number(req.params.id),
      Number(req.params.versionId),
      req.body,
      req.user?.id
    );
    if (!ver) return res.status(404).json({ error: '找不到版本' });
    res.json(ver);
  } catch (e) {
    if (e.statusCode === 400) {
      return res.status(400).json({ error: e.message });
    }
    next(e);
  }
});

router.post('/:id(\\d+)/versions/:versionId(\\d+)/publish', ...auth, requirePermission(P.CAN_PUBLISH_SURVEYS), async (req, res, next) => {
  try {
    const result = await surveyModuleService.publishVersion(
      Number(req.params.id),
      Number(req.params.versionId),
      req.user?.id
    );
    if (!result) return res.status(404).json({ error: '找不到問卷或版本' });
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)/rules', ...auth, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const rule = await surveyModuleService.getRules(Number(req.params.id));
    res.json(rule || {});
  } catch (e) {
    next(e);
  }
});

router.put('/:id(\\d+)/rules', ...auth, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const rule = await surveyModuleService.putRules(Number(req.params.id), req.body, req.user?.id);
    res.json(rule);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)/responses', ...auth, requirePermission(P.CAN_VIEW_SURVEY_RESPONSES), async (req, res, next) => {
  try {
    const result = await surveyModuleService.listResponses(Number(req.params.id), req.query);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)/analytics/summary', ...auth, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const data = await surveyModuleService.analyticsSummary(Number(req.params.id), req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)/analytics/questions', ...auth, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const data = await surveyModuleService.analyticsQuestions(Number(req.params.id), req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.post('/:id(\\d+)/export', ...auth, requirePermission(P.CAN_EXPORT_SURVEY_RESPONSES), async (req, res, next) => {
  try {
    await surveyModuleService.exportSurveyResponses(Number(req.params.id), req.body || {}, res, req.user?.id);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
