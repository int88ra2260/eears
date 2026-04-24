/**
 * 培力英檢拒絕原因 Modal：顯示、勾選原因、確認後呼叫 performStatusUpdate。
 * 依賴 pendingStatusUpdate / setPendingStatusUpdate / performStatusUpdate 由頁面或 useEnglishTestStatusUpdate 傳入。
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {'revision'|'failed'|null} options.pendingStatusUpdate - 待套用的狀態（決定標題/按鈕文案）
 * @param {Function} options.setPendingStatusUpdate
 * @param {(status: string, reasons: string[], other: string, targetId?: number) => Promise<void>} options.performStatusUpdate
 */
export function useEnglishTestRejection({
  pendingStatusUpdate,
  setPendingStatusUpdate,
  performStatusUpdate
}) {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [rejectionOther, setRejectionOther] = useState('');

  const handleRejectionReasonChange = useCallback((reasonId) => {
    setRejectionReasons(prev => {
      if (prev.includes(reasonId)) return prev.filter(id => id !== reasonId);
      return [...prev, reasonId];
    });
  }, []);

  const handleConfirmRejection = useCallback(() => {
    if (rejectionReasons.length === 0) {
      alert(pendingStatusUpdate === 'failed' ? '請至少選擇一個報名失敗原因' : '請至少選擇一個拒絕原因');
      return;
    }
    if (rejectionReasons.includes('其他') && (!rejectionOther || rejectionOther.trim() === '')) {
      alert('選擇「其他」時，必須填寫說明');
      return;
    }
    const statusToApply = pendingStatusUpdate === 'failed' ? 'failed' : 'revision';
    performStatusUpdate(statusToApply, rejectionReasons, rejectionOther);
  }, [rejectionReasons, rejectionOther, pendingStatusUpdate, performStatusUpdate]);

  /** 開啟拒絕 Modal 並清空原因（由 useEnglishTestStatusUpdate 的 onOpenRejectionModal 呼叫） */
  const openRejectionModal = useCallback(() => {
    setRejectionReasons([]);
    setRejectionOther('');
    setShowRejectionModal(true);
  }, []);

  /** 關閉 Modal 並清除 pending（Esc、取消、點擊 backdrop 用） */
  const handleCloseRejectionModal = useCallback(() => {
    setShowRejectionModal(false);
    setPendingStatusUpdate(null);
  }, [setPendingStatusUpdate]);

  return {
    showRejectionModal,
    setShowRejectionModal,
    rejectionReasons,
    rejectionOther,
    setRejectionOther,
    handleRejectionReasonChange,
    handleConfirmRejection,
    openRejectionModal,
    handleCloseRejectionModal
  };
}
