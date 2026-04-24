/**
 * 網站統計 API（瀏覽人次等）
 */
const express = require('express');
const router = express.Router();
const { recordViewAndGet } = require('../services/siteStatsService');

/**
 * GET /api/stats/views
 * 記錄一次瀏覽並回傳總瀏覽人次與當日瀏覽人次
 */
router.get('/views', async (req, res, next) => {
  try {
    const { total, today } = await recordViewAndGet();
    res.json({ total, today });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
