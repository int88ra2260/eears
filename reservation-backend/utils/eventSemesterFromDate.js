/**
 * 依活動日期（YYYY-MM-DD）對應學期代碼，與後台活動報表 / AdminHome 邏輯一致。
 * @param {string|Date} date
 * @returns {string} 如 114-1、113-2；無法對應時為 other
 */
function getSemesterInfo(date) {
  const eventDate = new Date(date);
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1;

  if (year === 2025 && month >= 2 && month <= 7) {
    return '113-2';
  }
  if ((year === 2025 && month >= 8) || (year === 2026 && month <= 1)) {
    return '114-1';
  }
  if (year === 2026 && month >= 2 && month <= 7) {
    return '114-2';
  }
  if ((year === 2026 && month >= 9) || (year === 2027 && month <= 1)) {
    return '115-1';
  }
  if (year === 2027 && month >= 2 && month <= 7) {
    return '115-2';
  }

  return 'other';
}

module.exports = { getSemesterInfo };
