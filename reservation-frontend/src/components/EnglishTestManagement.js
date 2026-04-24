// components/EnglishTestManagement.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext, useLocation, useNavigate } from 'react-router-dom';
import { useEnhancedFeatures } from '../hooks/useEnhancedFeatures';
import AdvancedFilterPanel from './english-test/AdvancedFilterPanel';
import EnhancedTable from './english-test/EnhancedTable';
import BulkActionToolbar from './english-test/BulkActionToolbar';
import DetailModalWithTabs from './english-test/DetailModalWithTabs';
import StatsVisualization from './english-test/StatsVisualization';
import QuickReviewMode from './english-test/QuickReviewMode';
import ToastMessage from './english-test/ToastMessage';
import ConfirmModal from './english-test/ConfirmModal';
import AnalyticsSection from './english-test/AnalyticsSection';
import LearningPartnerManagement from './LearningPartnerManagement';
import ExemptionReviewSection from './english-test/ExemptionReviewSection';
import { getCurrentSemester } from '../utils/semesterUtils';
import { buildAccessProfile, hasPermission } from '../utils/accessControl';
import { P } from '../constants/permissions';

export default function EnglishTestManagement() {
  const { token, userRole, accessProfile: ctxProfile } = useOutletContext();
  const accessProfile = ctxProfile || buildAccessProfile(token || '', userRole || '');
  const canViewEnglishTests = hasPermission(accessProfile, P.CAN_VIEW_ENGLISH_TESTS);
  const canViewEnglishMetrics = hasPermission(accessProfile, P.CAN_VIEW_ENGLISH_TEST_METRICS);
  const canReviewEnglishTests = hasPermission(accessProfile, P.CAN_REVIEW_ENGLISH_TEST_REGISTRATIONS);
  const canExportEnglishTestData = hasPermission(accessProfile, P.CAN_EXPORT_ENGLISH_TEST_DATA);
  const canManageEnglishTests = hasPermission(accessProfile, P.CAN_MANAGE_ENGLISH_TESTS);
  const canManageSettings = hasPermission(accessProfile, P.CAN_MANAGE_SETTINGS);
  const { flags, loading: flagsLoading } = useEnhancedFeatures(token);
  const location = useLocation();
  const navigate = useNavigate();
  
  // 現有狀態（保持不變，向下相容）
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all'); // 預設無篩選，顯示完整名單
  const [mainTab, setMainTab] = useState('individual'); // 'individual' | 'group' | 'analytics' | 'exemption'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [rejectionOther, setRejectionOther] = useState('');
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [exportStatusFilter, setExportStatusFilter] = useState('all');
  const [currentRegistrationIndex, setCurrentRegistrationIndex] = useState(-1);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    revision: 0,
    success: 0,
    failed: 0,
    nonExam: 0,
    listeningReading: 0,
    speakingWriting: 0
  });
  const [registrationEnabled, setRegistrationEnabled] = useState(true); // 個人報名
  const [registrationGroupEnabled, setRegistrationGroupEnabled] = useState(true); // 團體報名
  const [isUpdatingSetting, setIsUpdatingSetting] = useState(false);

  // 新版狀態（僅在 Feature Flag 啟用時使用）
  const [advancedFilters, setAdvancedFilters] = useState({
    dateFrom: '',
    dateTo: '',
    examTypes: [],
    isLowIncome: '',
    hasDisabilityCard: '',
    semester: getCurrentSemester() || '' // 學期篩選，預設為當前學期
  });
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState(() => {
    // 從 localStorage 讀取上次的排序設定，如果沒有則使用預設值
    const saved = localStorage.getItem('englishTestSortConfig');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { key: 'id', direction: 'ASC' };
      }
    }
    return { key: 'id', direction: 'ASC' };
  });
  const [todayNewCount, setTodayNewCount] = useState(0);
  const [showQuickReview, setShowQuickReview] = useState(false);
  const [quickReviewIndex, setQuickReviewIndex] = useState(-1);
  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });
  const [confirmModal, setConfirmModal] = useState({ show: false, config: null });
  const [adjustingSequence, setAdjustingSequence] = useState(false);
  const tableContainerRef = useRef(null);
  const scrollPositionRef = useRef(0);

  const limit = 100;

  const showToast = (message, variant = 'success') => {
    setToast({ show: true, message, variant });
  };

  const handleGoToClassBestep = useCallback(async (registrationId) => {
    try {
      const res = await fetch(`/api/english-test/registrations/${registrationId}/class-bestep-link`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '查詢失敗');
      if (!data.classId) {
        alert('此學期查無班級名冊對應，無法前往班級 BESTEP');
        return;
      }
      navigate(`/admin/classes/${data.classId}/bestep?semester=${encodeURIComponent(data.semester || '')}`);
    } catch (e) {
      alert(e.message || '無法前往');
    }
  }, [token, navigate]);

  // 載入報名列表（擴展版本，向下相容）
  const loadRegistrations = useCallback(async () => {
    if (mainTab !== 'individual') {
      setLoading(false);
      return;
    }
    if (!canViewEnglishTests) {
      setRegistrations([]);
      setTotalPages(1);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        
        // 舊版參數（保持相容）
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        
        // 進階篩選（個人報名審核中頁面常駐啟用）
        ...(mainTab === 'individual' && advancedFilters.dateFrom && { 
          dateFrom: advancedFilters.dateFrom 
        }),
        ...(mainTab === 'individual' && advancedFilters.dateTo && {
          dateTo: advancedFilters.dateTo 
        }),
        ...(mainTab === 'individual' && advancedFilters.examTypes?.length > 0 && {
          examTypes: advancedFilters.examTypes
        }),
        ...(mainTab === 'individual' && advancedFilters.isLowIncome && {
          isLowIncome: advancedFilters.isLowIncome
        }),
        ...(mainTab === 'individual' && advancedFilters.hasDisabilityCard && {
          hasDisabilityCard: advancedFilters.hasDisabilityCard
        }),
        ...(mainTab === 'individual' && advancedFilters.semester && {
          semester: advancedFilters.semester
        }),
        ...(mainTab === 'individual' && sortConfig.key && {
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        })
      });

      const response = await fetch(`/api/english-test/registrations?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        
        // 更新統計資訊
        if (data.stats) {
          setStats(data.stats);
        }
        
        // 計算今日新增數量（簡單實作）
        if (mainTab === 'individual' && data.data) {
          const today = new Date().toISOString().split('T')[0];
          const todayCount = data.data.filter(reg => {
            const regDate = new Date(reg.createdAt).toISOString().split('T')[0];
            return regDate === today;
          }).length;
          setTodayNewCount(todayCount);
        }
      } else {
        // 嘗試解析錯誤訊息
        let errorMessage = '載入報名列表失敗';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // 如果無法解析 JSON，使用狀態碼
          errorMessage = `載入報名列表失敗 (HTTP ${response.status})`;
        }
        console.error('載入報名列表失敗:', {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage
        });
        alert(errorMessage);
      }
    } catch (error) {
      console.error('載入報名列表錯誤:', error);
      alert(`載入報名列表時發生錯誤: ${error.message || '未知錯誤'}`);
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, advancedFilters, sortConfig, mainTab, token, canViewEnglishTests]);

  // 載入報名按鈕開關狀態（個人、團體分開）
  const loadRegistrationSetting = async () => {
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
  };

  // 更新個人報名開關
  const handleToggleRegistration = async (enabled) => {
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
        showToast('個人報名開關已更新', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '更新設定失敗', 'danger');
      }
    } catch (error) {
      console.error('更新報名開關設定錯誤:', error);
      showToast('更新設定時發生錯誤', 'danger');
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  // 更新團體報名開關
  const handleToggleRegistrationGroup = async (enabled) => {
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
        showToast('團體報名開關已更新', 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '更新設定失敗', 'danger');
      }
    } catch (error) {
      console.error('更新團體報名開關設定錯誤:', error);
      showToast('更新設定時發生錯誤', 'danger');
    } finally {
      setIsUpdatingSetting(false);
    }
  };

  useEffect(() => {
    loadRegistrations();
    loadRegistrationSetting();
  }, [loadRegistrations, token]);

  // 處理 URL 中的 id 參數，自動開啟詳細資料 Modal
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const idFromUrl = urlParams.get('id');
    
    // 如果有 id 參數且尚未開啟詳細 Modal，則載入並開啟該筆資料（僅個人報名分頁）
    if (idFromUrl && mainTab === 'individual' && !showDetailModal && !loading && token) {
      const registrationId = parseInt(idFromUrl, 10);
      
      // 驗證 id 是否為有效數字
      if (!isNaN(registrationId) && registrationId > 0) {
        // 先檢查當前列表是否包含該筆資料
        const foundInList = registrations.find(reg => reg.id === registrationId);
        
        if (foundInList) {
          // 如果資料已在列表中，直接開啟
          const foundIndex = registrations.findIndex(reg => reg.id === registrationId);
          handleViewDetail(registrationId, foundIndex);
        } else {
          // 如果資料不在當前列表中，先載入該筆資料
          handleViewDetail(registrationId);
        }
        
        // 清除 URL 中的 id 參數（避免重新整理時重複開啟）
        urlParams.delete('id');
        const newSearch = urlParams.toString();
        const newUrl = newSearch 
          ? `${location.pathname}?${newSearch}` 
          : location.pathname;
        navigate(newUrl, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, showDetailModal, loading, token, registrations.length, mainTab]);

  // Esc 鍵關閉最上層 Modal（無障礙）
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmModal.show) {
        setConfirmModal({ show: false, config: null });
        return;
      }
      if (showRejectionModal) {
        setShowRejectionModal(false);
        setPendingStatusUpdate(null);
        return;
      }
      if (showStatusModal) {
        setShowStatusModal(false);
        return;
      }
      if (showDetailModal) {
        setShowDetailModal(false);
        setCurrentRegistrationIndex(-1);
        requestAnimationFrame(() => {
          if (tableContainerRef.current && scrollPositionRef.current !== undefined) {
            tableContainerRef.current.scrollTop = scrollPositionRef.current;
          }
        });
        return;
      }
      if (showQuickReview) {
        setShowQuickReview(false);
        setQuickReviewIndex(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [confirmModal.show, showRejectionModal, showStatusModal, showDetailModal, showQuickReview]);

  // 查看詳細資料（儲存捲動位置以便關閉後還原）
  const handleViewDetail = async (id, index = null) => {
    if (tableContainerRef.current) {
      scrollPositionRef.current = tableContainerRef.current.scrollTop ?? 0;
    }
    try {
      const response = await fetch(`/api/english-test/registrations/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedRegistration(data);
        // 如果提供了索引，使用提供的索引；否則從列表中查找
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
  };

  // 依當前篩選載入指定頁並開啟該頁中某筆（跨頁上一筆/下一筆用）
  const buildListParams = useCallback((pageOverride = null) => {
    const p = new URLSearchParams();
    const page = pageOverride !== null ? pageOverride : currentPage;
    p.set('page', String(page));
    p.set('limit', String(limit));
    if (statusFilter && statusFilter !== 'all') p.set('status', statusFilter);
    if (searchTerm) p.set('search', searchTerm);
    if (mainTab === 'individual' && advancedFilters.dateFrom) p.set('dateFrom', advancedFilters.dateFrom);
    if (mainTab === 'individual' && advancedFilters.dateTo) p.set('dateTo', advancedFilters.dateTo);
    (advancedFilters.examTypes || []).forEach(t => p.append('examTypes', t));
    if (mainTab === 'individual' && advancedFilters.semester) p.set('semester', advancedFilters.semester);
    if (mainTab === 'individual' && advancedFilters.isLowIncome) p.set('isLowIncome', advancedFilters.isLowIncome);
    if (mainTab === 'individual' && advancedFilters.hasDisabilityCard) p.set('hasDisabilityCard', advancedFilters.hasDisabilityCard);
    if (mainTab === 'individual' && sortConfig.key) {
      p.set('sortBy', sortConfig.key);
      p.set('sortOrder', sortConfig.direction);
    }
    return p;
  }, [currentPage, limit, statusFilter, searchTerm, mainTab, advancedFilters, sortConfig]);

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
      showToast('載入上一筆/下一筆時發生錯誤', 'danger');
    } finally {
      setLoading(false);
    }
  }, [buildListParams, token, showToast]);

  // 當前篩選下的上一筆（跨頁）
  const handleNavigatePrevious = () => {
    if (currentRegistrationIndex > 0) {
      const prev = registrations[currentRegistrationIndex - 1];
      handleViewDetail(prev.id, currentRegistrationIndex - 1);
      return;
    }
    if (currentPage > 1) {
      fetchPageAndOpenAt(currentPage - 1, undefined);
    }
  };

  // 當前篩選下的下一筆（跨頁）
  const handleNavigateNext = () => {
    if (currentRegistrationIndex < registrations.length - 1) {
      const next = registrations[currentRegistrationIndex + 1];
      handleViewDetail(next.id, currentRegistrationIndex + 1);
      return;
    }
    if (currentPage < totalPages) {
      fetchPageAndOpenAt(currentPage + 1, 0);
    }
  };

  const canNavigatePrevious = total > 0 && (currentPage > 1 || currentRegistrationIndex > 0);
  const canNavigateNext = total > 0 && (currentPage < totalPages || currentRegistrationIndex < registrations.length - 1);

  // 拒絕原因選項
  const rejectionReasonOptions = [
    { id: '1', text: '照片五官不夠清晰' },
    { id: '2', text: '照片上有鋼印、浮水印或反光遮住五官' },
    { id: '3', text: '照片背景非白色或淺色' },
    { id: '4', text: '臉部未正視鏡頭，不是證件照表情、或使用生活照' },
    { id: '5', text: '髮型遮住耳朵、瀏海蓋住眉毛、或頭髮碰到照片邊框' },
    { id: '6', text: '照片背景非白色、照片太暗或逆光' },
    { id: '7', text: '有閃光反射在眼睛上、配戴深色鏡片、鏡框遮蓋眼睛' },
    { id: '8', text: '非本人照片' },
    { id: '9', text: '檔案格式不是jpg檔或png檔' },
    { id: '10', text: '檔案小於100KB或大於5MB' },
    { id: '11', text: '基本聯絡資訊資料有誤' },
    { id: '12', text: '身分與學籍資料有誤' },
    { id: '13', text: '特殊身分與協助需求資料有誤' },
    { id: '14', text: '照片與同意事項資料有誤' },
    { id: '15', text: '資訊來源資料有誤' },
    { id: '16', text: '英語能力與培力資格相關資料有誤' },
    { id: '其他', text: '其他(須說明原因)' }
  ];

  // 快速更新狀態（不需要打開狀態更新 modal）
  const handleQuickStatusUpdate = async (id, newStatus) => {
    // 如果提供了 ID，使用該 ID；否則使用 selectedRegistration
    const targetId = id || selectedRegistration?.id;
    if (!targetId) return;

    // 如果切換到「請修正」或「報名失敗」，必須先選擇原因
    if (newStatus === 'revision' || newStatus === 'failed') {
      if (id && !selectedRegistration) {
        const response = await fetch(`/api/english-test/registrations/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSelectedRegistration(data);
        }
      }
      setPendingStatusUpdate(newStatus);
      setRejectionReasons([]);
      setRejectionOther('');
      setShowRejectionModal(true);
      return;
    }

    // 其他狀態直接更新
    await performStatusUpdate(newStatus, null, null, targetId);
  };

  // 執行狀態更新
  const performStatusUpdate = async (newStatus, reasons, other, targetId = null) => {
    const id = targetId || selectedRegistration?.id;
    if (!id) return;

    try {
      const requestBody = {
        status: newStatus,
        notes: selectedRegistration?.notes || ''
      };

      // 請修正或報名失敗時，添加原因
      if (newStatus === 'revision' || newStatus === 'failed') {
        requestBody.rejectionReasons = reasons || [];
        requestBody.rejectionOther = other || '';
      }

      const response = await fetch(`/api/english-test/registrations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        const statusText = { pending: '審核中', approved: '已通過', revision: '請修正', success: '報名成功', failed: '報名失敗' }[newStatus] || newStatus;
        showToast(`狀態已更新為「${statusText}」`, 'success');
        // 更新當前查看的資料
        if (selectedRegistration && selectedRegistration.id === id) {
          const result = await response.json();
          const updatedData = result.registration || result;
          setSelectedRegistration(updatedData);
        }
        // 更新列表中的資料
        setRegistrations(prev => 
          prev.map(reg => reg.id === id ? { ...reg, status: newStatus } : reg)
        );
        // 重新載入列表以更新統計
        loadRegistrations();
        // 關閉拒絕原因 modal
        setShowRejectionModal(false);
        setPendingStatusUpdate(null);
        // 清除選中狀態（如果更新的是選中的項目）
        setSelectedRows(prev => prev.filter(rowId => rowId !== id));
      } else {
        const errorData = await response.json();
        alert(errorData.error || '狀態更新失敗');
      }
    } catch (error) {
      console.error('更新狀態錯誤:', error);
      alert('更新狀態時發生錯誤');
    }
  };

  // 確認原因並更新狀態（用於請修正或報名失敗）
  const handleConfirmRejection = () => {
    if (rejectionReasons.length === 0) {
      alert(pendingStatusUpdate === 'failed' ? '請至少選擇一個報名失敗原因' : '請至少選擇一個拒絕原因');
      return;
    }
    if (rejectionReasons.includes('其他') && (!rejectionOther || rejectionOther.trim() === '')) {
      alert('選擇「其他」時，必須填寫說明');
      return;
    }
    const statusToApply = pendingStatusUpdate === 'failed' ? 'failed' : 'revision';
    performStatusUpdate(statusToApply, rejectionReasons, rejectionOther);
  };

  // 後台修改報名資料（特別標記功能）
  const handleUpdateRegistration = async (registrationId, updateData, authToken) => {
    try {
      // 過濾掉 undefined 和 null 值（但保留空字串和 0，因為它們可能是有效值）
      const cleanedUpdateData = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          cleanedUpdateData[key] = updateData[key];
        }
      });

      // 如果沒有任何欄位需要更新，直接返回當前的註冊記錄
      if (Object.keys(cleanedUpdateData).length === 0) {
        showToast('沒有需要更新的資料', 'info');
        // 從 registrations 陣列中找到對應的記錄，或使用 selectedRegistration
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
      
      // 更新當前查看的資料
      if (selectedRegistration && selectedRegistration.id === registrationId) {
        setSelectedRegistration(updatedRegistration);
      }
      
      // 更新列表中的資料
      setRegistrations(prev => 
        prev.map(reg => reg.id === registrationId ? updatedRegistration : reg)
      );
      
      // 重新載入列表以確保資料同步
      await loadRegistrations();
      
      showToast('報名資料已更新', 'success');
      return updatedRegistration;
    } catch (error) {
      console.error('更新報名資料錯誤:', error);
      showToast(error.message || '更新失敗，請稍後再試', 'danger');
      throw error;
    }
  };

  // 管理員上傳/更換證件照、成績證明、身心障礙證明
  const handleUploadRegistrationFiles = async (registrationId, formData, authToken) => {
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
  };

  // 處理拒絕原因選擇
  const handleRejectionReasonChange = (reasonId) => {
    setRejectionReasons(prev => {
      if (prev.includes(reasonId)) {
        // 取消選擇
        return prev.filter(id => id !== reasonId);
      } else {
        // 選擇
        return [...prev, reasonId];
      }
    });
  };

  // 更新狀態
  const handleUpdateStatus = async () => {
    if (!selectedRegistration) return;

    // 如果狀態為請修正或報名失敗，必須先選擇原因
    if (statusUpdate.status === 'revision' || statusUpdate.status === 'failed') {
      setPendingStatusUpdate(statusUpdate.status);
      setRejectionReasons([]);
      setRejectionOther('');
      setShowStatusModal(false);
      setShowRejectionModal(true);
      return;
    }

    // 其他狀態直接更新
    try {
      const response = await fetch(`/api/english-test/registrations/${selectedRegistration.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(statusUpdate)
      });

      if (response.ok) {
        alert('狀態更新成功');
        setShowStatusModal(false);
        setStatusUpdate({ status: '', notes: '' });
        loadRegistrations();
        if (showDetailModal) {
          handleViewDetail(selectedRegistration.id);
        }
      } else {
        alert('狀態更新失敗');
      }
    } catch (error) {
      console.error('更新狀態錯誤:', error);
      alert('更新狀態時發生錯誤');
    }
  };

  // 刪除報名（使用自訂確認框）
  const handleDelete = async (id) => {
    setConfirmModal({
      show: true,
      config: {
        title: '確認刪除',
        message: '確定要刪除此報名資料嗎？此操作無法復原。',
        confirmLabel: '刪除',
        variant: 'danger',
        onConfirm: async () => {
          try {
            const response = await fetch(`/api/english-test/registrations/${id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              showToast('刪除成功', 'success');
              loadRegistrations();
            } else {
              showToast('刪除失敗', 'danger');
            }
          } catch (error) {
            console.error('刪除錯誤:', error);
            showToast('刪除時發生錯誤', 'danger');
          }
        }
      }
    });
  };

  // 匯出 Excel
  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (exportStatusFilter !== 'all') {
        params.append('status', exportStatusFilter);
      }

      // 根據狀態生成檔名
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
  };

  // 匯出已通過或報名成功證件照
  const handleExportPhotos = async (status = 'approved') => {
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
  };

  // 調整報名成功順序
  const handleAdjustSequence = async (id, action, targetSequence = null) => {
    if (adjustingSequence) return; // 防止重複點擊
    
    try {
      setAdjustingSequence(true);
      const body = { action };
      if (targetSequence !== null) {
        body.targetSequence = targetSequence;
      }

      const response = await fetch(`/api/english-test/registrations/${id}/adjust-sequence`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const data = await response.json();
        const actionText = action === 'up' ? '上移' : action === 'down' ? '下移' : '移動';
        showToast(`${actionText}成功，新序號：${data.newSequence}`, 'success');
        
        // 重新載入列表和當前記錄（確保按 successSequence 排序）
        if (statusFilter === 'success' && sortConfig.key !== 'successSequence') {
          setSortConfig({ key: 'successSequence', direction: 'ASC' });
        }
        await loadRegistrations();
        if (selectedRegistration && selectedRegistration.id === id) {
          const detailResponse = await fetch(`/api/english-test/registrations/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (detailResponse.ok) {
            const detail = await detailResponse.json();
            setSelectedRegistration(detail);
          }
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '調整順序失敗', 'danger');
      }
    } catch (error) {
      console.error('調整順序錯誤:', error);
      showToast('調整順序時發生錯誤', 'danger');
    } finally {
      setAdjustingSequence(false);
    }
  };

  // 批量操作處理
  const handleBulkApprove = async () => {
    if (selectedRows.length === 0) return;

    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedRows,
          status: 'approved'
        })
      });

      if (response.ok) {
        alert(`成功批量通過 ${selectedRows.length} 筆記錄`);
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '批量更新失敗');
      }
    } catch (error) {
      console.error('批量更新錯誤:', error);
      alert('批量更新時發生錯誤');
    }
  };

  const handleBulkReject = async (reasons, other, status = 'revision') => {
    if (selectedRows.length === 0) return;

    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedRows,
          status: status,
          rejectionReasons: reasons,
          rejectionOther: other
        })
      });

      if (response.ok) {
        alert(`成功批量${status === 'revision' ? '請修正' : '設為審核中'} ${selectedRows.length} 筆記錄`);
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        alert(errorData.error || '批量更新失敗');
      }
    } catch (error) {
      console.error('批量更新錯誤:', error);
      alert('批量更新時發生錯誤');
    }
  };

  const handleBulkSetSuccess = async () => {
    if (selectedRows.length === 0) return;
    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids: selectedRows, status: 'success' })
      });
      if (response.ok) {
        showToast(`已將 ${selectedRows.length} 筆設為「報名成功」`, 'success');
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '批量更新失敗', 'danger');
      }
    } catch (error) {
      console.error('批量設為報名成功錯誤:', error);
      showToast('批量更新時發生錯誤', 'danger');
    }
  };

  const handleBulkSetFailed = async (reasons, other) => {
    if (selectedRows.length === 0) return;
    try {
      const response = await fetch('/api/english-test/registrations/bulk-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ids: selectedRows,
          status: 'failed',
          rejectionReasons: reasons,
          rejectionOther: other
        })
      });
      if (response.ok) {
        showToast(`已將 ${selectedRows.length} 筆設為「報名失敗」`, 'success');
        setSelectedRows([]);
        loadRegistrations();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || '批量更新失敗', 'danger');
      }
    } catch (error) {
      console.error('批量設為報名失敗錯誤:', error);
      showToast('批量更新時發生錯誤', 'danger');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedRows.length === 0) return;

    try {
      // 逐一刪除（可優化為批量刪除 API）
      let successCount = 0;
      let failCount = 0;

      for (const id of selectedRows) {
        try {
          const response = await fetch(`/api/english-test/registrations/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        alert(`成功刪除 ${successCount} 筆記錄${failCount > 0 ? `，${failCount} 筆失敗` : ''}`);
        setSelectedRows([]);
        loadRegistrations();
      } else {
        alert('刪除失敗');
      }
    } catch (error) {
      console.error('批量刪除錯誤:', error);
      alert('批量刪除時發生錯誤');
    }
  };

  // 當狀態切換為「報名成功」時，自動設定排序為 successSequence ASC
  useEffect(() => {
    if (statusFilter === 'success' && sortConfig.key !== 'successSequence') {
      setSortConfig({ key: 'successSequence', direction: 'ASC' });
      localStorage.setItem('englishTestSortConfig', JSON.stringify({ key: 'successSequence', direction: 'ASC' }));
    }
  }, [statusFilter]);

  // 儲存排序設定到 localStorage
  useEffect(() => {
    localStorage.setItem('englishTestSortConfig', JSON.stringify(sortConfig));
  }, [sortConfig]);

  // 處理統計卡片點擊（自動套用篩選）
  const handleStatsCardClick = (filterType, filterValue) => {
    if (filterType === 'status') {
      setStatusFilter(filterValue);
      setCurrentPage(1);
      // 如果切換到「報名成功」，自動設定排序為 successSequence ASC
      if (filterValue === 'success') {
        setSortConfig({ key: 'successSequence', direction: 'ASC' });
      }
    } else if (filterType === 'examType') {
      setAdvancedFilters(prev => ({
        ...prev,
        examTypes: [filterValue]
      }));
      setCurrentPage(1);
    }
  };

  // 快速審核模式（支援跨頁：當前頁待審核用完時載入下一頁）
  const handleOpenQuickReview = () => {
    const pendingRegistrations = registrations.filter(reg => reg.status === 'pending');
    if (pendingRegistrations.length === 0) {
      showToast('目前沒有待審核的記錄', 'warning');
      return;
    }
    setQuickReviewIndex(0);
    setSelectedRegistration(pendingRegistrations[0]);
    setShowQuickReview(true);
  };

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
  }, [currentPage, totalPages, buildListParams, token]);

  const handleQuickReviewNext = async () => {
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
    // 當前頁沒有下一筆待審核，嘗試載入下一頁
    const loaded = await fetchNextPageForQuickReview();
    if (!loaded) {
      showToast('已審核完所有待審核記錄', 'success');
      setShowQuickReview(false);
      setQuickReviewIndex(-1);
    }
  };

  // 當快速審核模式開啟且資料更新時，自動更新當前顯示的記錄
  useEffect(() => {
    if (showQuickReview && quickReviewIndex >= 0 && registrations.length > 0) {
      const pendingRegistrations = registrations.filter(reg => reg.status === 'pending');
      if (pendingRegistrations.length > 0) {
        // 確保索引在有效範圍內
        const validIndex = Math.min(quickReviewIndex, pendingRegistrations.length - 1);
        if (validIndex >= 0 && pendingRegistrations[validIndex]) {
          // 只有當選中的記錄不同時才更新，避免無限循環
          if (!selectedRegistration || selectedRegistration.id !== pendingRegistrations[validIndex].id) {
            setSelectedRegistration(pendingRegistrations[validIndex]);
          }
          // 只有當索引需要調整時才更新
          if (validIndex !== quickReviewIndex) {
            setQuickReviewIndex(validIndex);
          }
        } else if (pendingRegistrations.length > 0) {
          // 如果當前索引無效，但還有待審核記錄，顯示第一筆
          setSelectedRegistration(pendingRegistrations[0]);
          setQuickReviewIndex(0);
        } else {
          // 沒有待審核記錄了，關閉快速審核模式
          setShowQuickReview(false);
          setQuickReviewIndex(-1);
        }
      } else {
        // 沒有待審核記錄了，關閉快速審核模式
        setShowQuickReview(false);
        setQuickReviewIndex(-1);
      }
    }
  }, [registrations, showQuickReview]); // 移除 quickReviewIndex 依賴，避免無限循環

  const handleQuickReviewApprove = async () => {
    if (!selectedRegistration) return;
    await performStatusUpdate('approved', null, null, selectedRegistration.id);
    // 重新載入資料（useEffect 會自動處理索引更新）
    await loadRegistrations();
  };

  const handleQuickReviewReject = async (reasons, other) => {
    if (!selectedRegistration) return;
    await performStatusUpdate('revision', reasons, other, selectedRegistration.id);
    // 重新載入資料（useEffect 會自動處理索引更新）
    await loadRegistrations();
  };

  // 狀態顯示文字（五種狀態）
  const getStatusText = (status) => {
    const statusMap = {
      'pending': { text: '審核中', class: 'warning' },
      'approved': { text: '已通過', class: 'success' },
      'revision': { text: '請修正', class: 'danger' },
      'success': { text: '報名成功', class: 'success' },
      'failed': { text: '報名失敗', class: 'secondary' }
    };
    return statusMap[status] || { text: status, class: 'secondary' };
  };

  // 一鍵發送報名成功/報名失敗/團體推廣信（非同步回饋 + Toast）
  const [sendingEmails, setSendingEmails] = useState(false);
  const handleSendStatusEmails = async (status) => {
    if (!['success', 'failed', 'group_promo'].includes(status)) return;
    const msg = status === 'success'
      ? '確定要對所有「報名成功」者發送通知信嗎？'
      : status === 'failed'
        ? '確定要對所有「報名失敗」者發送通知信嗎？'
        : '確定要對所有「報名成功」且「四項皆報考」者發送團體推廣信嗎？';
    setConfirmModal({
      show: true,
      config: {
        title: '確認發送信件',
        message: msg,
        confirmLabel: '發送',
        variant: 'primary',
        onConfirm: async () => {
          setSendingEmails(true);
          try {
            const response = await fetch('/api/english-test/registrations/send-status-emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ status })
            });
            const data = await response.json();
            if (response.ok) {
              showToast(
                data.message + (data.failed > 0 ? `，${data.failed} 筆發送失敗` : ''),
                data.failed > 0 ? 'warning' : 'success'
              );
            } else {
              const message =
                data.error ||
                data.message ||
                (response.status === 500
                  ? 'Gmail 暫時鎖定，請稍後再試'
                  : '發信失敗');
              const isGmailLocked =
                typeof message === 'string' && message.includes('Gmail 暫時鎖定');
              showToast(message, isGmailLocked ? 'warning' : 'danger');
            }
          } catch (e) {
            console.error(e);
            showToast('發信時發生錯誤', 'danger');
          } finally {
            setSendingEmails(false);
          }
        }
      }
    });
  };

  // 數據分析：Q21 統計
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

  if (flagsLoading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </div>
    );
  }

  const subTabs = [
    { key: 'all', label: '總報名人數', count: stats.total },
    { key: 'pending', label: '審核中', count: stats.pending },
    { key: 'approved', label: '已通過', count: stats.approved },
    { key: 'success', label: '報名成功', count: stats.success ?? 0 },
    { key: 'revision', label: '請修正', count: stats.revision ?? 0 },
    { key: 'failed', label: '報名失敗', count: stats.failed ?? 0 }
  ];

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setCurrentRegistrationIndex(-1);
    requestAnimationFrame(() => {
      if (tableContainerRef.current && scrollPositionRef.current !== undefined) {
        tableContainerRef.current.scrollTop = scrollPositionRef.current;
      }
    });
  };

  return (
    <div className="container-fluid px-2 px-md-3">
      {/* 主標籤：小螢幕可橫向捲動 */}
      <div className="nav nav-tabs nav-tabs--main mb-3 overflow-auto flex-nowrap gap-1" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }} role="tablist">
        {canViewEnglishTests && (
          <button
            className={`nav-link fw-semibold flex-shrink-0 ${mainTab === 'individual' ? 'active' : ''}`}
            onClick={() => { setMainTab('individual'); setCurrentPage(1); }}
            role="tab"
            aria-selected={mainTab === 'individual'}
          >
            個人報名
          </button>
        )}
        <button
          className={`nav-link fw-semibold flex-shrink-0 ${mainTab === 'group' ? 'active' : ''}`}
          onClick={() => setMainTab('group')}
          role="tab"
          aria-selected={mainTab === 'group'}
        >
          團體報名
        </button>
        {canViewEnglishTests && (
          <button
            className={`nav-link fw-semibold flex-shrink-0 ${mainTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setMainTab('analytics')}
            role="tab"
            aria-selected={mainTab === 'analytics'}
          >
            數據分析
          </button>
        )}
        {canViewEnglishTests && (
          <button
            className={`nav-link fw-semibold flex-shrink-0 ${mainTab === 'exemption' ? 'active' : ''}`}
            onClick={() => setMainTab('exemption')}
            role="tab"
            aria-selected={mainTab === 'exemption'}
          >
            抵免審核
          </button>
        )}
      </div>

      {!canViewEnglishTests && mainTab !== 'group' && (
        <div className="alert alert-warning">您目前僅有英檢指標或團體管理權限，無法檢視個人報名清單。</div>
      )}

      {/* 抵免審核（有填 B2 成績者） */}
      {canViewEnglishTests && mainTab === 'exemption' && (
        <ExemptionReviewSection token={token} />
      )}

      {/* 團體報名：管理頁面 */}
      {mainTab === 'group' && (
        <LearningPartnerManagement token={token} />
      )}

      {/* 數據分析：Q21 從何得知培力英檢（圖表、空狀態、匯出） */}
      {canViewEnglishTests && mainTab === 'analytics' && (
        <AnalyticsSection
          loading={analyticsLoading}
          data={infoSourceStats.data || []}
          total={infoSourceStats.total || 0}
        />
      )}

      {/* 個人報名：子標籤（含數量、小螢幕可橫向捲動）+ 內容 */}
      {mainTab === 'individual' && (
        <>
          <ul className="nav nav-pills mb-3 overflow-auto flex-nowrap gap-1" style={{ scrollbarWidth: 'thin' }} role="tablist">
            {subTabs.map(({ key, label, count }) => (
              <li key={key} className="nav-item flex-shrink-0" role="presentation">
                <button
                  className={`nav-link ${statusFilter === key ? 'active' : ''}`}
                  onClick={() => { 
                    setStatusFilter(key); 
                    setCurrentPage(1);
                    // 如果切換到「報名成功」，自動設定排序為 successSequence ASC
                    if (key === 'success') {
                      setSortConfig({ key: 'successSequence', direction: 'ASC' });
                    }
                  }}
                  role="tab"
                  aria-selected={statusFilter === key}
                >
                  {label}
                  <span className="badge bg-secondary ms-1">{count ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>

      {/* 操作區：匯出 / 發信 / 快速審核（置頂） */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <span />
        <div className="d-flex gap-2 align-items-center flex-wrap">
          {canReviewEnglishTests && stats.pending > 0 && statusFilter === 'pending' && (
            <button 
              className="btn btn-primary"
              onClick={handleOpenQuickReview}
            >
              <i className="fas fa-bolt me-2"></i>
              快速審核模式 ({stats.pending} 筆)
            </button>
          )}
          <select
            className="form-select form-select-sm"
            value={exportStatusFilter}
            onChange={(e) => setExportStatusFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '140px' }}
            aria-label="匯出篩選狀態"
          >
            <option value="all">全部</option>
            <option value="pending">審核中</option>
            <option value="approved">已通過</option>
            <option value="revision">請修正</option>
            <option value="success">報名成功</option>
            <option value="failed">報名失敗</option>
          </select>
          {canExportEnglishTestData && (
            <button className="btn btn-success btn-sm" onClick={handleExport}>
              <i className="fas fa-file-excel me-1"></i>
              匯出 Excel
            </button>
          )}
          {canExportEnglishTestData && (exportStatusFilter === 'approved' || exportStatusFilter === 'success') && (
            <button 
              className="btn btn-info btn-sm" 
              onClick={() => handleExportPhotos(exportStatusFilter)}
            >
              <i className="fas fa-images me-1"></i>
              匯出證件照
            </button>
          )}
          {canReviewEnglishTests && statusFilter === 'success' && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => handleSendStatusEmails('success')} disabled={sendingEmails || (stats.success === 0)}>
                <i className="fas fa-envelope me-1"></i>
                {sendingEmails ? '發送中...' : '一鍵發送報名成功信'}
              </button>
              <button className="btn btn-info btn-sm" onClick={() => handleSendStatusEmails('group_promo')} disabled={sendingEmails} title="對報名成功且四項皆報考者發送團體推廣信">
                <i className="fas fa-users me-1"></i>
                {sendingEmails ? '發送中...' : '一鍵發送團體推廣信'}
              </button>
            </>
          )}
          {canReviewEnglishTests && statusFilter === 'failed' && (
            <button className="btn btn-secondary btn-sm" onClick={() => handleSendStatusEmails('failed')} disabled={sendingEmails || (stats.failed === 0)}>
              <i className="fas fa-envelope me-1"></i>
              {sendingEmails ? '發送中...' : '一鍵發送報名失敗信'}
            </button>
          )}
        </div>
      </div>

      {/* 報名按鈕開關：個人與團體分開（截止時間不同） */}
      {canManageSettings && (
      <div className="card mb-4 border-light">
        <div className="card-body py-2">
          <div className="text-muted small mb-2">個人報名與團體報名功能開關（截止時間不同，請分別控制）</div>
          <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center gap-3 flex-wrap">
            <div className="d-flex align-items-center gap-2">
              <span className="small">個人報名</span>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="registrationEnabled"
                  checked={registrationEnabled}
                  onChange={(e) => handleToggleRegistration(e.target.checked)}
                  disabled={isUpdatingSetting}
                  aria-label={registrationEnabled ? '個人報名已啟用' : '個人報名已停用'}
                />
                <label className="form-check-label small" htmlFor="registrationEnabled">
                  {registrationEnabled ? '已啟用' : '已停用'}
                </label>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span className="small">團體報名（學習有伴）</span>
              <div className="form-check form-switch mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="registrationGroupEnabled"
                  checked={registrationGroupEnabled}
                  onChange={(e) => handleToggleRegistrationGroup(e.target.checked)}
                  disabled={isUpdatingSetting}
                  aria-label={registrationGroupEnabled ? '團體報名已啟用' : '團體報名已停用'}
                />
                <label className="form-check-label small" htmlFor="registrationGroupEnabled">
                  {registrationGroupEnabled ? '已啟用' : '已停用'}
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 篩選器（個人報名常駐進階版） */}
      {mainTab === 'individual' && (
        <AdvancedFilterPanel
          onFilterChange={(filters) => {
            setAdvancedFilters(filters);
            setCurrentPage(1);
          }}
          sortConfig={sortConfig}
          onSortChange={(nextSort) => {
            setSortConfig(nextSort);
            setCurrentPage(1);
          }}
          initialFilters={advancedFilters}
          searchTerm={searchTerm}
          onSearchChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          currentStatusFilter={statusFilter}
        />
      )}

      {/* 統計資訊（個人報名常駐進階版） */}
      {mainTab === 'individual' && (
        <StatsVisualization
          stats={stats}
          onFilterClick={handleStatsCardClick}
          todayNewCount={todayNewCount}
          currentStatusFilter={statusFilter}
        />
      )}

      {/* 批量操作工具列（個人報名常駐） */}
      {canReviewEnglishTests && mainTab === 'individual' && (
        <BulkActionToolbar
          selectedCount={selectedRows.length}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkDelete={handleBulkDelete}
          onBulkSetSuccess={handleBulkSetSuccess}
          onBulkSetFailed={handleBulkSetFailed}
          showBulkSetSuccess={statusFilter === 'approved'}
        />
      )}

      {/* 表格區（響應式：小螢幕縮小 maxHeight、橫向捲動由 EnhancedTable 處理） */}
      {mainTab === 'individual' && (
        <div ref={tableContainerRef} className="overflow-auto" style={{ maxHeight: 'min(70vh, 600px)' }}>
          {loading ? (
            <div className="card">
              <div className="card-body py-5">
                <div className="text-center">
                  <div className="spinner-border text-primary" role="status" aria-label="載入中">
                    <span className="visually-hidden">載入中...</span>
                  </div>
                  <p className="mt-2 text-muted small">載入報名列表中...</p>
                </div>
                <div className="mt-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="placeholder-glow mb-2">
                      <span className="placeholder col-12 rounded" style={{ height: '40px' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : registrations.length === 0 ? (
            <div className="card border-light">
              <div className="card-body text-center py-5">
                <i className="fas fa-inbox fa-3x text-muted mb-3" aria-hidden="true" />
                <p className="text-muted mb-2">目前此篩選下沒有報名資料</p>
                <p className="small text-muted mb-3">可嘗試切換上方狀態標籤或清除篩選條件</p>
                <button
                  type="button"
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => { setSearchTerm(''); setAdvancedFilters({ dateFrom: '', dateTo: '', examTypes: [], isLowIncome: '', hasDisabilityCard: '' }); setCurrentPage(1); loadRegistrations(); }}
                >
                  清除篩選條件
                </button>
              </div>
            </div>
          ) : (
            <>
              <EnhancedTable
                data={registrations}
                onSort={(key, direction) => {
                  setSortConfig({ key, direction });
                  setCurrentPage(1);
                  setTimeout(() => loadRegistrations(), 100);
                }}
                sortConfig={sortConfig}
                onRowSelect={setSelectedRows}
                selectedRows={selectedRows}
                onViewDetail={handleViewDetail}
                onQuickStatusUpdate={handleQuickStatusUpdate}
                onDelete={handleDelete}
                onClassBestep={handleGoToClassBestep}
                searchTerm={searchTerm}
                enableDragSort={statusFilter === 'success'}
                onDragEnd={async (activeId, overId) => {
                  if (activeId === overId) return;
                  // 找到拖曳的記錄和目標位置
                  const activeIndex = registrations.findIndex(r => r.id === parseInt(activeId));
                  const overIndex = registrations.findIndex(r => r.id === parseInt(overId));
                  if (activeIndex === -1 || overIndex === -1) return;
                  
                  // 計算目標序號
                  const targetReg = registrations[overIndex];
                  const targetSequence = targetReg.successSequence;
                  
                  if (targetSequence) {
                    await handleAdjustSequence(parseInt(activeId), 'move', targetSequence);
                  }
                }}
              />

              {/* 分頁（含「第 X–Y 筆 / 共 Z 筆」） */}
              <div className="d-flex flex-wrap justify-content-between align-items-center mt-3 gap-2">
                <small className="text-muted">
                  第 {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)} 筆，共 {total} 筆
                </small>
                {totalPages > 1 && (
                  <nav aria-label="分頁導覽">
                    <ul className="pagination pagination-sm mb-0">
                      <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          aria-label="上一頁"
                        >
                          上一頁
                        </button>
                      </li>
                      {[...Array(totalPages)].map((_, i) => (
                        <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => setCurrentPage(i + 1)}
                            aria-label={`第 ${i + 1} 頁`}
                            aria-current={currentPage === i + 1 ? 'page' : undefined}
                          >
                            {i + 1}
                          </button>
                        </li>
                      ))}
                      <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                        <button
                          className="page-link"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          aria-label="下一頁"
                        >
                          下一頁
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
              </div>
            </>
          )}
        </div>
      )}
        </>
      )}

      {/* 詳細資料 Modal（個人報名常駐進階版） */}
      {showDetailModal && selectedRegistration && (
        mainTab === 'individual' ? (
          <DetailModalWithTabs
            registration={selectedRegistration}
            onClose={handleCloseDetailModal}
            onQuickStatusUpdate={handleQuickStatusUpdate}
            onNavigatePrevious={handleNavigatePrevious}
            onNavigateNext={handleNavigateNext}
            canNavigatePrevious={canNavigatePrevious}
            canNavigateNext={canNavigateNext}
            positionLabel={total > 0 ? `第 ${(currentPage - 1) * limit + currentRegistrationIndex + 1} / ${total} 筆` : null}
            onAdjustSequence={handleAdjustSequence}
            token={token}
            adjustingSequence={adjustingSequence}
            onUpdateRegistration={handleUpdateRegistration}
            onUploadRegistrationFiles={handleUploadRegistrationFiles}
          />
        ) : (
          // 舊版 Modal（保持原樣，但加入導航箭頭）
          <div
            className="modal fade show"
            style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <div className="modal-dialog modal-lg modal-dialog-scrollable" style={{ position: 'relative', margin: '0 auto' }}>
              {/* 左側箭頭按鈕 */}
              {currentRegistrationIndex > 0 && (
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleNavigatePrevious}
                  style={{
                    position: 'absolute',
                    left: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1051,
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: '3px solid #007bff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#007bff',
                    boxShadow: '0 4px 12px rgba(0,123,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0056b3';
                    e.target.style.borderColor = '#0056b3';
                    e.target.style.transform = 'translateY(-50%) scale(1.15)';
                    e.target.style.boxShadow = '0 6px 16px rgba(0,123,255,0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#007bff';
                    e.target.style.borderColor = '#007bff';
                    e.target.style.transform = 'translateY(-50%) scale(1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
                  }}
                  title="上一筆"
                >
                  <i className="fas fa-chevron-left" style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}></i>
                </button>
              )}

              {/* 右側箭頭按鈕 */}
              {currentRegistrationIndex < registrations.length - 1 && (
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={handleNavigateNext}
                  style={{
                    position: 'absolute',
                    right: '-60px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    zIndex: 1051,
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    border: '3px solid #007bff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#007bff',
                    boxShadow: '0 4px 12px rgba(0,123,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#0056b3';
                    e.target.style.borderColor = '#0056b3';
                    e.target.style.transform = 'translateY(-50%) scale(1.15)';
                    e.target.style.boxShadow = '0 6px 16px rgba(0,123,255,0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#007bff';
                    e.target.style.borderColor = '#007bff';
                    e.target.style.transform = 'translateY(-50%) scale(1)';
                    e.target.style.boxShadow = '0 4px 12px rgba(0,123,255,0.4)';
                  }}
                  title="下一筆"
                >
                  <i className="fas fa-chevron-right" style={{ color: 'white', fontSize: '1.2rem', fontWeight: 'bold' }}></i>
                </button>
              )}

              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <div className="d-flex justify-content-between align-items-center w-100">
                    <h5 className="modal-title mb-0">報名詳細資料 - {selectedRegistration.name}</h5>
                    <div className="d-flex gap-2">
                      {/* 狀態按鈕 */}
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedRegistration.status === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                        onClick={() => handleQuickStatusUpdate(null, 'pending')}
                        title="設為待審核"
                      >
                        待審核
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedRegistration.status === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => handleQuickStatusUpdate(null, 'approved')}
                        title="設為已通過"
                      >
                        已通過
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${selectedRegistration.status === 'revision' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => handleQuickStatusUpdate(null, 'revision')}
                        title="設為請修正"
                      >
                        請修正
                      </button>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={handleCloseDetailModal}
                    aria-label="關閉"
                  ></button>
                    </div>
                  </div>
                </div>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <strong>學號：</strong> {selectedRegistration.studentId}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>姓名：</strong> {selectedRegistration.name}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>Email：</strong> {selectedRegistration.email}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>電話：</strong> {selectedRegistration.phone}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>出生日期：</strong> {selectedRegistration.birthDate}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>英文姓名：</strong> {selectedRegistration.lastNameEn} {selectedRegistration.firstNameEn}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>學院：</strong> {selectedRegistration.college}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>科系：</strong> {selectedRegistration.department}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>年級：</strong> {selectedRegistration.grade}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>就讀身分：</strong> {selectedRegistration.degreeLevel}
                    </div>
                    <div className="col-12 mb-3">
                      <strong>地址：</strong> {selectedRegistration.postalCode} {selectedRegistration.city} {selectedRegistration.district} {selectedRegistration.address}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>是否曾報考 BESTEP：</strong> {selectedRegistration.hasTakenBESTEP}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>是否取得 CEFR B2：</strong> {selectedRegistration.hasCEFRB2}
                    </div>
                    {selectedRegistration.hasCEFRB2 === '是' && (
                      <>
                        <div className="col-md-6 mb-3">
                          <strong>已通過測驗種類：</strong>
                          {selectedRegistration.passedExamTypes && Array.isArray(selectedRegistration.passedExamTypes) 
                            ? selectedRegistration.passedExamTypes.join(', ')
                            : '無'}
                        </div>
                        <div className="col-md-6 mb-3">
                          <strong>B2 項目：</strong> {selectedRegistration.b2SkillType || '無'}
                        </div>
                      </>
                    )}
                    <div className="col-md-6 mb-3">
                      <strong>中低收入戶：</strong> {selectedRegistration.isLowIncome}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>身心障礙手冊：</strong> {selectedRegistration.hasDisabilityCard}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>資訊來源：</strong> {selectedRegistration.infoSource}
                    </div>
                    <div className="col-md-6 mb-3">
                      <strong>狀態：</strong>
                      <span className={`badge bg-${getStatusText(selectedRegistration.status).class} ms-2`}>
                        {getStatusText(selectedRegistration.status).text}
                      </span>
                    </div>
                    {selectedRegistration.notes && (
                      <div className="col-12 mb-3">
                        <strong>備註：</strong>
                        <div className="mt-2 p-2 bg-light rounded">
                          {selectedRegistration.notes}
                        </div>
                      </div>
                    )}
                    <div className="col-12 mb-3">
                      <strong>報名時間：</strong> {new Date(selectedRegistration.createdAt).toLocaleString('zh-TW')}
                    </div>
                    
                    {/* 證件照顯示 */}
                    {selectedRegistration.idPhoto && (
                      <div className="col-12 mb-3">
                        <strong>證件照：</strong>
                        <div className="mt-2">
                          <img
                            src={`/uploads/${selectedRegistration.idPhoto}`}
                            alt="證件照"
                            style={{
                              maxWidth: '300px',
                              maxHeight: '400px',
                              border: '1px solid #ddd',
                              borderRadius: '5px',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              window.open(`/uploads/${selectedRegistration.idPhoto}`, '_blank');
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'block';
                            }}
                          />
                          <div style={{ display: 'none', color: '#999' }}>
                            圖片載入失敗
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* B2 成績證明 */}
                    {selectedRegistration.b2CertificateFile && (() => {
                      // 解析 B2 證書檔案（可能是 JSON 陣列字串或單一字串）
                      let b2Files = [];
                      try {
                        const parsed = typeof selectedRegistration.b2CertificateFile === 'string' 
                          ? JSON.parse(selectedRegistration.b2CertificateFile) 
                          : selectedRegistration.b2CertificateFile;
                        b2Files = Array.isArray(parsed) ? parsed : [parsed];
                      } catch (e) {
                        // 如果不是 JSON，當作單一檔案處理
                        b2Files = [selectedRegistration.b2CertificateFile];
                      }
                      
                      return (
                        <div className="col-12 mb-3">
                          <strong>B2 成績證明：</strong>
                          <div className="mt-2 d-flex gap-2 flex-wrap">
                            {b2Files.map((file, index) => (
                              <a
                                key={index}
                                href={`/uploads/${file}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-outline-primary"
                              >
                                查看檔案 {b2Files.length > 1 ? `(${index + 1})` : ''}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* 身心障礙證明 */}
                    {(selectedRegistration.disabilityCertFront || selectedRegistration.disabilityCertBack) && (
                      <div className="col-12 mb-3">
                        <strong>身心障礙證明：</strong>
                        <div className="mt-2 d-flex gap-2">
                          {selectedRegistration.disabilityCertFront && (
                            <a
                              href={`/uploads/${selectedRegistration.disabilityCertFront}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                            >
                              正面
                            </a>
                          )}
                          {selectedRegistration.disabilityCertBack && (
                            <a
                              href={`/uploads/${selectedRegistration.disabilityCertBack}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary"
                            >
                              反面
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleCloseDetailModal}
                  >
                    關閉
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* 更新狀態 Modal */}
      {showStatusModal && selectedRegistration && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowStatusModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">更新報名狀態</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowStatusModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">狀態</label>
                  <select
                    className="form-select"
                    value={statusUpdate.status}
                    onChange={(e) => {
                      const newStatus = e.target.value;
                      setStatusUpdate(prev => ({ ...prev, status: newStatus }));
                      // 如果選擇「請修正」，顯示拒絕原因選擇
                      if (newStatus === 'revision') {
                        setShowStatusModal(false);
                        setPendingStatusUpdate(newStatus);
                        setRejectionReasons([]);
                        setRejectionOther('');
                        setShowRejectionModal(true);
                      }
                    }}
                  >
                    <option value="pending">審核中</option>
                    <option value="approved">已通過</option>
                    <option value="revision">請修正</option>
                    <option value="success">報名成功</option>
                    <option value="failed">報名失敗</option>
                  </select>
                </div>
                {statusUpdate.status !== 'revision' && (
                  <div className="mb-3">
                    <label className="form-label">備註</label>
                    <textarea
                      className="form-control"
                      rows="4"
                      value={statusUpdate.notes}
                      onChange={(e) => setStatusUpdate(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="可選填備註資訊"
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowStatusModal(false)}
                >
                  取消
                </button>
                {statusUpdate.status !== 'revision' && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleUpdateStatus}
                  >
                    確認更新
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 拒絕原因選擇 Modal */}
      {showRejectionModal && selectedRegistration && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRejectionModal(false);
              setPendingStatusUpdate(null);
            }
          }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  {pendingStatusUpdate === 'failed' ? '選擇報名失敗原因（可複選）' : '選擇拒絕原因（可複選）'}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => {
                    setShowRejectionModal(false);
                    setPendingStatusUpdate(null);
                  }}
                ></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                <div className="alert alert-warning">
                  <strong>注意：</strong>
                  {pendingStatusUpdate === 'failed'
                    ? '切換至「報名失敗」狀態時，必須至少選擇一個原因，通知信將一併附上原因。'
                    : '切換至「請修正」狀態時，必須至少選擇一個拒絕原因。'}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-bold">
                    {pendingStatusUpdate === 'failed' ? '請選擇報名失敗原因（可複選）：' : '請選擇拒絕原因（可複選）：'}
                  </label>
                  <div className="mt-2">
                    {rejectionReasonOptions.map(option => (
                      <div key={option.id} className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`rejection-${option.id}`}
                          checked={rejectionReasons.includes(option.id)}
                          onChange={() => handleRejectionReasonChange(option.id)}
                        />
                        <label className="form-check-label" htmlFor={`rejection-${option.id}`}>
                          {option.text}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {rejectionReasons.includes('其他') && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">其他原因說明：</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={rejectionOther}
                      onChange={(e) => setRejectionOther(e.target.value)}
                      placeholder="請詳細說明拒絕原因"
                      required
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowRejectionModal(false);
                    setPendingStatusUpdate(null);
                  }}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmRejection}
                >
                  {pendingStatusUpdate === 'failed' ? '確認設為報名失敗' : '確認拒絕'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 快速審核模式 Modal */}
      {showQuickReview && selectedRegistration && (
        <QuickReviewMode
          registration={selectedRegistration}
          onApprove={handleQuickReviewApprove}
          onReject={handleQuickReviewReject}
          onNext={handleQuickReviewNext}
          onClose={() => {
            setShowQuickReview(false);
            setQuickReviewIndex(-1);
          }}
          autoNext={true}
        />
      )}

      {/* Toast 回饋 */}
      <ToastMessage
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast(prev => ({ ...prev, show: false }))}
      />

      {/* 自訂確認框（取代 window.confirm） */}
      {confirmModal.show && confirmModal.config && (
        <ConfirmModal
          show={true}
          title={confirmModal.config.title}
          message={confirmModal.config.message}
          confirmLabel={confirmModal.config.confirmLabel}
          cancelLabel={confirmModal.config.cancelLabel}
          variant={confirmModal.config.variant}
          onConfirm={confirmModal.config.onConfirm}
          onCancel={() => setConfirmModal({ show: false, config: null })}
        />
      )}
    </div>
  );
}
