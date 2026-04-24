/**
 * 培力英檢報名「請修正」/「報名失敗」拒絕原因選項與文字轉換。
 * 供 EnglishTestManagement、DetailModalWithTabs、QuickReviewMode 等共用。
 */

export const rejectionReasonOptions = [
  { id: '1', text: '照片五官不夠清晰' },
  { id: '2', text: '照片上有鋼印、浮水印或反光遮住五官' },
  { id: '3', text: '照片背景非白色或淺色' },
  { id: '4', text: '臉部未正視鏡頭，不是證件照表情、或使用生活照' },
  { id: '5', text: '髮型遮住耳朵、瀏海蓋住眉毛、或頭髮碰到照片邊框' },
  { id: '6', text: '照片背景非白色、照片太暗或逆光' },
  { id: '7', text: '有閃光反射在眼睛上、配戴深色鏡片、鏡框遮蓋眼睛' },
  { id: '8', text: '非本人照片' },
  { id: '9', text: '檔案格式不是jpg檔或png檔' },
  { id: '10', text: '檔案小於100KB或大於5MB' },
  { id: '11', text: '基本聯絡資訊資料有誤' },
  { id: '12', text: '身分與學籍資料有誤' },
  { id: '13', text: '特殊身分與協助需求資料有誤' },
  { id: '14', text: '照片與同意事項資料有誤' },
  { id: '15', text: '資訊來源資料有誤' },
  { id: '16', text: '英語能力與培力資格相關資料有誤' },
  { id: '其他', text: '其他(須說明原因)' }
];

/**
 * @param {string} reasonId - 原因 id（如 '1'、'其他'）
 * @returns {string} 對應的顯示文字
 */
export function getRejectionReasonText(reasonId) {
  const option = rejectionReasonOptions.find(opt => opt.id === reasonId || opt.id === String(reasonId));
  return option ? option.text : reasonId;
}
