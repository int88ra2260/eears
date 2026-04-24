const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const surveyCenterService = require('../services/surveyCenterService');

router.get('/', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_RESPONSES), async (req, res, next) => {
  try {
    const data = await surveyCenterService.listSurveyResponses(req.query);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/:id(\\d+)', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_RESPONSES), async (req, res, next) => {
  try {
    const data = await surveyCenterService.getResponseDetail(Number(req.params.id));
    if (!data) return res.status(404).json({ error: 'not found' });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

router.get('/export/xlsx', authMiddleware, requirePermission(P.CAN_EXPORT_SURVEY_RESPONSES), async (req, res, next) => {
  try {
    await surveyCenterService.exportSurveyResponsesXlsx(req.query, res, req.user?.id);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
