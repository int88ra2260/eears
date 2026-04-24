// GET /api/announcements — 公開列表
// GET /api/announcements/:idOrSlug — 公開詳情（數字 id 或 slug，僅已發布）
const express = require('express');
const announcementController = require('../controllers/announcementController');
const { publicAnnouncementLimiter } = require('../middlewares/announcementGuards');

const router = express.Router();

router.use(publicAnnouncementLimiter);

router.get('/preview/:token', (req, res) => {
  res.status(501).json({
    error: 'preview_token_not_implemented',
    message: '公開預覽 token 尚未啟用（請使用後台編輯預覽）',
  });
});

router.get('/', announcementController.list);
router.get('/:idOrSlug', announcementController.getById);

module.exports = router;
