/**
 * 培力英檢報名開關：個人報名、團體報名啟用狀態與切換。
 * 供 EnglishTestManagement 使用。
 */
import { useState, useCallback, useEffect } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {(message: string, variant?: string) => void} options.showToast - 成功/失敗提示
 */
export function useRegistrationSetting({ token, showToast }) {
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [registrationGroupEnabled, setRegistrationGroupEnabled] = useState(true);
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);

  const loadRegistrationSetting = useCallback(async () => {
    try {
      const [indRes, groupRes] = await Promise.all([
        fetch('/api/settings/english-test-registration-enabled', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/settings/english-test-registration-group-enabled', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (indRes.ok) {
        const data = await indRes.json();
        setRegistrationEnabled(data.enabled !== false);
      }
      if (groupRes.ok) {
        const data = await groupRes.json();
        setRegistrationGroupEnabled(data.enabled !== false);
      }
    } catch (error) {
      console.error('載入報名開關設定錯誤:', error);
    }
  }, [token]);

  const handleToggleRegistration = useCallback(async (enabled) => {
    setIsUpdatingSetting(true);
    try {
      const response = await fetch('/api/settings/english-test-registration-enabled', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
      if (response.ok) {
        setRegistrationEnabled(enabled);
        if (showToast) showToast('個人報名開關已更新', 'success');
      } else {
        const errorData = await response.json();
        if (showToast) showToast(errorData.error || '更新設定失敗', 'danger');
      }
    } catch (error) {
      console.error('更新報名開關設定錯誤:', error);
      if (showToast) showToast('更新設定時發生錯誤', 'danger');
    } finally {
      setIsUpdatingSetting(false);
    }
  }, [token, showToast]);

  const handleToggleRegistrationGroup = useCallback(async (enabled) => {
    setIsUpdatingSetting(true);
    try {
      const response = await fetch('/api/settings/english-test-registration-group-enabled', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ enabled })
      });
      if (response.ok) {
        setRegistrationGroupEnabled(enabled);
        if (showToast) showToast('團體報名開關已更新', 'success');
      } else {
        const errorData = await response.json();
        if (showToast) showToast(errorData.error || '更新設定失敗', 'danger');
      }
    } catch (error) {
      console.error('更新團體報名開關設定錯誤:', error);
      if (showToast) showToast('更新設定時發生錯誤', 'danger');
    } finally {
      setIsUpdatingSetting(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (token) loadRegistrationSetting();
  }, [token, loadRegistrationSetting]);

  return {
    registrationEnabled,
    registrationGroupEnabled,
    isUpdatingSetting,
    loadRegistrationSetting,
    handleToggleRegistration,
    handleToggleRegistrationGroup
  };
}
