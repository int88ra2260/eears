/**
 * 共用確認框：集中管理 show/config、openConfirm、closeConfirm。
 * 支援 async onConfirm；ConfirmModal 可由呼叫方渲染並綁定回傳值。
 */
import { useState, useCallback } from 'react';

const initialState = { show: false, config: null };

/**
 * @returns {{ confirmModal: { show: boolean, config: object | null }, openConfirm: (config: object) => void, closeConfirm: () => void }}
 * config 建議欄位：title, message, confirmLabel?, cancelLabel?, variant?, onConfirm? (可為 async)
 */
export function useConfirmModal() {
  const [confirmModal, setConfirmModal] = useState(initialState);

  const openConfirm = useCallback((config) => {
    setConfirmModal({ show: true, config: config || null });
  }, []);

  const closeConfirm = useCallback(() => {
    setConfirmModal(initialState);
  }, []);

  return {
    confirmModal,
    openConfirm,
    closeConfirm
  };
}
