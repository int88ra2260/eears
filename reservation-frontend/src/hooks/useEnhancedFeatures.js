// hooks/useEnhancedFeatures.js
import { useState, useEffect } from 'react';

/**
 * Feature Flag Hook - 檢查增強功能是否啟用
 * @param {string} token - 認證 token
 * @returns {Object} { flags, loading }
 */
export function useEnhancedFeatures(token) {
  const [flags, setFlags] = useState({
    enhancedUI: false,
    bulkOperations: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const response = await fetch('/api/admin/feature-flags', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setFlags({
            enhancedUI: data.data?.ENGLISH_TEST_ENHANCED_UI ?? false,
            bulkOperations: data.data?.ENGLISH_TEST_BULK_OPERATIONS ?? false
          });
        }
      } catch (error) {
        console.error('載入 Feature Flags 失敗:', error);
        // 預設為 false，使用舊版 UI
        setFlags({
          enhancedUI: false,
          bulkOperations: false
        });
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchFlags();
    } else {
      setLoading(false);
    }
  }, [token]);

  return { flags, loading };
}
