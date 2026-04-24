/**
 * 培力英檢批量操作：勾選、批量通過/拒絕/設為報名成功/刪除。
 * 依賴 token、showToast、loadRegistrations 由頁面傳入。
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {(message: string, variant?: string) => void} options.showToast
 * @param {() => void | Promise<void>} options.loadRegistrations
 */
export function useEnglishTestBulkActions({ token, showToast, loadRegistrations }) {
  const [selectedRows, setSelectedRows] = useState([]);

  const handleBulkApprove = useCallback(async () => {
    if (selectedRows.length === 0) return;
    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedRows,
          status: 'approved'
        })
      });
      if (response.ok) {
        alert(`成功批量通過 ${selectedRows.length} 筆記錄`);
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '批量更新失敗');
      }
    } catch (error) {
      console.error('批量更新錯誤:', error);
      alert('批量更新時發生錯誤');
    }
  }, [selectedRows, token, loadRegistrations]);

  const handleBulkReject = useCallback(async (reasons, other, status = 'revision') => {
    if (selectedRows.length === 0) return;
    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedRows,
          status: status,
          rejectionReasons: reasons,
          rejectionOther: other
        })
      });
      if (response.ok) {
        alert(`成功批量${status === 'revision' ? '請修正' : '設為審核中'} ${selectedRows.length} 筆記錄`);
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '批量更新失敗');
      }
    } catch (error) {
      console.error('批量更新錯誤:', error);
      alert('批量更新時發生錯誤');
    }
  }, [selectedRows, token, loadRegistrations]);

  const handleBulkSetSuccess = useCallback(async () => {
    if (selectedRows.length === 0) return;
    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedRows, status: 'success' })
      });
      if (response.ok) {
        showToast(`已將 ${selectedRows.length} 筆設為「報名成功」`, 'success');
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '批量更新失敗', 'danger');
      }
    } catch (error) {
      console.error('批量設為報名成功錯誤:', error);
      showToast('批量更新時發生錯誤', 'danger');
    }
  }, [selectedRows, token, showToast, loadRegistrations]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedRows.length === 0) return;
    try {
      let successCount = 0;
      let failCount = 0;
      for (const id of selectedRows) {
        try {
          const response = await fetch(`/api/english-test/registrations/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) successCount++;
          else failCount++;
        } catch (_) {
          failCount++;
        }
      }
      if (successCount > 0) {
        alert(`成功刪除 ${successCount} 筆記錄${failCount > 0 ? `，${failCount} 筆失敗` : ''}`);
        setSelectedRows([]);
        loadRegistrations();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      console.error('批量刪除錯誤:', error);
      alert('批量刪除時發生錯誤');
    }
  }, [selectedRows, token, loadRegistrations]);

  return {
    selectedRows,
    setSelectedRows,
    handleBulkApprove,
    handleBulkReject,
    handleBulkSetSuccess,
    handleBulkDelete
  };
}
