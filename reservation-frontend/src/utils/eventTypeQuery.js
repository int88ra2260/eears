/**
 * /events?type= 與 EventList eventTypeFilter（後端 eventType 字串）雙向對應
 * slug 與 activitySlugs.js / filterOptions.tabId 一致，不更動商業命名。
 */

const QUERY_TO_FILTER = {
  all: 'all',
  'english-table': 'English Table',
  'english-club': 'English Club',
  'international-forum': 'International Forum',
  'job-talk': 'Job Talk',
};

const FILTER_TO_QUERY = {
  all: 'all',
  'English Table': 'english-table',
  'English Club': 'english-club',
  'International Forum': 'international-forum',
  'Job Talk': 'job-talk',
};

export const VALID_EVENT_TYPE_QUERY_KEYS = Object.keys(QUERY_TO_FILTER);

/**
 * @param {string | null | undefined} raw - URL 上的 type 參數
 * @returns {string} eventTypeFilter 值：'all' 或英文活動類型名
 */
export function parseEventTypeQueryParam(raw) {
  if (raw == null || raw === '') return 'all';
  const key = String(raw).trim().toLowerCase();
  if (key === 'all') return 'all';
  return QUERY_TO_FILTER[key] ?? 'all';
}

/**
 * @param {string} raw
 * @returns {boolean} 有給值但無法對應時為 true（應將 URL 正規化為 type=all）
 */
export function isInvalidEventTypeQueryParam(raw) {
  if (raw == null || raw === '') return false;
  const key = String(raw).trim().toLowerCase();
  if (key === 'all') return false;
  return QUERY_TO_FILTER[key] === undefined;
}

/**
 * @param {string} filterValue - eventTypeFilter state
 * @returns {string} query 用的 slug：all | english-table | ...
 */
export function eventTypeFilterToQueryParam(filterValue) {
  if (filterValue === 'all') return 'all';
  return FILTER_TO_QUERY[filterValue] ?? 'all';
}

/**
 * 活動日曆預約頁路徑（含選填 type）
 * @param {string} [typeSlug] - english-table 等；省略或 all 為總覽
 * @returns {string} 例如 /events 或 /events?type=english-table
 */
export function getEventsCalendarPath(typeSlug) {
  if (!typeSlug || typeSlug === 'all') return '/events';
  const key = String(typeSlug).trim().toLowerCase();
  if (key === 'all') return '/events';
  if (QUERY_TO_FILTER[key] === undefined) return '/events';
  return `/events?type=${encodeURIComponent(key)}`;
}
