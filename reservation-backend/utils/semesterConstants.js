/**
 * 學期日期範圍（與 adminClassesController 一致，供 analytics / evaluation 共用）
 */
const SEMESTER_RANGES = {
  '114-1': { start: '2025-08-01', end: '2026-01-31' },
  '113-2': { start: '2025-02-01', end: '2025-07-31' },
  '114-2': { start: '2026-02-01', end: '2026-07-31' },
  '115-1': { start: '2026-09-01', end: '2027-01-31' },
  '115-2': { start: '2027-02-01', end: '2027-07-31' }
};

/** 顯示／排序用（由早到晚） */
const SEMESTER_ORDER = ['113-2', '114-1', '114-2', '115-1', '115-2'];

function compareSemester(a, b) {
  const ia = SEMESTER_ORDER.indexOf(a);
  const ib = SEMESTER_ORDER.indexOf(b);
  if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

module.exports = {
  SEMESTER_RANGES,
  SEMESTER_ORDER,
  compareSemester
};
