import { useState, useEffect, useCallback, useRef } from 'react';
import { EVENT_DETAIL_COPY } from '../constants/adminEventDetailCopy';
import { debugEventDetail } from '../utils/eventDetailDebug';

/**
 * 活動違規紀錄（GET /api/events/:id/violations）— 違規 tab lazy load
 */
export function useEventViolations({ token, eventId, enabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [list, setList] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  const fetchList = useCallback(async () => {
    if (!eventId || !token) return [];
    const res = await fetch(`/api/events/${eventId}/violations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      const msg = data?.error || data?.message || EVENT_DETAIL_COPY.violationsLoadFailed;
      throw new Error(msg);
    }
    return Array.isArray(data) ? data : [];
  }, [eventId, token]);

  const load = useCallback(
    async (force = false) => {
      if (!eventId || !token) return;
      if (loadedRef.current && !force) return;
      setLoading(true);
      setError('');
      try {
        const rows = await fetchList();
        setList(rows);
        loadedRef.current = true;
        setLoaded(true);
        debugEventDetail('violations:loaded', { eventId, count: rows.length });
      } catch (e) {
        setError(e.message || EVENT_DETAIL_COPY.violationsLoadFailed);
      } finally {
        setLoading(false);
      }
    },
    [eventId, token, fetchList]
  );

  useEffect(() => {
    if (!enabled || !eventId || !token) return;
    if (loadedRef.current) return;
    load(false);
  }, [enabled, eventId, token, load]);

  const refresh = useCallback(async () => {
    if (!eventId || !token) return;
    setLoading(true);
    setError('');
    try {
      const rows = await fetchList();
      setList(rows);
      loadedRef.current = true;
      setLoaded(true);
      debugEventDetail('violations:refresh', { eventId, count: rows.length });
    } catch (e) {
      setError(e.message || EVENT_DETAIL_COPY.violationsLoadFailed);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [eventId, token, fetchList]);

  const invalidateCache = useCallback(() => {
    loadedRef.current = false;
    setLoaded(false);
    setList([]);
  }, []);

  return {
    loading,
    error,
    loaded,
    list,
    setList,
    refresh,
    load,
    invalidateCache,
  };
}
