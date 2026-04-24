/**
 * 活動明細頁最小觀測點（僅開發環境 console.debug）
 */
export function debugEventDetail(tag, payload) {
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[EEARS EventDetail]', tag, payload ?? '');
  }
}
