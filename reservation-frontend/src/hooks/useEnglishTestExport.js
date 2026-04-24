/**
 * 培力英檢匯出：Excel / 證件照。
 * 封裝 exportStatusFilter 與對應下載流程。
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {(message: string, variant?: string) => void} options.showToast
 */
export function useEnglishTestExport({ token, showToast }) {
  const [exportStatusFilter, setExportStatusFilter] = useState('all');

  const handleExport = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (exportStatusFilter !== 'all') {
        params.append('status', exportStatusFilter);
      }

      let fileName = '培力英檢報名資料';
      if (exportStatusFilter === 'pending') {
        fileName = '培力英檢報名資料_待審核';
      } else if (exportStatusFilter === 'approved') {
        fileName = '培力英檢報名資料_已通過';
      } else if (exportStatusFilter === 'revision') {
        fileName = '培力英檢報名資料_請修正';
      } else if (exportStatusFilter === 'success') {
        fileName = '培力英檢報名資料_報名成功';
      } else if (exportStatusFilter === 'failed') {
        fileName = '培力英檢報名資料_報名失敗';
      }
      fileName += `_${new Date().toISOString().split('T')[0]}.xlsx`;

      const response = await fetch(`/api/english-test/registrations/export/excel?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('匯出失敗');
      }
    } catch (error) {
      console.error('匯出錯誤:', error);
      alert('匯出時發生錯誤');
    }
  }, [exportStatusFilter, token]);

  const handleExportPhotos = useCallback(async (status = 'approved') => {
    try {
      const response = await fetch(`/api/english-test/registrations/export/photos?status=${status}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const statusText = status === 'success' ? '報名成功' : '已通過';
        a.href = url;
        a.download = `培力英檢${statusText}證件照_${new Date().toISOString().split('T')[0]}.zip`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast(`已匯出${statusText}證件照`, 'success');
      } else {
        const errorData = await response.json().catch(() => ({ error: '匯出失敗' }));
        showToast(errorData.error || '匯出證件照失敗', 'danger');
      }
    } catch (error) {
      console.error('匯出證件照錯誤:', error);
      showToast('匯出證件照時發生錯誤', 'danger');
    }
  }, [token, showToast]);

  return {
    exportStatusFilter,
    setExportStatusFilter,
    handleExport,
    handleExportPhotos
  };
}

