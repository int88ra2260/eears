/**
 * 學期代碼（ROC 民國年 + 上下學期），與 utils/semesterConstants.js 之學期區間一致：
 * - 上學期（-1）：約 8 月～隔年 1 月
 * - 下學期（-2）：約 2 月～7 月
 *
 * 註：若僅用「當年民國年 + 月份區間」會與一月、二～七月之學年對齊錯誤，故採下列對應。
 */

function getCurrentSemester() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const rocYear = year - 1911;

  if (month >= 8) {
    return `${rocYear}-1`;
  }
  if (month === 1) {
    return `${rocYear - 1}-1`;
  }
  return `${rocYear - 1}-2`;
}

function isValidSemester(str) {
  return /^\d{3}-[12]$/.test(String(str || ''));
}

module.exports = {
  getCurrentSemester,
  isValidSemester,
};
