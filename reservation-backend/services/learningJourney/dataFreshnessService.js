'use strict';

const { sequelize } = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');

const DEFAULT_STALE_HOURS = 48;

function staleHours() {
  const raw = Number(process.env.LEARNING_JOURNEY_STALE_HOURS || DEFAULT_STALE_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STALE_HOURS;
}

function normalizeDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function classifyStatus(recordCount, lastUpdatedAt) {
  if (!Number.isFinite(recordCount)) return { status: 'unknown', message: 'recordCount 無法判讀' };
  if (recordCount <= 0) return { status: 'empty', message: '目前無資料列' };
  if (!lastUpdatedAt) return { status: 'unknown', message: '有資料但無 updated_at 時間' };
  const d = normalizeDate(lastUpdatedAt);
  if (!d) return { status: 'unknown', message: 'updated_at 格式無法判讀' };
  const ageMs = Date.now() - d.getTime();
  const thresholdMs = staleHours() * 3600 * 1000;
  if (ageMs > thresholdMs) {
    return {
      status: 'stale',
      message: `資料最後更新已超過 ${staleHours()} 小時，建議先執行 sync/reconciliation`
    };
  }
  return { status: 'fresh', message: '資料在可接受的新鮮度範圍內' };
}

async function getSectionFreshness({ key, tableName, whereClause, replacements }) {
  const sql = `
    SELECT
      COUNT(1) AS recordCount,
      MAX(updated_at) AS lastUpdatedAt
    FROM ${tableName}
    ${whereClause ? `WHERE ${whereClause}` : ''}
  `;
  const rows = await sequelize.query(sql, {
    replacements: replacements || {},
    type: sequelize.QueryTypes.SELECT
  });
  const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : {};
  const recordCount = Number(row.recordCount || 0);
  const lastUpdatedAt = row.lastUpdatedAt || null;
  const { status, message } = classifyStatus(recordCount, lastUpdatedAt);
  return {
    key,
    lastUpdatedAt,
    recordCount,
    status,
    message
  };
}

async function getLearningJourneyDataFreshness(semesterIdRaw) {
  const semesterId = String(semesterIdRaw || '').trim();
  if (!isValidSemesterId(semesterId)) {
    return {
      semesterId,
      sections: [],
      error: 'semesterId 格式不正確'
    };
  }

  const specs = [
    {
      key: 'student_semester_profiles',
      tableName: 'student_semester_profiles',
      whereClause: 'semester_id = :semesterId',
      replacements: { semesterId }
    },
    {
      key: 'exam_attempts',
      tableName: 'exam_attempts',
      whereClause: 'semester_id = :semesterId',
      replacements: { semesterId }
    },
    {
      key: 'exam_registrations',
      tableName: 'exam_registrations',
      whereClause: 'semester_id = :semesterId',
      replacements: { semesterId }
    },
    {
      key: 'activity_participations',
      tableName: 'activity_participations',
      whereClause: 'semester_id = :semesterId',
      replacements: { semesterId }
    },
    {
      key: 'course_enrollments',
      tableName: 'course_enrollments',
      whereClause: 'semester_id = :semesterId',
      replacements: { semesterId }
    }
  ];

  const sections = [];
  for (const spec of specs) {
    try {
      sections.push(await getSectionFreshness(spec));
    } catch (e) {
      sections.push({
        key: spec.key,
        lastUpdatedAt: null,
        recordCount: 0,
        status: 'unknown',
        message: `查詢失敗：${(e && e.message) || String(e)}`
      });
    }
  }

  return { semesterId, sections };
}

module.exports = {
  getLearningJourneyDataFreshness
};
