const { randomUUID } = require('crypto');
const { Notification, User } = require('../models');

function buildReservationNotificationFromEmailTemplate(template, data) {
  // Phase 7：讓 email 與 notification 共享同一份 template/data 來源，避免重寫兩套資料整理邏輯
  // 只取必要欄位，避免把取消驗證碼等敏感內容暴露到 notification UI
  if (template === 'reservationSuccess') {
    return {
      type: 'reservation_success',
      title: '預約成功',
      content: `你已成功預約：${data.eventName}（${data.date} ${data.startTime}）`,
      data: {
        eventId: data.eventId ?? null,
        eventName: data.eventName ?? null,
        eventType: data.eventType ?? null,
        date: data.date ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
      },
    };
  }

  if (template === 'reservationCancellation') {
    return {
      type: 'reservation_cancellation',
      title: '預約已取消',
      content: `你的預約已取消：${data.eventName}（${data.date} ${data.startTime}）`,
      data: {
        eventId: data.eventId ?? null,
        eventName: data.eventName ?? null,
        eventType: data.eventType ?? null,
        date: data.date ?? null,
        startTime: data.startTime ?? null,
        endTime: data.endTime ?? null,
      },
    };
  }

  return null;
}

async function ensureUser(userId) {
  if (!userId) return null;
  const u = await User.findByPk(userId);
  return u || null;
}

async function createNotification({ userId, type, title, content, data, requestId, relatedEntityType, relatedEntityId }) {
  if (!userId) return null;
  // 允許不阻塞主流程：若 user 不存在，就直接略過通知建立
  const u = await ensureUser(userId);
  if (!u) return null;

  return Notification.create({
    userId,
    type,
    title,
    content: content ?? null,
    data: data ?? null,
    readAt: null,
    requestId: requestId ?? null,
    relatedEntityType: relatedEntityType ?? null,
    relatedEntityId: relatedEntityId ?? null,
    createdAt: new Date(),
  });
}

async function createFromEmailTemplate(template, emailData, options = {}) {
  const built = buildReservationNotificationFromEmailTemplate(template, emailData);
  if (!built) return null;
  const { userId, requestId, relatedEntityType, relatedEntityId } = options;
  return createNotification({
    userId,
    type: built.type,
    title: built.title,
    content: built.content,
    data: built.data,
    requestId,
    relatedEntityType,
    relatedEntityId,
  });
}

async function listForUser(userId, { limit = 20 } = {}) {
  return Notification.findAll({
    where: { userId },
    order: [['createdAt', 'DESC']],
    limit: Number(limit) > 0 ? Number(limit) : 20,
    attributes: ['id', 'type', 'title', 'content', 'data', 'readAt', 'createdAt', 'requestId'],
  });
}

async function countUnread(userId) {
  return Notification.count({
    where: { userId, readAt: null },
  });
}

async function markAsRead(userId, notificationId) {
  const n = await Notification.findOne({
    where: { userId, id: notificationId },
  });
  if (!n) return null;

  if (n.readAt) return n;
  n.readAt = new Date();
  // timestamps: false，所以直接 save 即可更新 readAt/createdAt 不會變動
  await n.save();
  return n;
}

function makeRequestIdFallback() {
  try {
    return `notif:${randomUUID()}`;
  } catch (_) {
    return `notif:${Date.now()}`;
  }
}

module.exports = {
  createNotification,
  createFromEmailTemplate,
  listForUser,
  countUnread,
  markAsRead,
  makeRequestIdFallback,
};

