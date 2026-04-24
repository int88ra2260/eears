/**
 * 培力英檢報名狀態顯示文字與樣式。
 * 供 EnglishTestManagement、表格、Modal 等共用。
 *
 * @param {string} status - pending | approved | revision | success | failed
 * @returns {{ text: string, class: string }}
 */
export function getStatusText(status) {
  const statusMap = {
    'pending': { text: '審核中', class: 'warning' },
    'approved': { text: '已通過', class: 'success' },
    'revision': { text: '請修正', class: 'danger' },
    'success': { text: '報名成功', class: 'success' },
    'failed': { text: '報名失敗', class: 'secondary' }
  };
  return statusMap[status] || { text: status, class: 'secondary' };
}
