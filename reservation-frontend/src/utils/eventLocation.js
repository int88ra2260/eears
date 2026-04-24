/**
 * 活動地點：與 EventBookingSummary 邏輯一致，供日曆 hover 等處共用
 */
export function getDefaultLocation(eventType) {
  switch (eventType) {
    case 'English Table':
      return '圖資１０樓 西灣廣場';
    case 'English Club':
      return '綜合大樓 - GE3013教室';
    case 'International Forum':
      return '綜合大樓 - GE3013教室';
    case 'Job Talk':
      return '中山貨櫃創業基地 1樓 角落會議室';
    default:
      return '待定';
  }
}

/**
 * @param {{ location?: string, eventType?: string }} event
 */
export function getEventLocationDisplay(event) {
  if (!event) return '';
  return event.location?.trim() || getDefaultLocation(event.eventType);
}
