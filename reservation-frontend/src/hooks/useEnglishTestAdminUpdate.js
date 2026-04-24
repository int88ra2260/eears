/**
 * 培力英檢後台修改報名資料與上傳檔案：DetailModalWithTabs 內更新/上傳。
 * 依賴 selectedRegistration、setSelectedRegistration、registrations、setRegistrations、loadRegistrations、showToast 由頁面傳入。
 */
import { useCallback } from 'react';

/**
 * @param {Object} options
 * @param {Object|null} options.selectedRegistration
 * @param {Function} options.setSelectedRegistration
 * @param {Array} options.registrations
 * @param {Function} options.setRegistrations
 * @param {() => void | Promise<void>} options.loadRegistrations
 * @param {(message: string, variant?: string) => void} options.showToast
 */
export function useEnglishTestAdminUpdate({
  selectedRegistration,
  setSelectedRegistration,
  registrations,
  setRegistrations,
  loadRegistrations,
  showToast
}) {
  const handleUpdateRegistration = useCallback(async (registrationId, updateData, authToken) => {
    try {
      const cleanedUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          cleanedUpdateData[key] = updateData[key];
        }
      });

      if (Object.keys(cleanedUpdateData).length === 0) {
        showToast('沒有需要更新的資料', 'info');
        const currentRegistration = registrations.find(reg => reg.id === registrationId) || selectedRegistration;
        return currentRegistration || null;
      }

      console.log('發送更新請求:', { registrationId, updateData: cleanedUpdateData });

      const response = await fetch(`/api/english-test/registrations/${registrationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(cleanedUpdateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('更新失敗:', errorData);
        throw new Error(errorData.error || '更新失敗');
      }

      const result = await response.json();
      const updatedRegistration = result.registration || result;

      console.log('更新成功:', updatedRegistration);

      if (selectedRegistration && selectedRegistration.id === registrationId) {
        setSelectedRegistration(updatedRegistration);
      }

      setRegistrations(prev =>
        prev.map(reg => reg.id === registrationId ? updatedRegistration : reg)
      );

      await loadRegistrations();

      showToast('報名資料已更新', 'success');
      return updatedRegistration;
    } catch (error) {
      console.error('更新報名資料錯誤:', error);
      showToast(error.message || '更新失敗，請稍後再試', 'danger');
      throw error;
    }
  }, [selectedRegistration, setSelectedRegistration, registrations, setRegistrations, loadRegistrations, showToast]);

  const handleUploadRegistrationFiles = useCallback(async (registrationId, formData, authToken) => {
    const response = await fetch(`/api/english-test/registrations/${registrationId}/files`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${authToken}` },
      body: formData
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || '檔案上傳失敗');
    }
    const data = await response.json();
    if (data.registration && selectedRegistration?.id === registrationId) {
      setSelectedRegistration(data.registration);
    }
    if (data.message) showToast(data.message, 'success');
    return data.registration;
  }, [selectedRegistration, setSelectedRegistration, showToast]);

  return {
    handleUpdateRegistration,
    handleUploadRegistrationFiles
  };
}
