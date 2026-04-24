/**
 * 公告 Admin API：輕量 rate limit（記憶體、程序重啟清空）+ 稽核日誌。
 * 中期可改為 Redis + 審計表；此處不新增 npm 依賴。
 */
const logger = require('../utils/logger');

const WINDOW_MS = 60 * 1000;
const buckets = new Map();

function makeLimiter({ max, name }) {
  return function announcementRateLimit(req, res, next) {
    const now = Date.now();
    const key = `${name}:${req.ip || 'unknown'}`;
    let b = buckets.get(key);
    if (!b || now - b.start > WINDOW_MS) {
      b = { start: now, count: 0 };
      buckets.set(key, b);
    }
    b.count += 1;
    if (b.count > max) {
      return res.status(429).json({ error: '請求過於頻繁，請稍後再試' });
    }
    next();
  };
}

/** 公開讀取：每 IP 每分鐘 120 次 */
const publicAnnouncementLimiter = makeLimiter({ max: 120, name: 'ann-pub' });

/** 後台：每 IP 每分鐘 180 次（含列表） */
const adminAnnouncementLimiter = makeLimiter({ max: 180, name: 'ann-adm' });

function auditAdminAnnouncement(req, res, next) {
  const uid = req.user && req.user.id;
  const role = req.user && req.user.role;
  logger.info(
    `[announcement-admin] ${JSON.stringify({
      method: req.method,
      path: req.originalUrl || req.url,
      userId: uid,
      role,
      ip: req.ip,
      resourceId: req.params && req.params.id,
    })}`
  );
  next();
}

module.exports = {
  publicAnnouncementLimiter,
  adminAnnouncementLimiter,
  auditAdminAnnouncement,
};
