/**
 * 活動明細頁：組合 useEventMeta / useEventReservations / useEventViolations（lazy by tab）
 */
import { useMemo, useCallback, useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { showErrorMessage, showSuccessMessage } from '../utils/errorHandler';
import useConfirm from '../components/ui/useConfirm';
import { useEventMeta } from './useEventMeta';
import { useEventReservations } from './useEventReservations';
import { useEventViolations } from './useEventViolations';
import { debugEventDetail } from '../utils/eventDetailDebug';
import { buildAccessProfile, canAccessEventType, hasPermission } from '../utils/accessControl';
import { P } from '../constants/permissions';

export default function useAdminEventWorkspace({ token, userRole, accessProfile: ctxProfile, eventId, activeTab = 'reservations' }) {
  const { confirm } = useConfirm();
  const accessProfile = ctxProfile || buildAccessProfile(token || '', userRole || '');

  const [checkinLoading, setCheckinLoading] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState(null);

  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationData, setViolationData] = useState({
    studentId: '',
    violationType: '擾亂秩序',
    description: '',
  });

  const [batchMarkNoShowLoading, setBatchMarkNoShowLoading] = useState(false);
  const [autoCheckLoading, setAutoCheckLoading] = useState(false);

  const [reservationSearchTerm, setReservationSearchTerm] = useState('');
  const [reservationSortField, setReservationSortField] = useState('studentId');
  const [reservationSortOrder, setReservationSortOrder] = useState('asc');

  const meta = useEventMeta({ token, eventId });

  const canViewReservations = hasPermission(accessProfile, P.CAN_VIEW_RESERVATIONS);
  const canExportReservations = hasPermission(accessProfile, P.CAN_EXPORT_RESERVATIONS);
  const canCheckinStudents = hasPermission(accessProfile, P.CAN_CHECKIN_STUDENTS);
  const canManageViolations = hasPermission(accessProfile, P.CAN_MANAGE_VIOLATIONS);
  const canViewBlacklist = hasPermission(accessProfile, P.CAN_VIEW_BLACKLIST);
  const canManageBlacklist = hasPermission(accessProfile, P.CAN_MANAGE_BLACKLIST);
  const canManageEvents = hasPermission(accessProfile, P.CAN_MANAGE_EVENTS);

  const needReservations = canViewReservations && ['reservations', 'checkin', 'violations'].includes(activeTab);
  const needViolations = (canManageViolations || canViewBlacklist) && activeTab === 'violations';

  const resv = useEventReservations({
    token,
    eventId: meta.eventId,
    enabled: Boolean(meta.ready && needReservations),
  });

  const vio = useEventViolations({
    token,
    eventId: meta.eventId,
    enabled: Boolean(meta.ready && needViolations),
  });

  useEffect(() => {
    debugEventDetail('tab:active', {
      activeTab,
      meta: { loading: meta.loading, ready: meta.ready, error: meta.error || null },
      reservations: { loading: resv.loading, loaded: resv.loaded, error: resv.error || null },
      violations: { loading: vio.loading, loaded: vio.loaded, error: vio.error || null },
    });
  }, [activeTab, meta.loading, meta.ready, meta.error, resv.loading, resv.loaded, resv.error, vio.loading, vio.loaded, vio.error]);

  const actualUserRole = userRole || 'worker';
  const hasAdminRights = Boolean(accessProfile.hasAdminRights);
  const isAdmin = Boolean(accessProfile.isAdmin);
  const canImportExcel = canCheckinStudents && canManageEvents;

  const currentEventId = meta.eventId;
  const currentEventName = resv.loaded && resv.eventName ? resv.eventName : meta.name;
  const currentEventDate = resv.loaded && resv.eventDate ? resv.eventDate : meta.date;
  const currentEventStartTime = resv.loaded && resv.eventStartTime ? resv.eventStartTime : meta.startTime;
  const currentEventType = resv.loaded && resv.eventType ? resv.eventType : meta.eventType;
  const canAccessCurrentEvent = canAccessEventType(accessProfile, currentEventType);
  const currentEventAutoCheckCompleted = resv.loaded ? resv.autoCheckCompleted : meta.autoCheckCompleted;

  const reservationData = resv.reservations;

  const eventMeta = useMemo(
    () => ({
      endTime: meta.endTime || '',
      location: meta.location || '',
      maxCapacity: meta.maxCapacity,
    }),
    [meta.endTime, meta.location, meta.maxCapacity]
  );

  const isEventToday = useCallback((dateStr) => {
    if (!dateStr) return false;
    return dayjs().format('YYYY-MM-DD') === dateStr;
  }, []);

  const refreshCurrentEventReservations = useCallback(async () => {
    await resv.refresh();
  }, [resv]);

  const handleCheckin = async (reservationId) => {
    if (!currentEventId) return;
    if (!canCheckinStudents || !canAccessCurrentEvent) {
      showErrorMessage('您沒有簽到權限');
      return;
    }
    if (!isEventToday(currentEventDate) && !canManageEvents) {
      showErrorMessage('只能對當天的活動進行簽到');
      return;
    }
    if (!isEventToday(currentEventDate) && canManageEvents) {
      const ok = await confirm({
        title: '確認補簽到？',
        description: `此活動日期為 ${currentEventDate}，確定要進行補簽到嗎？`,
        confirmText: '確認補簽到',
        cancelText: '取消',
        variant: 'warning',
      });
      if (!ok) return;
    }

    setCheckinLoading((prev) => ({ ...prev, [reservationId]: true }));
    try {
      const response = await fetch(`/api/events/${currentEventId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reservationId }),
      });
      const data = await response.json();
      if (response.ok) {
        showSuccessMessage('簽到成功');
        resv.setPayload((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            reservations: (prev.reservations || []).map((r) =>
              r.id === reservationId ? { ...r, checkinStatus: '已簽到', checkinTime: data.checkinTime } : r
            ),
          };
        });
      } else {
        showErrorMessage(data.error || '簽到失敗');
      }
    } catch (error) {
      console.error('簽到錯誤:', error);
      showErrorMessage('簽到失敗');
    } finally {
      setCheckinLoading((prev) => ({ ...prev, [reservationId]: false }));
    }
  };

  const canCancelReservation = () => {
    if (!currentEventDate || !currentEventStartTime) return false;
    const now = dayjs();
    const eventStart = dayjs(`${currentEventDate}T${currentEventStartTime}`);
    if (!eventStart.isValid()) return false;
    const twoHoursBefore = eventStart.subtract(2, 'hour');
    return now.isBefore(twoHoursBefore);
  };

  const handleDeleteReservation = async (reservationId, studentId, studentName) => {
    if (!canManageEvents || !canAccessCurrentEvent) {
      showErrorMessage('您沒有刪除預約權限');
      return;
    }
    const ok = await confirm({
      title: '確認刪除預約紀錄？',
      description: `確認要刪除學生 ${studentId} (${studentName}) 的預約紀錄嗎？此操作無法復原。`,
      confirmText: '刪除',
      cancelText: '取消',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const response = await fetch(`/api/admin/reservations/${reservationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        showSuccessMessage('已成功刪除預約紀錄');
        await resv.refresh();
        await meta.reload();
      } else {
        showErrorMessage(data.error || '刪除預約失敗');
      }
    } catch (error) {
      console.error('刪除預約錯誤:', error);
      showErrorMessage('刪除預約失敗：' + error.message);
    }
  };

  const handleImportFileChange = (event) => {
    const file = event?.target?.files?.[0] || null;
    setImportFile(file);
    setImportError('');
  };

  const handleImportExcel = async (event) => {
    if (!canImportExcel || !canAccessCurrentEvent) {
      setImportError('您沒有匯入簽到權限');
      return;
    }
    event.preventDefault();
    if (!currentEventId) {
      setImportError('目前沒有選定的活動');
      return;
    }
    if (!importFile) {
      setImportError('請選擇要匯入的 Excel 檔案');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);
    const formData = new FormData();
    formData.append('file', importFile);
    try {
      const response = await fetch(`/api/reservations/${currentEventId}/import-card-excel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || data.message || '匯入失敗，請稍後再試');
      }
      setImportResult(data);
      showSuccessMessage(data.message || '匯入完成');
      await resv.refresh();
      await meta.reload();
    } catch (error) {
      const message = error.message || '匯入失敗，請稍後再試';
      setImportError(message);
      showErrorMessage(message);
    } finally {
      setImportLoading(false);
    }
  };

  const openViolationModal = (studentId = '') => {
    setViolationData({
      studentId: studentId || '',
      violationType: '擾亂秩序',
      description: '',
    });
    setShowViolationModal(true);
  };

  const handleRecordEventViolation = async () => {
    if (!canManageViolations || !canAccessCurrentEvent) {
      showErrorMessage('您沒有違規處置權限');
      return;
    }
    if (!currentEventId) {
      showErrorMessage('目前沒有選定的活動');
      return;
    }
    if (!violationData.studentId.trim()) {
      showErrorMessage('請輸入學號');
      return;
    }
    try {
      const response = await fetch(`/api/events/${currentEventId}/violations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(violationData),
      });
      const data = await response.json();
      if (response.ok) {
        showSuccessMessage('違規記錄已建立！');
        setShowViolationModal(false);
        setViolationData({ studentId: '', violationType: '擾亂秩序', description: '' });
        await Promise.all([vio.refresh(), resv.refresh()]);
        await meta.reload();
        if (data.reservation) {
          resv.setPayload((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              reservations: (prev.reservations || []).map((r) =>
                r.id === data.reservation.id ? { ...r, checkinStatus: data.reservation.checkinStatus } : r
              ),
            };
          });
        }
      } else {
        showErrorMessage(data.error || '登記違規失敗');
      }
    } catch (error) {
      console.error('登記違規錯誤:', error);
      showErrorMessage('登記違規失敗');
    }
  };

  const handleBatchMarkNoShow = async () => {
    if (!currentEventId) return;
    if (!canManageViolations || !canAccessCurrentEvent) {
      showErrorMessage('您沒有違規處置權限');
      return;
    }
    const noShowCount = reservationData.filter((r) => r.checkinStatus === '未簽到').length;
    if (noShowCount === 0) {
      showErrorMessage('目前沒有未簽到的學生');
      return;
    }
    const ok = await confirm({
      title: '確認批次登記預約未到？',
      description: `確定要將 ${noShowCount} 位未簽到的學生登記為「預約未到」嗎？`,
      confirmText: '確認登記',
      cancelText: '取消',
      variant: 'warning',
    });
    if (!ok) return;
    setBatchMarkNoShowLoading(true);
    try {
      const response = await fetch(`/api/events/${currentEventId}/violations/batch-mark-no-show`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        showSuccessMessage(data.message || `成功登記 ${data.successCount} 位學生為預約未到`);
        await Promise.all([vio.refresh(), resv.refresh()]);
        await meta.reload();
      } else {
        showErrorMessage(data.error || '批次登記失敗');
      }
    } catch (error) {
      console.error('批次登記未簽到學生錯誤:', error);
      showErrorMessage('批次登記失敗');
    } finally {
      setBatchMarkNoShowLoading(false);
    }
  };

  const handleAutoCheck = async () => {
    if (!currentEventId) return;
    if (!canManageBlacklist || !canAccessCurrentEvent) {
      showErrorMessage('您沒有執行活動結束檢查權限');
      return;
    }
    const ok = await confirm({
      title: '確認執行活動結束檢查？',
      description: '活動結束檢查會將活動期間違規與未簽到學生同步到黑名單。',
      confirmText: '執行',
      cancelText: '取消',
      variant: 'warning',
    });
    if (!ok) return;
    setAutoCheckLoading(true);
    try {
      const response = await fetch(`/api/events/${currentEventId}/auto-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        const stats = data.results || {};
        const summaryMessage =
          data.message ||
          `處理完成：總筆數 ${stats.processedCount || 0}，違規記錄 ${stats.violationRecords || 0}，預約未到 ${stats.noShowRecords || 0}`;
        showSuccessMessage(summaryMessage);
        await Promise.all([vio.refresh(), resv.refresh()]);
        await meta.reload();
      } else {
        if (data.alreadyCompleted) {
          resv.setPayload((prev) => (prev ? { ...prev, autoCheckCompleted: true } : prev));
          await meta.reload();
        }
        showErrorMessage(data.error || '活動結束檢查失敗');
      }
    } catch (error) {
      console.error('活動結束檢查錯誤:', error);
      showErrorMessage('活動結束檢查失敗');
    } finally {
      setAutoCheckLoading(false);
    }
  };

  const handleExport = async () => {
    if (!currentEventId) return;
    if (!canExportReservations || !canAccessCurrentEvent) {
      showErrorMessage('您沒有匯出權限');
      return;
    }
    try {
      const response = await fetch(`/api/events/${currentEventId}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('匯出失敗');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `活動預約清單_${currentEventId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      showErrorMessage('匯出失敗：' + error.message);
    }
  };

  const handleReservationSort = (field) => {
    if (reservationSortField === field) {
      setReservationSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setReservationSortField(field);
      setReservationSortOrder('asc');
    }
  };

  const sortedReservationData = useMemo(() => {
    return [...reservationData].sort((a, b) => {
      let aVal;
      let bVal;
      if (reservationSortField === 'studentId') {
        aVal = a.studentId;
        bVal = b.studentId;
      } else if (reservationSortField === 'name') {
        aVal = a.studentName || a.name;
        bVal = b.studentName || b.name;
      } else {
        aVal = a[reservationSortField];
        bVal = b[reservationSortField];
      }
      if (reservationSortField === 'checkinStatus') {
        const statusOrder = { 已簽到: 1, 未簽到: 2, 已登記違規: 3 };
        aVal = statusOrder[aVal] || 4;
        bVal = statusOrder[bVal] || 4;
      }
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (reservationSortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [reservationData, reservationSortField, reservationSortOrder]);

  const filteredReservationData = useMemo(() => {
    return sortedReservationData.filter((reservation) => {
      if (!reservationSearchTerm) return true;
      const searchTerm = reservationSearchTerm.toLowerCase();
      const studentId = reservation.studentId;
      const studentName = reservation.studentName || reservation.name;
      return (
        studentId?.toLowerCase().includes(searchTerm) || studentName?.toLowerCase().includes(searchTerm)
      );
    });
  }, [sortedReservationData, reservationSearchTerm]);

  const pendingCheckinRows = useMemo(
    () => filteredReservationData.filter((r) => r.checkinStatus === '未簽到'),
    [filteredReservationData]
  );

  const noShowReservationCount = useMemo(() => {
    if (resv.loaded) return reservationData.filter((r) => r.checkinStatus === '未簽到').length;
    if (meta.uncheckedCount != null) return meta.uncheckedCount;
    return 0;
  }, [resv.loaded, reservationData, meta.uncheckedCount]);

  const checkedInCount = useMemo(() => {
    if (resv.loaded) return reservationData.filter((r) => r.checkinStatus === '已簽到').length;
    if (meta.checkedInCount != null) return meta.checkedInCount;
    return 0;
  }, [resv.loaded, reservationData, meta.checkedInCount]);

  const violationRegisteredCount = useMemo(() => {
    if (resv.loaded) return reservationData.filter((r) => r.checkinStatus === '已登記違規').length;
    if (meta.violationRegisteredCount != null) return meta.violationRegisteredCount;
    return 0;
  }, [resv.loaded, reservationData, meta.violationRegisteredCount]);

  const enrolledCount = useMemo(() => {
    if (resv.loaded) return reservationData.length;
    if (meta.reservedCount != null) return meta.reservedCount;
    return 0;
  }, [resv.loaded, reservationData.length, meta.reservedCount]);

  const eventEnded = useMemo(() => {
    if (!currentEventDate) return false;
    if (eventMeta.endTime) {
      const end = dayjs(`${currentEventDate}T${eventMeta.endTime}`);
      return end.isValid() && dayjs().isAfter(end);
    }
    const d = dayjs(currentEventDate).endOf('day');
    return dayjs().isAfter(d);
  }, [currentEventDate, eventMeta.endTime]);

  const checkinOpenHint = useMemo(() => {
    if (!currentEventDate) return false;
    return isEventToday(currentEventDate);
  }, [currentEventDate, isEventToday]);

  const reload = useCallback(async () => {
    debugEventDetail('workspace:reload:start', { activeTab });
    await meta.reload();
    resv.invalidateCache();
    vio.invalidateCache();
    if (['reservations', 'checkin', 'violations'].includes(activeTab)) {
      await resv.load(true);
    }
    if (activeTab === 'violations') {
      await vio.load(true);
    }
    debugEventDetail('workspace:reload:done', { activeTab });
  }, [activeTab, meta, resv, vio]);

  const eventViolations = vio.list;

  return {
    detailLoading: meta.loading,
    detailError: meta.error,
    reload,

    reservationsLoading: resv.loading,
    reservationsLoaded: resv.loaded,
    reservationsError: resv.error,

    violationsLoading: vio.loading,
    violationsLoaded: vio.loaded,
    violationsError: vio.error,

    currentEventName,
    currentEventDate,
    currentEventStartTime,
    currentEventId,
    currentEventType,
    currentEventAutoCheckCompleted,
    reservationSearchTerm,
    setReservationSearchTerm,
    reservationSortField,
    reservationSortOrder,
    handleReservationSort,
    filteredReservationData,
    pendingCheckinRows,
    noShowReservationCount,
    checkedInCount,
    violationRegisteredCount,
    enrolledCount,
    /** 預約名單列層級資料是否已載入（與頁首 aggregate 可並存） */
    countsReady: resv.loaded,
    /** meta 已回傳 aggregate，頁首可顯示數字 */
    headerCountsReady: meta.ready,
    metaReservedCount: meta.reservedCount,
    eventMeta,
    eventEnded,
    checkinOpenHint,
    checkinLoading,
    handleCheckin,
    handleDeleteReservation,
    canCancelReservation,
    isEventToday,
    hasAdminRights,
    isAdmin,
    canViewReservations,
    canExportReservations,
    canCheckinStudents,
    canManageViolations,
    canViewBlacklist,
    canManageBlacklist,
    canManageEvents,
    canAccessCurrentEvent,
    canImportExcel,
    importFile,
    importLoading,
    importError,
    importResult,
    handleImportFileChange,
    handleImportExcel,
    handleExport,
    showViolationModal,
    setShowViolationModal,
    violationData,
    setViolationData,
    eventViolations,
    openViolationModal,
    handleRecordEventViolation,
    batchMarkNoShowLoading,
    handleBatchMarkNoShow,
    autoCheckLoading,
    handleAutoCheck,
  };
}
