function normalizeStudentId(input) {
  if (input === null || input === undefined) {
    return '';
  }
  return String(input).trim().replace(/\s+/g, '').toUpperCase();
}

function normalizeStudentPayload(payload = {}) {
  return {
    ...payload,
    studentId: normalizeStudentId(payload.studentId),
    nameZh: payload.nameZh ? String(payload.nameZh).trim() : '',
    nameEn: payload.nameEn ? String(payload.nameEn).trim() : null
  };
}

module.exports = {
  normalizeStudentId,
  normalizeStudentPayload
};
