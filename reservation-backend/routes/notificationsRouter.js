const express = require('express');
const { authMiddleware } = require('../middlewares/auth');
const notificationService = require('../services/notificationService');

const router = express.Router();

router.get('/notifications', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user && (req.user.id || req.user.userId) ? (req.user.id || req.user.userId) : null;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const items = await notificationService.listForUser(uid, { limit });
    const unreadCount = await notificationService.countUnread(uid);

    return res.json({
      unreadCount,
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        data: n.data,
        readAt: n.readAt,
        createdAt: n.createdAt,
        requestId: n.requestId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/notifications/:id/read', authMiddleware, async (req, res, next) => {
  try {
    const uid = req.user && (req.user.id || req.user.userId) ? (req.user.id || req.user.userId) : null;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const notificationId = req.params.id;
    const n = await notificationService.markAsRead(uid, notificationId);
    if (!n) return res.status(404).json({ error: '找不到通知' });

    return res.json({
      success: true,
      id: n.id,
      readAt: n.readAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

