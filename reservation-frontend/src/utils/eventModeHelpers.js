/**
 * EventList 頁面模式與 pathname / initialTab 的對應
 * 不改變既有路由，僅供內部判斷與未來拆分參考
 */
import { EVENTS, RESERVATIONS, ACTIVITY_CATEGORY } from '../constants/pageModes';

/**
 * 依 pathname 取得 EventList 的顯示模式
 * @param {string} pathname - location.pathname
 * @returns {string} EVENTS | RESERVATIONS | ACTIVITY_CATEGORY
 */
export function getEventListMode(pathname) {
  if (pathname === '/my-reservations') return RESERVATIONS;
  if (pathname.startsWith('/activities/') && pathname !== '/activities') return ACTIVITY_CATEGORY;
  return EVENTS;
}

/**
 * 是否為「我的預約查詢」模式（強調查詢/取消，非一般活動瀏覽）
 */
export function isReservationsMode(pathname) {
  return getEventListMode(pathname) === RESERVATIONS;
}

/**
 * 是否為「活動分類頁」模式（/activities/:slug）
 */
export function isActivityCategoryMode(pathname) {
  return getEventListMode(pathname) === ACTIVITY_CATEGORY;
}
