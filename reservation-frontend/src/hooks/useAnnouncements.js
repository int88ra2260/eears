import { useState, useEffect } from 'react';
import { fetchPublicAnnouncements, normalizeAnnouncementItem } from '../services/announcementApi';
import { getReliabilityFault, makeDevRequestId } from '../utils/reliabilityFaults';

const DEFAULT_LIMIT = 3;

/**
 * 前台公告列表（與後端 GET /api/announcements 一致）
 * @param {number|object} limitOrOptions — 數字：首頁用；物件：{ limit, page, q, category, tag, keyword, sliceMax }
 * @param {object} [extra] — limit 為數字時可傳 { page, q, category, tag, keyword, sliceMax }
 */
export default function useAnnouncements(limitOrOptions = DEFAULT_LIMIT, extra = {}) {
  const isNum = typeof limitOrOptions === 'number';
  const limit = isNum ? limitOrOptions : (limitOrOptions?.limit ?? DEFAULT_LIMIT);
  const page = isNum ? (extra.page ?? 1) : (limitOrOptions?.page ?? 1);
  const keyword = isNum ? extra.keyword : limitOrOptions?.keyword;
  const q = isNum ? extra.q : limitOrOptions?.q;
  const category = isNum ? extra.category : limitOrOptions?.category;
  const tag = isNum ? extra.tag : limitOrOptions?.tag;
  const sliceMax = isNum
    ? (extra.sliceMax != null ? extra.sliceMax : limit)
    : (limitOrOptions?.sliceMax != null ? limitOrOptions.sliceMax : null);

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, page: 1, limit });
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryIndex, setRetryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const fault = getReliabilityFault();
    const devRid = makeDevRequestId('DEV');

    const apiCall = () => {
      if (fault === 'announcementsApi500') {
        return Promise.reject(new Error(`伺服器錯誤，請稍後再試（錯誤識別碼：${devRid}）`));
      }
      if (fault === 'announcementsNetworkError') {
        return Promise.reject(new Error(`網路異常，請檢查連線（錯誤識別碼：${devRid}）`));
      }
      if (fault === 'announcementsTimeout') {
        return Promise.reject(new Error(`請求超時，請稍後重試（錯誤識別碼：${devRid}）`));
      }
      return fetchPublicAnnouncements({
        limit,
        page,
        keyword,
        q,
        category,
        tag,
      });
    };

    apiCall()
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.items) ? data.items : [];
        let mapped = list.map(normalizeAnnouncementItem);
        if (sliceMax != null) {
          mapped = mapped.slice(0, sliceMax);
        }
        setItems(mapped);
        setPagination(data?.pagination || { total: 0, totalPages: 1, page, limit });
        setFilters(data?.filters ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || '載入失敗');
          setItems([]);
          setFilters(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [limit, page, keyword, q, category, tag, sliceMax, retryIndex]);

  const retry = () => setRetryIndex((i) => i + 1);

  return { items, loading, error, retry, pagination, filters };
}
