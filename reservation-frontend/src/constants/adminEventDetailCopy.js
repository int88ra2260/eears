/**
 * 活動明細（Admin Event Detail）— 載入／錯誤／空白狀態文案（Phase 5.5 統一語氣）
 */
export const EVENT_DETAIL_COPY = {
  /** 整頁等待 meta */
  pageLoading: '載入中…',
  /** 頁首統計（aggregate）尚未就緒 */
  headerStatsLoading: '載入統計中…',
  /** 預約／簽到 tab 名單區塊 */
  listLoading: '載入名單中…',
  /** 違規 tab 需同時載入名單與違規 */
  listAndViolationsLoading: '載入名單與違規資料中…',
  /** 預約名單表格無資料（非搜尋無結果） */
  emptyReservations: '目前沒有預約資料',
  /** 違規列表無資料 */
  emptyViolations: '尚無違規紀錄',
  /** 簽到管理：無待簽到者 */
  emptyPendingCheckin: '目前沒有未簽到的預約',
  /** meta 端點失敗 */
  metaLoadFailed: '載入活動資料失敗',
  /** 預約名單端點失敗（顯示於 Alert） */
  reservationsLoadFailed: '名單載入失敗',
  /** 違規端點失敗（顯示於 Alert） */
  violationsLoadFailed: '違規資料載入失敗',
};
