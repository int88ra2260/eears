/**
 * 培力英檢數據分析：Q21 從何得知培力英檢統計。
 * 依賴 token、mainTab 由頁面傳入；切到 analytics 時自動載入。
 */
import { useState, useCallback, useEffect } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {string} options.mainTab - 'individual' | 'group' | 'analytics'
 */
export function useEnglishTestAnalytics({ token, mainTab }) {
  const [infoSourceStats, setInfoSourceStats] = useState({ data: [], total: 0 });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const loadInfoSourceStats = useCallback(async () => {
    if (mainTab !== 'analytics') return;
    setAnalyticsLoading(true);
    try {
      const response = await fetch('/api/english-test/registrations/stats/info-source', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const json = await response.json();
        setInfoSourceStats({ data: json.data || [], total: json.total || 0 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [mainTab, token]);

  useEffect(() => {
    if (mainTab === 'analytics') loadInfoSourceStats();
  }, [mainTab, loadInfoSourceStats]);

  return {
    infoSourceStats,
    analyticsLoading,
    loadInfoSourceStats
  };
}
