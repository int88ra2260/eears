/**
 * 培力英檢「快速審核模式」：開啟/關閉、跨頁載入、上一筆/下一筆待審核。
 * 依賴列表 state、載入函式與 performStatusUpdate，由頁面傳入。
 */
import { useState, useCallback, useEffect } from 'react';

/**
 * @param {Object} options
 * @param {Array} options.registrations
 * @param {number} options.currentPage
 * @param {number} options.totalPages
 * @param {(pageOverride?: number) => URLSearchParams} options.buildListParams
 * @param {string} options.token
 * @param {(message: string, variant?: string) => void} options.showToast
 * @param {Function} options.setRegistrations
 * @param {Function} options.setTotalPages
 * @param {Function} options.setTotal
 * @param {Function} options.setStats
 * @param {Function} options.setCurrentPage
 * @param {Object|null} options.selectedRegistration
 * @param {Function} options.setSelectedRegistration
 * @param {(status: string, reasons: string[]|null, other: string|null, targetId: number) => Promise<void>} options.performStatusUpdate
 * @param {Function} options.loadRegistrations
 */
export function useEnglishTestQuickReview({
  registrations,
  currentPage,
  totalPages,
  buildListParams,
  token,
  showToast,
  setRegistrations,
  setTotalPages,
  setTotal,
  setStats,
  setCurrentPage,
  selectedRegistration,
  setSelectedRegistration,
  performStatusUpdate,
  loadRegistrations
}) {
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [quickReviewIndex, setQuickReviewIndex] = useState(-1);

  const handleOpenQuickReview = useCallback(() => {
    const pendingRegistrations = registrations.filter(reg => reg.status === 'pending');
    if (pendingRegistrations.length === 0) {
      showToast('目前沒有待審核的記錄', 'warning');
      return;
    }
    setQuickReviewIndex(0);
    setSelectedRegistration(pendingRegistrations[0]);
    setShowQuickReview(true);
  }, [registrations, showToast, setSelectedRegistration]);

  const fetchNextPageForQuickReview = useCallback(async () => {
    const nextPage = currentPage + 1;
    if (nextPage > totalPages) return false;
    const params = buildListParams(nextPage);
    const response = await fetch(`/api/english-test/registrations?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return false;
    const data = await response.json();
    const list = data.data || [];
    if (list.length === 0) return false;
    setRegistrations(list);
    setTotalPages(data.totalPages || 1);
    setTotal(data.total || 0);
    if (data.stats) setStats(data.stats);
    setCurrentPage(nextPage);
    setQuickReviewIndex(0);
    setSelectedRegistration(list[0]);
    return true;
  }, [currentPage, totalPages, buildListParams, token, setRegistrations, setTotalPages, setTotal, setStats, setCurrentPage, setSelectedRegistration]);

  const handleQuickReviewNext = useCallback(async () => {
    const pendingRegistrations = registrations.filter(reg => reg.status === 'pending');
    if (pendingRegistrations.length === 0) {
      const loaded = await fetchNextPageForQuickReview();
      if (!loaded) {
        showToast('已審核完所有待審核記錄', 'success');
        setShowQuickReview(false);
        setQuickReviewIndex(-1);
      }
      return;
    }
    const nextIndex = quickReviewIndex + 1;
    if (nextIndex < pendingRegistrations.length) {
      setQuickReviewIndex(nextIndex);
      setSelectedRegistration(pendingRegistrations[nextIndex]);
      return;
    }
    const loaded = await fetchNextPageForQuickReview();
    if (!loaded) {
      showToast('已審核完所有待審核記錄', 'success');
      setShowQuickReview(false);
      setQuickReviewIndex(-1);
    }
  }, [registrations, quickReviewIndex, fetchNextPageForQuickReview, showToast, setSelectedRegistration]);

  useEffect(() => {
    if (showQuickReview && quickReviewIndex >= 0 && registrations.length > 0) {
      const pendingRegistrations = registrations.filter(reg => reg.status === 'pending');
      if (pendingRegistrations.length > 0) {
        const validIndex = Math.min(quickReviewIndex, pendingRegistrations.length - 1);
        if (validIndex >= 0 && pendingRegistrations[validIndex]) {
          if (!selectedRegistration || selectedRegistration.id !== pendingRegistrations[validIndex].id) {
            setSelectedRegistration(pendingRegistrations[validIndex]);
          }
          if (validIndex !== quickReviewIndex) {
            setQuickReviewIndex(validIndex);
          }
        } else if (pendingRegistrations.length > 0) {
          setSelectedRegistration(pendingRegistrations[0]);
          setQuickReviewIndex(0);
        } else {
          setShowQuickReview(false);
          setQuickReviewIndex(-1);
        }
      } else {
        setShowQuickReview(false);
        setQuickReviewIndex(-1);
      }
    }
  }, [registrations, showQuickReview, quickReviewIndex, selectedRegistration, setSelectedRegistration]);

  const handleQuickReviewApprove = useCallback(async () => {
    if (!selectedRegistration) return;
    await performStatusUpdate('approved', null, null, selectedRegistration.id);
    await loadRegistrations();
  }, [selectedRegistration, performStatusUpdate, loadRegistrations]);

  const handleQuickReviewReject = useCallback(async (reasons, other) => {
    if (!selectedRegistration) return;
    await performStatusUpdate('revision', reasons, other, selectedRegistration.id);
    await loadRegistrations();
  }, [selectedRegistration, performStatusUpdate, loadRegistrations]);

  return {
    showQuickReview,
    setShowQuickReview,
    quickReviewIndex,
    setQuickReviewIndex,
    handleOpenQuickReview,
    fetchNextPageForQuickReview,
    handleQuickReviewNext,
    handleQuickReviewApprove,
    handleQuickReviewReject
  };
}

