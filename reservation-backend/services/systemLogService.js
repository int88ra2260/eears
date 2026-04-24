const { SystemLog } = require('../models');
const logger = require('../utils/logger');

// 非同步寫入緩衝區：用 bulkCreate 降低「每 request 一次 insert」的 DB 壓力
const pending = [];
let flushTimer = null;
let flushing = false;

async function flushNow() {
  if (flushing) return;
  const batch = pending.splice(0, pending.length);
  if (!batch.length) return;

  flushing = true;
  try {
    await SystemLog.bulkCreate(batch, { validate: false });
  } catch (e) {
    logger.error('systemLogService bulkCreate 失敗', e);
  } finally {
    flushing = false;
    // 若沖刷期間有新資料，安排下一輪
    if (pending.length) {
      scheduleFlush();
    }
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushNow().catch(() => {});
  }, 2000);
  // Node：讓 timer 不阻止 process exit（避免在 script/worker 場景卡住）
  if (flushTimer.unref) flushTimer.unref();
}

async function logSystem(payload) {
  const {
    requestId,
    type = 'http',
    method,
    path,
    status,
    durationMs,
    userId,
    role,
    ipAddress,
    userAgent,
    errorMessage = null,
  } = payload || {};

  if (!requestId) {
    logger.warn('systemLogService：缺少 requestId，跳過寫入');
    return;
  }

  try {
    await SystemLog.create({
      requestId: String(requestId).slice(0, 64),
      type,
      method: method ? String(method).slice(0, 10) : null,
      path: path ? String(path).slice(0, 500) : null,
      status: status != null ? parseInt(status, 10) : null,
      durationMs: durationMs != null ? parseInt(durationMs, 10) : null,
      userId: userId != null ? userId : null,
      role: role ? String(role).slice(0, 32) : null,
      ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 4000) : null,
      createdAt: new Date(),
    });
  } catch (e) {
    logger.error('systemLogService 寫入失敗', e);
  }
}

function logSystemAsync(payload) {
  // 不阻塞主流程：直接把資料放入 buffer，交給背景 flush
  try {
    const {
      requestId,
      type = 'http',
      method,
      path,
      status,
      durationMs,
      userId,
      role,
      ipAddress,
      userAgent,
      errorMessage = null,
    } = payload || {};

    if (!requestId) {
      logger.warn('systemLogService：缺少 requestId，跳過寫入');
      return;
    }

    pending.push({
      requestId: String(requestId).slice(0, 64),
      type,
      method: method ? String(method).slice(0, 10) : null,
      path: path ? String(path).slice(0, 500) : null,
      status: status != null ? parseInt(status, 10) : null,
      durationMs: durationMs != null ? parseInt(durationMs, 10) : null,
      userId: userId != null ? userId : null,
      role: role ? String(role).slice(0, 32) : null,
      ipAddress: ipAddress ? String(ipAddress).slice(0, 45) : null,
      userAgent: userAgent ? String(userAgent).slice(0, 500) : null,
      errorMessage: errorMessage ? String(errorMessage).slice(0, 4000) : null,
      createdAt: new Date(),
    });

    // 觸發條件：積累到一定量就立刻 flush
    if (pending.length >= 300) {
      flushTimer = null;
      flushNow().catch(() => {});
    } else {
      scheduleFlush();
    }
  } catch (e) {
    logger.error('systemLogService logSystemAsync 失敗', e);
  }
}

function getSystemLogQueueStats() {
  return {
    pending: pending.length,
    flushing,
    hasScheduledFlush: Boolean(flushTimer),
  };
}

module.exports = { logSystem, logSystemAsync, getSystemLogQueueStats };

