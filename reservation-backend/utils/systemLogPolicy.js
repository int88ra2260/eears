/**
 * 控制是否寫入 SystemLog（DB），以降低高頻 GET 造成的資料量。
 * 不影響 logger / logBuffer（管理端「近期請求」仍可看完整摘要）。
 */

function parseEnvFloat(name, defaultVal) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : defaultVal;
}

function parseEnvInt(name, defaultVal) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : defaultVal;
}

const GET_SAMPLE_RATE = parseEnvFloat('SYSTEM_LOG_GET_SAMPLE_RATE', 1);
const SLOW_MS = parseEnvInt('SYSTEM_LOG_SLOW_MS', 4000);
const STATUS_MIN = parseEnvInt('SYSTEM_LOG_ALWAYS_STATUS_MIN', 400);
const ADMIN_PREFIX = process.env.SYSTEM_LOG_ADMIN_PREFIX || '/api/admin';

const SKIP_PREFIXES = (process.env.SYSTEM_LOG_SKIP_PATH_PREFIXES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const SKIP_PREFIX_GET_RATE = parseEnvFloat('SYSTEM_LOG_SKIP_PREFIX_GET_SAMPLE_RATE', 0);

const MUTATION = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * @param {{ method?: string, path?: string, status?: number, durationMs?: number }} p
 * @returns {boolean}
 */
function shouldPersistHttpSystemLog(p) {
  const method = (p.method || 'GET').toUpperCase();
  const path = p.path || '';
  const st = p.status != null ? parseInt(p.status, 10) : 0;
  const durationMs = p.durationMs != null ? parseInt(p.durationMs, 10) : 0;

  if (Number.isFinite(st) && st >= STATUS_MIN) return true;
  if (Number.isFinite(durationMs) && durationMs >= SLOW_MS) return true;
  if (path.startsWith(ADMIN_PREFIX)) return true;
  if (MUTATION.has(method)) return true;

  if (method !== 'GET' && method !== 'HEAD') return true;

  if (SKIP_PREFIXES.some((pre) => path.startsWith(pre))) {
    if (SKIP_PREFIX_GET_RATE >= 1) return true;
    if (SKIP_PREFIX_GET_RATE <= 0) return false;
    return Math.random() < SKIP_PREFIX_GET_RATE;
  }

  if (GET_SAMPLE_RATE >= 1) return true;
  if (GET_SAMPLE_RATE <= 0) return false;
  return Math.random() < GET_SAMPLE_RATE;
}

module.exports = {
  shouldPersistHttpSystemLog,
};
