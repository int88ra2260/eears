const crypto = require('crypto');
const { normalizeStudentId } = require('./studentNormalization');

function buildAttemptDedupeKey({ studentId, examVendor, examDate, examScope, sourceRef }) {
  const normalizedStudentId = normalizeStudentId(studentId);
  const normalizedVendor = String(examVendor || 'UNKNOWN').trim().toUpperCase();
  const normalizedDate = String(examDate || '').trim();
  const normalizedScope = String(examScope || 'ALL').trim().toUpperCase();
  const normalizedSourceRef = String(sourceRef || 'NO_SOURCE').trim().toUpperCase();
  const raw = [normalizedStudentId, normalizedVendor, normalizedDate, normalizedScope, normalizedSourceRef].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = {
  buildAttemptDedupeKey
};
