/**
 * 培力英檢報名狀態更新：狀態 Modal、快速更新、執行 API、與拒絕原因 Modal 的銜接。
 * 依賴 selectedRegistration / setSelectedRegistration、列表 setRegistrations、loadRegistrations 等由頁面傳入。
 * 拒絕原因 Modal（showRejectionModal、rejectionReasons、handleConfirmRejection）保留在頁面，經由 onOpenRejectionModal 與 performStatusUpdate 串接。
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {Object|null} options.selectedRegistration
 * @param {Function} options.setSelectedRegistration
 * @param {(msg: string, variant?: string) => void} options.showToast
 * @param {Function} options.setRegistrations
 * @param {Function} options.loadRegistrations
 * @param {Function} options.setSelectedRows
 * @param {Function} options.setShowRejectionModal - 成功後關閉拒絕 Modal
 * @param {boolean} [options.showDetailModal]
 * @param {(id: string) => void} [options.handleViewDetail] - 成功後可重新載入詳情
 * @param {() => void} options.onOpenRejectionModal - 切到「請修正/報名失敗」時由頁面開啟拒絕 Modal（清空 reasons、顯示 Modal）
 */
export function useEnglishTestStatusUpdate({
  token,
  selectedRegistration,
  setSelectedRegistration,
  showToast,
  setRegistrations,
  loadRegistrations,
  setSelectedRows,
  setShowRejectionModal,
  showDetailModal = false,
  handleViewDetail,
  onOpenRejectionModal
}) {
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);

  const performStatusUpdate = useCallback(async (newStatus, reasons, other, targetId = null) => {
    const id = targetId || selectedRegistration?.id;
    if (!id) return;

    try {
      const requestBody = {
        status: newStatus,
        notes: selectedRegistration?.notes || ''
      };
      if (newStatus === 'revision' || newStatus === 'failed') {
        requestBody.rejectionReasons = reasons || [];
        requestBody.rejectionOther = other || '';
      }

      const response = await fetch(`/api/english-test/registrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const statusText = { pending: '審核中', approved: '已通過', revision: '請修正', success: '報名成功', failed: '報名失敗' }[newStatus] || newStatus;
        showToast(`狀態已更新為「${statusText}」`, 'success');
        if (selectedRegistration && selectedRegistration.id === id) {
          const result = await response.json();
          const updatedData = result.registration || result;
          setSelectedRegistration(updatedData);
        }
        setRegistrations(prev =>
          prev.map(reg => reg.id === id ? { ...reg, status: newStatus } : reg)
        );
        loadRegistrations();
        setShowRejectionModal(false);
        setPendingStatusUpdate(null);
        setSelectedRows(prev => prev.filter(rowId => rowId !== id));
      } else {
        const errorData = await response.json();
        alert(errorData.error || '狀態更新失敗');
      }
    } catch (error) {
      console.error('更新狀態錯誤:', error);
      alert('更新狀態時發生錯誤');
    }
  }, [token, selectedRegistration, setSelectedRegistration, showToast, setRegistrations, loadRegistrations, setSelectedRows, setShowRejectionModal]);

  const handleQuickStatusUpdate = useCallback(async (id, newStatus) => {
    const targetId = id || selectedRegistration?.id;
    if (!targetId) return;

    if (newStatus === 'revision' || newStatus === 'failed') {
      if (id && !selectedRegistration) {
        try {
          const response = await fetch(`/api/english-test/registrations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const data = await response.json();
            setSelectedRegistration(data);
          }
        } catch (_) {}
      }
      setPendingStatusUpdate(newStatus);
      onOpenRejectionModal();
      return;
    }
    await performStatusUpdate(newStatus, null, null, targetId);
  }, [selectedRegistration, setSelectedRegistration, token, performStatusUpdate, onOpenRejectionModal]);

  const handleUpdateStatus = useCallback(async () => {
    if (!selectedRegistration) return;

    if (statusUpdate.status === 'revision' || statusUpdate.status === 'failed') {
      setPendingStatusUpdate(statusUpdate.status);
      setShowStatusModal(false);
      onOpenRejectionModal();
      return;
    }

    try {
      const response = await fetch(`/api/english-test/registrations/${selectedRegistration.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(statusUpdate)
      });

      if (response.ok) {
        alert('狀態更新成功');
        setShowStatusModal(false);
        setStatusUpdate({ status: '', notes: '' });
        loadRegistrations();
        if (showDetailModal && handleViewDetail) {
          handleViewDetail(selectedRegistration.id);
        }
      } else {
        alert('狀態更新失敗');
      }
    } catch (error) {
      console.error('更新狀態錯誤:', error);
      alert('更新狀態時發生錯誤');
    }
  }, [selectedRegistration, statusUpdate, token, showDetailModal, handleViewDetail, loadRegistrations, onOpenRejectionModal]);

  /** 狀態下拉選單 onChange：選「請修正/報名失敗」時關閉狀態 Modal 並開啟拒絕 Modal */
  const handleStatusSelectChange = useCallback((newStatus) => {
    setStatusUpdate(prev => ({ ...prev, status: newStatus }));
    if (newStatus === 'revision' || newStatus === 'failed') {
      setPendingStatusUpdate(newStatus);
      setShowStatusModal(false);
      onOpenRejectionModal();
    }
  }, [onOpenRejectionModal]);

  return {
    showStatusModal,
    setShowStatusModal,
    statusUpdate,
    setStatusUpdate,
    pendingStatusUpdate,
    setPendingStatusUpdate,
    performStatusUpdate,
    handleQuickStatusUpdate,
    handleUpdateStatus,
    handleStatusSelectChange
  };
}
