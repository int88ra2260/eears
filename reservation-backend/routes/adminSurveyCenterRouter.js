const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const surveyModuleService = require('../services/surveyModuleService');
const surveyCenterService = require('../services/surveyCenterService');

router.get('/', authMiddleware, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const data = await surveyCenterService.listSurveyCenter(req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/meta/options', authMiddleware, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const { Survey, Event, SurveyVersion } = require('../models');
    const [surveys, semesters, events, versions] = await Promise.all([
      Survey.findAll({ attributes: ['id', 'title', 'name', 'surveyKey'], order: [['updatedAt', 'DESC']] }),
      surveyCenterService.listSemesters(),
      Event.findAll({ attributes: ['id', 'name', 'eventType', 'semesterId'], order: [['id', 'DESC']], limit: 500 }),
      SurveyVersion.findAll({ attributes: ['id', 'surveyId', 'versionNumber', 'status'], order: [['id', 'DESC']], limit: 2000 }),
    ]);
    res.json({ surveys, semesters, events, versions });
  } catch (e) {
    next(e);
  }
});

router.post('/', authMiddleware, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const row = await surveyModuleService.createSurvey(req.body, req.user?.id);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)', authMiddleware, requirePermission(P.CAN_VIEW_SURVEYS), async (req, res, next) => {
  try {
    const list = await surveyCenterService.listSurveyCenter({ page: 1, pageSize: 1, id: Number(req.params.id) });
    res.json(list.rows?.[0] || null);
  } catch (e) {
    next(e);
  }
});

router.put('/:id(\\d+)', authMiddleware, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const row = await surveyModuleService.updateSurvey(Number(req.params.id), req.body, req.user?.id);
    res.json(row);
  } catch (e) {
    next(e);
  }
});

router.post('/:id(\\d+)/versions', authMiddleware, requirePermission(P.CAN_MANAGE_SURVEYS), async (req, res, next) => {
  try {
    const row = await surveyModuleService.createVersion(Number(req.params.id), req.body, req.user?.id);
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/:id(\\d+)/versions/:versionId(\\d+)/publish',
  authMiddleware,
  requirePermission(P.CAN_PUBLISH_SURVEYS),
  async (req, res, next) => {
    try {
      const row = await surveyModuleService.publishVersion(Number(req.params.id), Number(req.params.versionId), req.user?.id);
      res.json(row);
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  '/:id(\\d+)/versions/:versionId(\\d+)/archive',
  authMiddleware,
  requirePermission(P.CAN_PUBLISH_SURVEYS),
  async (req, res, next) => {
    try {
      const { SurveyVersion } = require('../models');
      const ver = await SurveyVersion.findOne({ where: { id: Number(req.params.versionId), surveyId: Number(req.params.id) } });
      if (!ver) return res.status(404).json({ error: 'version not found' });
      await ver.update({ status: 'archived', isPublished: false });
      res.json(ver);
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
