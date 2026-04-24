/**
 * 與後端 reservation-backend/utils/semester.js 邏輯一致（僅供顯示或比對 API 回傳之 currentSemester，不作為權威學期來源）。
 */
export function getCurrentSemester() {
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

export function isValidSemester(str) {
  return /^\d{3}-[12]$/.test(String(str || ''));
}
