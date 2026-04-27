'use strict';

const { Op } = require('sequelize');
const { SystemLog } = require('../../models');

const LEGACY_TYPES = ['legacy_write', 'legacy_write_blocked', 'legacy_gone', 'lj_fallback'];

function normalizeDays(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(Math.floor(n), 180);
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : row;
}

function parseErrorMessage(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (_) {
    return { message: String(value) };
  }
}

async function getLegacyUsageAuditReport(options = {}) {
  const days = normalizeDays(options.days);
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);
  const rows = await SystemLog.findAll({
    where: {
      type: { [Op.in]: LEGACY_TYPES },
      createdAt: { [Op.gte]: since }
    },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit: 500
  });

  const items = rows.map((row) => {
    const r = toPlain(row);
    return {
      id: r.id,
      requestId: r.requestId,
      type: r.type,
      method: r.method,
      path: r.path,
      status: r.status,
      userId: r.userId,
      role: r.role,
      createdAt: r.createdAt,
      detail: parseErrorMessage(r.errorMessage)
    };
  });

  const byType = {};
  const byPath = {};
  for (const item of items) {
    byType[item.type] = (byType[item.type] || 0) + 1;
    const key = item.path || '(unknown)';
    byPath[key] = (byPath[key] || 0) + 1;
  }

  const topPaths = Object.entries(byPath)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return {
    generatedAt: new Date().toISOString(),
    days,
    since: since.toISOString(),
    total: items.length,
    byType,
    topPaths,
    items: items.slice(0, 100)
  };
}

module.exports = {
  getLegacyUsageAuditReport
};
