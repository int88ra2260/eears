// utils/analyticsCache.js
// Phase 2.5：Analytics / Teacher / Risk 輕量快取

const cache = new Map();

function now() {
  return Date.now();
}

function getCache(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= now()) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function setCache(key, value, ttlMs) {
  const ttl = Math.max(1000, Number(ttlMs) || 0);
  cache.set(key, {
    value,
    expiresAt: now() + ttl
  });
}

function clearCache(prefix = '') {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

module.exports = {
  getCache,
  setCache,
  clearCache
};

