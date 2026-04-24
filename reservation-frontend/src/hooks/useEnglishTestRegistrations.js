/**
 * 培力英檢報名列表：載入、分頁、篩選、排序、統計。
 * 供 EnglishTestManagement 個人報名 Tab 使用。
 */
import { useState, useCallback, useEffect } from 'react';
import { getCurrentSemester } from '../utils/semesterUtils';

const SORT_CONFIG_KEY = 'englishTestSortConfig';
const DEFAULT_SORT = { key: 'id', direction: 'ASC' };
const LIMIT = 100;

const defaultStats = () => ({
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

const defaultAdvancedFilters = () => ({
  dateFrom: '',
  dateTo: '',
  examTypes: [],
  isLowIncome: '',
  hasDisabilityCard: '',
  semester: getCurrentSemester() || ''
});

function getInitialSortConfig() {
  try {
    const saved = localStorage.getItem(SORT_CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return DEFAULT_SORT;
}

/**
 * @param {Object} options
 * @param {string} options.token
 * @param {string} options.mainTab - 'individual' | 'group' | 'analytics'
 */
export function useEnglishTestRegistrations({ token, mainTab }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState(defaultAdvancedFilters());
  const [sortConfig, setSortConfig] = useState(() => getInitialSortConfig());
  const [stats, setStats] = useState(defaultStats());
  const [todayNewCount, setTodayNewCount] = useState(0);

  const loadRegistrations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: LIMIT,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        ...(mainTab === 'individual' && advancedFilters.dateFrom && { dateFrom: advancedFilters.dateFrom }),
        ...(mainTab === 'individual' && advancedFilters.dateTo && { dateTo: advancedFilters.dateTo }),
        ...(mainTab === 'individual' && advancedFilters.examTypes?.length > 0 && { examTypes: advancedFilters.examTypes }),
        ...(mainTab === 'individual' && advancedFilters.isLowIncome && { isLowIncome: advancedFilters.isLowIncome }),
        ...(mainTab === 'individual' && advancedFilters.hasDisabilityCard && { hasDisabilityCard: advancedFilters.hasDisabilityCard }),
        ...(mainTab === 'individual' && advancedFilters.semester && { semester: advancedFilters.semester }),
        ...(mainTab === 'individual' && sortConfig.key && { sortBy: sortConfig.key, sortOrder: sortConfig.direction })
      });

      const response = await fetch(`/api/english-test/registrations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.data || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
        if (data.stats) setStats(data.stats);
        if (mainTab === 'individual' && data.data) {
          const today = new Date().toISOString().split('T')[0];
          const count = data.data.filter(reg => {
            const regDate = new Date(reg.createdAt).toISOString().split('T')[0];
            return regDate === today;
          }).length;
          setTodayNewCount(count);
        }
      } else {
        let errorMessage = '載入報名列表失敗';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `載入報名列表失敗 (HTTP ${response.status})`;
        }
        console.error('載入報名列表失敗:', { status: response.status, statusText: response.statusText, error: errorMessage });
        try {
          window.dispatchEvent(new CustomEvent('eears:toast', { detail: { message: errorMessage, variant: 'danger' } }));
        } catch (_) {}
      }
    } catch (error) {
      console.error('載入報名列表錯誤:', error);
      try {
        window.dispatchEvent(
          new CustomEvent('eears:toast', { detail: { message: `載入報名列表時發生錯誤: ${error.message || '未知錯誤'}`, variant: 'danger' } })
        );
      } catch (_) {}
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, advancedFilters, sortConfig, mainTab, token]);

  const buildListParams = useCallback((pageOverride = null) => {
    const p = new URLSearchParams();
    const page = pageOverride !== null ? pageOverride : currentPage;
    p.set('page', String(page));
    p.set('limit', String(LIMIT));
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
  }, [currentPage, statusFilter, searchTerm, mainTab, advancedFilters, sortConfig]);

  useEffect(() => {
    localStorage.setItem(SORT_CONFIG_KEY, JSON.stringify(sortConfig));
  }, [sortConfig]);

  return {
    limit: LIMIT,
    registrations,
    setRegistrations,
    loading,
    setLoading,
    currentPage,
    setCurrentPage,
    totalPages,
    setTotalPages,
    total,
    setTotal,
    statusFilter,
    setStatusFilter,
    searchTerm,
    setSearchTerm,
    advancedFilters,
    setAdvancedFilters,
    sortConfig,
    setSortConfig,
    stats,
    setStats,
    todayNewCount,
    loadRegistrations,
    buildListParams
  };
}
