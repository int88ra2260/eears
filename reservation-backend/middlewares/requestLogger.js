const { randomUUID } = require('crypto');
const logger = require('../utils/logger');
const logBuffer = require('../utils/logBuffer');
const { logSystemAsync } = require('../services/systemLogService');
const { shouldPersistHttpSystemLog } = require('../utils/systemLogPolicy');

const SKIP_PREFIXES = ['/uploads', '/favicon.ico'];

function shouldSkipLog(req) {
  if (req.method === 'OPTIONS') return true;
  const p = req.path || req.url || '';
  if (p === '/health' || p === '/api/health') return true;
  // 同機提供 SPA／靜態時，避免將非 API 的 GET 全部打滿 log
  if (req.method === 'GET' && !p.startsWith('/api')) return true;
  for (const pre of SKIP_PREFIXES) {
    if (p.startsWith(pre)) return true;
  }
  return false;
}

/**
 * 附加 requestId、記錄每筆 API 耗時與狀態（不記錄 body，避免密碼／大檔上傳外洩）
 */
function requestLogger(req, res, next) {
  const headerId = req.headers['x-request-id'];
  const requestId =
    typeof headerId === 'string' && headerId.trim() ? headerId.trim().slice(0, 64) : randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  const start = Date.now();
  res.on('finish', () => {
    if (shouldSkipLog(req)) return;
    const durationMs = Date.now() - start;
    const uid = req.user && req.user.id;
    const role = req.user && req.user.role;
    const fwd = req.headers['x-forwarded-for'];
    const ip =
      (typeof fwd === 'string' && fwd.split(',')[0].trim()) ||
      req.ip ||
      (req.socket && req.socket.remoteAddress) ||
      '';

    const line = {
      type: 'http',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs,
      userId: uid != null ? uid : null,
      role: role || null,
      ip: String(ip).slice(0, 45),
    };

    logger.info(`[request] ${req.method} ${line.path} ${res.statusCode} ${durationMs}ms`, line);
    logBuffer.push(line);
    const pathForLog = req.originalUrl || req.url;
    if (
      shouldPersistHttpSystemLog({
        method: req.method,
        path: pathForLog,
        status: res.statusCode,
        durationMs,
      })
    ) {
      logSystemAsync({
        requestId,
        type: 'http',
        method: req.method,
        path: pathForLog,
        status: res.statusCode,
        durationMs,
        userId: uid != null ? uid : null,
        role: role || null,
        ipAddress: String(ip).slice(0, 45),
        userAgent:
          typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 500) : null,
      });
    }
  });

  next();
}

module.exports = { requestLogger };
