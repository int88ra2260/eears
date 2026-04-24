const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const surveyCenterService = require('../services/surveyCenterService');
const surveyHealthService = require('../services/surveyHealthService');

function buildWhere(query = {}) {
  const where = {};
  if (query.semesterId) where.semesterId = query.semesterId;
  if (query.surveyId) where.surveyId = query.surveyId;
  if (query.versionId) where.surveyVersionId = query.versionId;
  if (query.activityType) where.activityType = query.activityType;
  if (query.eventId) where.eventId = query.eventId;
  return where;
}

router.get('/overview', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const [data, dataQuality] = await Promise.all([
      surveyCenterService.analyticsOverview(req.query),
      surveyHealthService.dataQualityForWhere(buildWhere(req.query)),
    ]);
    res.json({ ...data, dataQuality });
  } catch (e) {
    next(e);
  }
});

router.get('/distribution', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const [data, dataQuality] = await Promise.all([
      surveyCenterService.analyticsDistribution(req.query),
      surveyHealthService.dataQualityForWhere(buildWhere(req.query)),
    ]);
    res.json({ ...data, dataQuality });
  } catch (e) {
    next(e);
  }
});

router.get('/trends', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const [data, dataQuality] = await Promise.all([
      surveyCenterService.analyticsTrends(req.query),
      surveyHealthService.dataQualityForWhere(buildWhere(req.query)),
    ]);
    res.json({ ...data, dataQuality });
  } catch (e) {
    next(e);
  }
});

router.get('/comparison', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const [data, dataQuality] = await Promise.all([
      surveyCenterService.analyticsComparison(req.query),
      surveyHealthService.dataQualityForWhere(buildWhere(req.query)),
    ]);
    res.json({ ...data, dataQuality });
  } catch (e) {
    next(e);
  }
});

router.get('/open-text-summary', authMiddleware, requirePermission(P.CAN_VIEW_SURVEY_ANALYTICS), async (req, res, next) => {
  try {
    const [data, dataQuality] = await Promise.all([
      surveyCenterService.analyticsOpenTextSummary(req.query),
      surveyHealthService.dataQualityForWhere(buildWhere(req.query)),
    ]);
    res.json({ ...data, dataQuality });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
