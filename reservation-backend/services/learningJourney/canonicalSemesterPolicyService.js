'use strict';

const DEFAULT_REQUIRED_FROM = '115-1';

function parseSemesterId(value) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{2,4})-(\d{1,2})$/);
  if (!match) return null;
  return {
    raw,
    year: Number(match[1]),
    term: Number(match[2])
  };
}

function compareSemesterIds(a, b) {
  const pa = parseSemesterId(a);
  const pb = parseSemesterId(b);
  if (!pa || !pb) return null;
  if (pa.year !== pb.year) return pa.year - pb.year;
  return pa.term - pb.term;
}

function getCanonicalRequiredFromSemester() {
  const raw = String(process.env.LEARNING_JOURNEY_CANONICAL_REQUIRED_FROM_SEMESTER || DEFAULT_REQUIRED_FROM).trim();
  return parseSemesterId(raw) ? raw : DEFAULT_REQUIRED_FROM;
}

function isCanonicalRequiredSemester(semesterId) {
  const from = getCanonicalRequiredFromSemester();
  const cmp = compareSemesterIds(semesterId, from);
  return cmp != null ? cmp >= 0 : false;
}

function resolveSemesterIdFromRequest(req) {
  const candidates = [
    req && req.params && req.params.semesterId,
    req && req.params && req.params.id,
    req && req.query && req.query.semesterId,
    req && req.query && req.query.semester,
    req && req.body && req.body.semesterId,
    req && req.body && req.body.semester,
    req && req.body && req.body.id,
    req && req.body && req.body.code
  ];
  for (const value of candidates) {
    const parsed = parseSemesterId(value);
    if (parsed) return parsed.raw;
  }
  return '';
}

function buildCanonicalPolicy(semesterId) {
  const requiredFromSemester = getCanonicalRequiredFromSemester();
  const canonicalRequired = isCanonicalRequiredSemester(semesterId);
  return {
    semesterId: semesterId || '',
    requiredFromSemester,
    canonicalRequired,
    writePolicy: canonicalRequired ? 'canonical_required_legacy_write_blocked' : 'legacy_write_allowed_for_historical_semester',
    replacementApi: '/api/v3/learning-journey/admin/sync'
  };
}

module.exports = {
  DEFAULT_REQUIRED_FROM,
  parseSemesterId,
  compareSemesterIds,
  getCanonicalRequiredFromSemester,
  isCanonicalRequiredSemester,
  resolveSemesterIdFromRequest,
  buildCanonicalPolicy
};
