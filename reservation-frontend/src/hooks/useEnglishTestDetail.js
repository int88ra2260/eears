/**
 * 培力英檢報名詳情：單筆載入、Modal 開關、上一筆/下一筆導航、關閉時還原捲動。
 * 依賴列表資料與 buildListParams，由 EnglishTestManagement 傳入。
 */
import { useState, useCallback } from 'react';

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {Array} options.registrations - 當前頁列表
 * @param {Function} options.setRegistrations
 * @param {number} options.currentPage
 * @param {Function} options.setCurrentPage
 * @param {number} options.totalPages
 * @param {number} options.total
 * @param {number} options.limit
 * @param {(pageOverride?: number) => URLSearchParams} options.buildListParams
 * @param {Function} options.setLoading
 * @param {Function} options.setTotalPages
 * @param {Function} options.setTotal
 * @param {Function} options.setStats
 * @param {(message: string, variant?: string) => void} options.showToast
 * @param {React.RefObject<HTMLElement>} options.tableContainerRef - 表格容器，用於儲存/還原捲動位置
 * @param {React.MutableRefObject<number>} options.scrollPositionRef - 儲存捲動位置
 */
export function useEnglishTestDetail({
  token,
  registrations,
  setRegistrations,
  currentPage,
  setCurrentPage,
  totalPages,
  total,
  limit,
  buildListParams,
  setLoading,
  setTotalPages,
  setTotal,
  setStats,
  showToast,
  tableContainerRef,
  scrollPositionRef
}) {
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentRegistrationIndex, setCurrentRegistrationIndex] = useState(-1);

  const handleViewDetail = useCallback(async (id, index = null) => {
    if (tableContainerRef?.current) {
      scrollPositionRef.current = tableContainerRef.current.scrollTop ?? 0;
    }
    try {
      const response = await fetch(`/api/english-test/registrations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedRegistration(data);
        if (index !== null) {
          setCurrentRegistrationIndex(index);
        } else {
          const foundIndex = registrations.findIndex(reg => reg.id === id);
          setCurrentRegistrationIndex(foundIndex);
        }
        setShowDetailModal(true);
      } else {
        alert('載入詳細資料失敗');
      }
    } catch (error) {
      console.error('載入詳細資料錯誤:', error);
      alert('載入詳細資料時發生錯誤');
    }
  }, [token, registrations, scrollPositionRef, tableContainerRef]);

  const fetchPageAndOpenAt = useCallback(async (page, indexInPage) => {
    setLoading(true);
    try {
      const params = buildListParams(page);
      const response = await fetch(`/api/english-test/registrations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      const list = data.data || [];
      const index = indexInPage !== undefined ? indexInPage : Math.max(0, list.length - 1);
      const reg = list[index];
      if (!reg) return;
      setRegistrations(list);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      if (data.stats) setStats(data.stats);
      setCurrentPage(page);
      setCurrentRegistrationIndex(index);
      const detailRes = await fetch(`/api/english-test/registrations/${reg.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (detailRes.ok) {
        const detail = await detailRes.json();
        setSelectedRegistration(detail);
        setShowDetailModal(true);
      }
    } catch (e) {
      console.error(e);
      if (showToast) showToast('載入上一筆/下一筆時發生錯誤', 'danger');
    } finally {
      setLoading(false);
    }
  }, [token, buildListParams, setRegistrations, setCurrentPage, setTotalPages, setTotal, setStats, setLoading, showToast]);

  const handleNavigatePrevious = useCallback(() => {
    if (currentRegistrationIndex > 0) {
      const prev = registrations[currentRegistrationIndex - 1];
      handleViewDetail(prev.id, currentRegistrationIndex - 1);
      return;
    }
    if (currentPage > 1) {
      fetchPageAndOpenAt(currentPage - 1, undefined);
    }
  }, [currentRegistrationIndex, registrations, currentPage, handleViewDetail, fetchPageAndOpenAt]);

  const handleNavigateNext = useCallback(() => {
    if (currentRegistrationIndex < registrations.length - 1) {
      const next = registrations[currentRegistrationIndex + 1];
      handleViewDetail(next.id, currentRegistrationIndex + 1);
      return;
    }
    if (currentPage < totalPages) {
      fetchPageAndOpenAt(currentPage + 1, 0);
    }
  }, [currentRegistrationIndex, registrations, currentPage, totalPages, handleViewDetail, fetchPageAndOpenAt]);

  const canNavigatePrevious = total > 0 && (currentPage > 1 || currentRegistrationIndex > 0);
  const canNavigateNext = total > 0 && (currentPage < totalPages || currentRegistrationIndex < registrations.length - 1);

  const handleCloseDetailModal = useCallback(() => {
    setShowDetailModal(false);
    setCurrentRegistrationIndex(-1);
    requestAnimationFrame(() => {
      if (tableContainerRef?.current && scrollPositionRef?.current !== undefined) {
        tableContainerRef.current.scrollTop = scrollPositionRef.current;
      }
    });
  }, [tableContainerRef, scrollPositionRef]);

  return {
    selectedRegistration,
    setSelectedRegistration,
    showDetailModal,
    setShowDetailModal,
    currentRegistrationIndex,
    setCurrentRegistrationIndex,
    handleViewDetail,
    fetchPageAndOpenAt,
    handleNavigatePrevious,
    handleNavigateNext,
    canNavigatePrevious,
    canNavigateNext,
    handleCloseDetailModal
  };
}
