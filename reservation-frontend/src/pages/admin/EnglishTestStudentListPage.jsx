import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSemesters, getSemesterStudents } from '../../services/englishTestService';

const EMPTY = '—';
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function pickDefaultSemesterId(list, preferredId) {
  if (!Array.isArray(list) || list.length === 0) return '';
  if (preferredId) {
    const matched = list.find((s) => String(s.id) === String(preferredId));
    if (matched) return String(matched.id);
  }
  const active = list.find((s) => s && s.isActive === true);
  return String((active || list[0]).id || '');
}

function clampLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export default function EnglishTestStudentListPage() {
  const token = localStorage.getItem('token') || '';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState(searchParams.get('semesterId') || '');
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({
    limit: clampLimit(searchParams.get('limit') || DEFAULT_LIMIT),
    offset: Math.max(0, Number(searchParams.get('offset') || 0)),
    returned: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    keyword: '',
    grade: '',
    department: '',
    attained: '',
    limit: clampLimit(searchParams.get('limit') || DEFAULT_LIMIT),
    offset: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getSemesters(token);
        if (!mounted) return;
        setSemesters(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length > 0) {
          setSemesterId((prev) => pickDefaultSemesterId(list, prev || searchParams.get('semesterId')));
        }
      } catch (e) {
        if (mounted) setError(e.message || '載入學期失敗');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  const loadStudents = async (inputFilters = null) => {
    if (!semesterId) return;
    setLoading(true);
    setError('');
    try {
      const currentFilters = inputFilters || filters;
      const safeFilters = {
        ...currentFilters,
        attained:
          currentFilters.attained === 'true' || currentFilters.attained === 'false'
            ? currentFilters.attained
            : '',
        limit: clampLimit(currentFilters.limit),
        offset: Math.max(0, Number(currentFilters.offset || 0)),
      };
      const data = await getSemesterStudents(token, semesterId, safeFilters);
      setRows(Array.isArray(data?.items) ? data.items : []);
      setPagination({
        limit: Number(data?.pagination?.limit ?? safeFilters.limit),
        offset: Number(data?.pagination?.offset ?? safeFilters.offset),
        returned: Number(data?.pagination?.returned ?? (Array.isArray(data?.items) ? data.items.length : 0)),
      });
      setSearchParams({
        semesterId: String(semesterId),
        limit: String(safeFilters.limit),
        offset: String(safeFilters.offset),
      });
    } catch (e) {
      setRows([]);
      setPagination((prev) => ({ ...prev, returned: 0 }));
      setError(e.message || '載入學生列表失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semesterId]);

  const pageSize = clampLimit(pagination.limit || filters.limit);
  const pageOffset = Math.max(0, Number(pagination.offset || filters.offset || 0));
  const pageIndex = Math.floor(pageOffset / pageSize) + 1;
  const canGoPrev = pageOffset > 0;
  const canGoNext = Number(pagination.returned || 0) >= pageSize;

  const applyPagination = (nextOffset, nextLimit = pageSize) => {
    const nextFilters = {
      ...filters,
      limit: clampLimit(nextLimit),
      offset: Math.max(0, Number(nextOffset || 0)),
    };
    setFilters((p) => ({
      ...p,
      limit: nextFilters.limit,
      offset: nextFilters.offset,
    }));
    loadStudents(nextFilters);
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">英檢學生列表 V2</h4>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-2">
              <label className="form-label">學期</label>
              <select className="form-select" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
                {!semesters.length && <option value="">尚無學期</option>}
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.name || s.code || s.id}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">關鍵字</label>
              <input className="form-control" value={filters.keyword} onChange={(e) => setFilters((p) => ({ ...p, keyword: e.target.value }))} />
            </div>
            <div className="col-md-2">
              <label className="form-label">年級</label>
              <input className="form-control" value={filters.grade} onChange={(e) => setFilters((p) => ({ ...p, grade: e.target.value }))} />
            </div>
            <div className="col-md-2">
              <label className="form-label">系所</label>
              <input className="form-control" value={filters.department} onChange={(e) => setFilters((p) => ({ ...p, department: e.target.value }))} />
            </div>
            <div className="col-md-2">
              <label className="form-label">達標</label>
              <select className="form-select" value={filters.attained} onChange={(e) => setFilters((p) => ({ ...p, attained: e.target.value }))}>
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn btn-primary w-100"
                onClick={() => {
                  const nextFilters = { ...filters, limit: clampLimit(filters.limit), offset: 0 };
                  setFilters(nextFilters);
                  loadStudents(nextFilters);
                }}
                disabled={!semesterId || loading}
              >
                {loading ? '查詢中...' : '查詢'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">載入中...</div>}
      {!loading && !error && rows.length === 0 && <div className="alert alert-secondary">無資料</div>}

      {!loading && rows.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>學號</th><th>姓名</th><th>年級</th><th>系所</th>
                <th>L</th><th>R</th><th>S</th><th>W</th>
                <th>達標</th><th>紀錄數</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studentId} onClick={() => navigate(`/admin/english-test-v2/students/${row.studentId}?semesterId=${encodeURIComponent(semesterId)}`)} style={{ cursor: 'pointer' }}>
                  <td>{row.studentId}</td>
                  <td>{row.studentName || EMPTY}</td>
                  <td>{row.grade || EMPTY}</td>
                  <td>{row.department || EMPTY}</td>
                  <td>{row.bestListeningCefr || EMPTY}</td>
                  <td>{row.bestReadingCefr || EMPTY}</td>
                  <td>{row.bestSpeakingCefr || EMPTY}</td>
                  <td>{row.bestWritingCefr || EMPTY}</td>
                  <td>{row.attained ? '是' : '否'}</td>
                  <td>{row.attemptCount ?? 0}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/admin/english-test-v2/students/${row.studentId}?semesterId=${encodeURIComponent(semesterId)}`);
                      }}
                    >
                      詳細
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-3">
        <div className="text-muted small">
          第 {pageIndex} 頁，每頁 {pageSize} 筆；目前回傳 {pagination.returned} 筆
        </div>
        <div className="d-flex gap-2 align-items-center">
          <label className="small text-muted mb-0">每頁</label>
          <select
            className="form-select form-select-sm"
            style={{ width: 92 }}
            value={pageSize}
            onChange={(e) => applyPagination(0, e.target.value)}
          >
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={!canGoPrev || loading}
            onClick={() => applyPagination(Math.max(0, Number(filters.offset || 0) - pageSize))}
          >
            上一頁
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={!canGoNext || loading}
            onClick={() => applyPagination(Number(filters.offset || 0) + pageSize)}
          >
            下一頁
          </button>
          <button
            className="btn btn-sm btn-primary"
            disabled={loading || !semesterId}
            onClick={loadStudents}
          >
            套用分頁
          </button>
        </div>
      </div>
    </div>
  );
}

