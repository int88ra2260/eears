# 培力英檢管理頁面優化 - 實作範例代碼

本文件提供關鍵組件的完整實作範例，所有代碼都遵循「向下相容」和「Feature Flag 保護」原則。

---

## 1. AdvancedFilterPanel.js（高級篩選器）

```javascript
// components/english-test/AdvancedFilterPanel.js
import React, { useState, useEffect } from 'react';

export default function AdvancedFilterPanel({ onFilterChange, savedFilters = [] }) {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    colleges: [],
    departments: [],
    examTypes: [],
    isLowIncome: '',
    hasDisabilityCard: '',
    search: ''
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  // 學院選項（從 API 或固定列表）
  const colleges = ['文學院', '理學院', '工學院', '管理學院', '海洋科學院', '社會科學院', '西灣學院', '醫學院'];

  // 測驗類型選項
  const examTypeOptions = [
    { value: 'LRSW', label: '四項全考' },
    { value: 'LR', label: '聽讀' },
    { value: 'SW', label: '說寫' },
    { value: 'NON', label: '不報考' }
  ];

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const emptyFilters = {
      dateFrom: '',
      dateTo: '',
      colleges: [],
      departments: [],
      examTypes: [],
      isLowIncome: '',
      hasDisabilityCard: '',
      search: ''
    };
    setFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  const handleSaveFilter = () => {
    // 儲存到 localStorage 或 API
    const filterName = prompt('請輸入篩選條件名稱：');
    if (filterName) {
      const saved = [...savedFilters, { name: filterName, filters }];
      localStorage.setItem('englishTestSavedFilters', JSON.stringify(saved));
      alert('篩選條件已儲存');
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">進階篩選</h5>
          <div>
            <button
              className="btn btn-sm btn-outline-secondary me-2"
              onClick={handleReset}
            >
              重置
            </button>
            <button
              className="btn btn-sm btn-outline-primary me-2"
              onClick={handleSaveFilter}
            >
              儲存篩選
            </button>
            <button
              className="btn btn-sm btn-outline-info"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? '收起' : '展開'} 進階選項
            </button>
          </div>
        </div>

        <div className="row g-3">
          {/* 搜尋（保留舊版功能） */}
          <div className="col-md-6">
            <label className="form-label">搜尋（學號、姓名、Email）</label>
            <input
              type="text"
              className="form-control"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="輸入學號、姓名或 Email 搜尋"
            />
          </div>

          {/* 日期範圍 */}
          <div className="col-md-3">
            <label className="form-label">報名日期（起始）</label>
            <input
              type="date"
              className="form-control"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label">報名日期（結束）</label>
            <input
              type="date"
              className="form-control"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
          </div>

          {/* 進階選項（可展開/收起） */}
          {showAdvanced && (
            <>
              <div className="col-md-6">
                <label className="form-label">學院（可複選）</label>
                <select
                  className="form-select"
                  multiple
                  value={filters.colleges}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                    handleFilterChange('colleges', selected);
                  }}
                  size="3"
                >
                  {colleges.map(college => (
                    <option key={college} value={college}>{college}</option>
                  ))}
                </select>
                <small className="text-muted">按住 Ctrl/Cmd 可多選</small>
              </div>

              <div className="col-md-6">
                <label className="form-label">測驗類型（可複選）</label>
                <div className="d-flex flex-wrap gap-2">
                  {examTypeOptions.map(option => (
                    <div key={option.value} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`examType-${option.value}`}
                        checked={filters.examTypes.includes(option.value)}
                        onChange={(e) => {
                          const newTypes = e.target.checked
                            ? [...filters.examTypes, option.value]
                            : filters.examTypes.filter(t => t !== option.value);
                          handleFilterChange('examTypes', newTypes);
                        }}
                      />
                      <label className="form-check-label" htmlFor={`examType-${option.value}`}>
                        {option.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="col-md-6">
                <label className="form-label">中低收入戶</label>
                <select
                  className="form-select"
                  value={filters.isLowIncome}
                  onChange={(e) => handleFilterChange('isLowIncome', e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="否">否</option>
                  <option value="中低收入戶">中低收入戶</option>
                  <option value="低收入戶">低收入戶</option>
                </select>
              </div>

              <div className="col-md-6">
                <label className="form-label">身心障礙手冊</label>
                <select
                  className="form-select"
                  value={filters.hasDisabilityCard}
                  onChange={(e) => handleFilterChange('hasDisabilityCard', e.target.value)}
                >
                  <option value="">全部</option>
                  <option value="是">是</option>
                  <option value="否">否</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* 儲存的篩選條件 */}
        {savedFilters.length > 0 && (
          <div className="mt-3">
            <label className="form-label">快速套用：</label>
            <div className="d-flex flex-wrap gap-2">
              {savedFilters.map((saved, index) => (
                <button
                  key={index}
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => {
                    setFilters(saved.filters);
                    onFilterChange(saved.filters);
                  }}
                >
                  {saved.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 2. EnhancedTable.js（增強型表格）

```javascript
// components/english-test/EnhancedTable.js
import React, { useState, useEffect } from 'react';

export default function EnhancedTable({ 
  data, 
  onSort, 
  onRowSelect, 
  selectedRows = [],
  onViewDetail,
  onQuickStatusUpdate,
  onDelete
}) {
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'DESC' });
  const [visibleColumns, setVisibleColumns] = useState(() => {
    // 從 localStorage 讀取使用者偏好
    const saved = localStorage.getItem('englishTestTableColumns');
    return saved ? JSON.parse(saved) : ['id', 'studentId', 'name', 'email', 'status', 'createdAt'];
  });

  // 所有可用欄位
  const allColumns = [
    { key: 'id', label: '報名編號', sortable: true },
    { key: 'studentId', label: '學號', sortable: true },
    { key: 'name', label: '姓名', sortable: true },
    { key: 'email', label: 'Email', sortable: false },
    { key: 'phone', label: '電話', sortable: false },
    { key: 'college', label: '學院', sortable: true },
    { key: 'department', label: '科系', sortable: false },
    { key: 'status', label: '狀態', sortable: true },
    { key: 'createdAt', label: '報名時間', sortable: true },
    { key: 'photo', label: '證件照', sortable: false, image: true }
  ];

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'ASC' ? 'DESC' : 'ASC';
    setSortConfig({ key, direction });
    onSort && onSort(key, direction);
  };

  const handleColumnToggle = (key) => {
    const newVisible = visibleColumns.includes(key)
      ? visibleColumns.filter(col => col !== key)
      : [...visibleColumns, key];
    setVisibleColumns(newVisible);
    localStorage.setItem('englishTestTableColumns', JSON.stringify(newVisible));
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { text: '待審核', class: 'warning' },
      'approved': { text: '已通過', class: 'success' },
      'rejected': { text: '已拒絕', class: 'danger' }
    };
    const info = statusMap[status] || { text: status, class: 'secondary' };
    return <span className={`badge bg-${info.class}`}>{info.text}</span>;
  };

  return (
    <div className="card">
      <div className="card-body">
        {/* 欄位選擇器 */}
        <div className="mb-3 d-flex justify-content-end">
          <div className="dropdown">
            <button
              className="btn btn-sm btn-outline-secondary dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i className="fas fa-cog me-1"></i>
              顯示欄位
            </button>
            <ul className="dropdown-menu">
              {allColumns.map(col => (
                <li key={col.key}>
                  <div className="dropdown-item-text">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={visibleColumns.includes(col.key)}
                        onChange={() => handleColumnToggle(col.key)}
                      />
                      <label className="form-check-label">{col.label}</label>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 表格 */}
        <div className="table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                {/* 選擇框 */}
                <th>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onRowSelect && onRowSelect(data.map(row => row.id));
                      } else {
                        onRowSelect && onRowSelect([]);
                      }
                    }}
                  />
                </th>
                
                {/* 欄位標題 */}
                {allColumns
                  .filter(col => visibleColumns.includes(col.key))
                  .map(col => (
                    <th
                      key={col.key}
                      style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      {col.label}
                      {col.sortable && (
                        <span className="ms-2">
                          {sortConfig.key === col.key && (
                            <i className={`fas fa-sort-${sortConfig.direction === 'ASC' ? 'up' : 'down'}`}></i>
                          )}
                        </span>
                      )}
                    </th>
                  ))}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  {/* 選擇框 */}
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(row.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onRowSelect && onRowSelect([...selectedRows, row.id]);
                        } else {
                          onRowSelect && onRowSelect(selectedRows.filter(id => id !== row.id));
                        }
                      }}
                    />
                  </td>

                  {/* 資料欄位 */}
                  {allColumns
                    .filter(col => visibleColumns.includes(col.key))
                    .map(col => (
                      <td key={col.key}>
                        {col.key === 'status' ? (
                          getStatusBadge(row[col.key])
                        ) : col.key === 'photo' ? (
                          row.idPhoto ? (
                            <img
                              src={`/uploads/${row.idPhoto}`}
                              alt="證件照"
                              style={{
                                width: '50px',
                                height: '50px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(`/uploads/${row.idPhoto}`, '_blank')}
                            />
                          ) : (
                            <span className="text-muted">無</span>
                          )
                        ) : col.key === 'createdAt' ? (
                          new Date(row[col.key]).toLocaleString('zh-TW')
                        ) : (
                          row[col.key] || '-'
                        )}
                      </td>
                    ))}
                  
                  {/* 操作按鈕 */}
                  <td>
                    <QuickActionButtons
                      registration={row}
                      onView={() => onViewDetail && onViewDetail(row.id)}
                      onQuickStatusUpdate={onQuickStatusUpdate}
                      onDelete={() => onDelete && onDelete(row.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. BulkActionToolbar.js（批量操作工具列）

```javascript
// components/english-test/BulkActionToolbar.js
import React, { useState } from 'react';

export default function BulkActionToolbar({
  selectedCount,
  onBulkApprove,
  onBulkReject,
  onBulkDelete,
  onBulkExport
}) {
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [rejectionOther, setRejectionOther] = useState('');

  const handleBulkReject = () => {
    setShowRejectionModal(true);
  };

  const handleConfirmRejection = () => {
    if (rejectionReasons.length === 0) {
      alert('請至少選擇一個拒絕原因');
      return;
    }
    if (rejectionReasons.includes('其他') && !rejectionOther.trim()) {
      alert('選擇「其他」拒絕原因時，必須填寫說明');
      return;
    }
    onBulkReject && onBulkReject(rejectionReasons, rejectionOther);
    setShowRejectionModal(false);
    setRejectionReasons([]);
    setRejectionOther('');
  };

  if (selectedCount === 0) return null;

  return (
    <>
      <div className="card mb-3 border-primary">
        <div className="card-body bg-light">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong className="text-primary">已選擇 {selectedCount} 筆記錄</strong>
            </div>
            <div className="btn-group">
              <button
                className="btn btn-sm btn-success"
                onClick={() => onBulkApprove && onBulkApprove()}
              >
                <i className="fas fa-check me-1"></i>
                批量通過
              </button>
              <button
                className="btn btn-sm btn-danger"
                onClick={handleBulkReject}
              >
                <i className="fas fa-times me-1"></i>
                批量拒絕
              </button>
              <button
                className="btn btn-sm btn-warning"
                onClick={() => onBulkDelete && onBulkDelete()}
              >
                <i className="fas fa-trash me-1"></i>
                批量刪除
              </button>
              <button
                className="btn btn-sm btn-info"
                onClick={() => onBulkExport && onBulkExport()}
              >
                <i className="fas fa-download me-1"></i>
                批量匯出
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 拒絕原因 Modal */}
      {showRejectionModal && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRejectionModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">批量拒絕原因</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRejectionModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  您將批量拒絕 {selectedCount} 筆記錄，請選擇拒絕原因。
                </div>
                <div className="mb-3">
                  <label className="form-label">拒絕原因（可複選）：</label>
                  {[
                    '照片不符規定',
                    '資料不完整',
                    '資料錯誤',
                    '其他'
                  ].map(reason => (
                    <div key={reason} className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        checked={rejectionReasons.includes(reason)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRejectionReasons([...rejectionReasons, reason]);
                          } else {
                            setRejectionReasons(rejectionReasons.filter(r => r !== reason));
                          }
                        }}
                      />
                      <label className="form-check-label">{reason}</label>
                    </div>
                  ))}
                </div>
                {rejectionReasons.includes('其他') && (
                  <div className="mb-3">
                    <label className="form-label">其他原因說明：</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={rejectionOther}
                      onChange={(e) => setRejectionOther(e.target.value)}
                      placeholder="請詳細說明拒絕原因"
                    />
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRejectionModal(false)}
                >
                  取消
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleConfirmRejection}
                >
                  確認拒絕
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## 4. QuickActionButtons.js（快速操作按鈕）

```javascript
// components/english-test/QuickActionButtons.js
import React from 'react';

export default function QuickActionButtons({
  registration,
  onView,
  onQuickStatusUpdate,
  onDelete
}) {
  const statusMap = {
    'pending': { text: '待審核', class: 'warning' },
    'approved': { text: '已通過', class: 'success' },
    'rejected': { text: '已拒絕', class: 'danger' }
  };

  return (
    <div className="btn-group btn-group-sm">
      {/* 主要操作：查看 */}
      <button
        className="btn btn-outline-primary"
        onClick={onView}
        title="查看詳細資料"
      >
        <i className="fas fa-eye"></i>
      </button>

      {/* 快速狀態切換（圖示按鈕） */}
      <button
        className={`btn ${registration.status === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
        onClick={() => onQuickStatusUpdate && onQuickStatusUpdate(registration.id, 'pending')}
        title="設為待審核 (P)"
      >
        <i className="fas fa-clock"></i>
      </button>
      <button
        className={`btn ${registration.status === 'approved' ? 'btn-success' : 'btn-outline-success'}`}
        onClick={() => onQuickStatusUpdate && onQuickStatusUpdate(registration.id, 'approved')}
        title="設為已通過 (A)"
      >
        <i className="fas fa-check"></i>
      </button>
      <button
        className={`btn ${registration.status === 'rejected' ? 'btn-danger' : 'btn-outline-danger'}`}
        onClick={() => onQuickStatusUpdate && onQuickStatusUpdate(registration.id, 'rejected')}
        title="設為已拒絕 (R)"
      >
        <i className="fas fa-times"></i>
      </button>

      {/* 更多操作（下拉選單） */}
      <div className="btn-group">
        <button
          type="button"
          className="btn btn-outline-secondary dropdown-toggle"
          data-bs-toggle="dropdown"
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>
        <ul className="dropdown-menu">
          <li>
            <a className="dropdown-item" href="#" onClick={(e) => {
              e.preventDefault();
              onDelete && onDelete(registration.id);
            }}>
              <i className="fas fa-trash text-danger me-2"></i>
              刪除
            </a>
          </li>
          <li>
            <a className="dropdown-item" href="#" onClick={(e) => {
              e.preventDefault();
              // 複製連結功能
              navigator.clipboard.writeText(window.location.href);
              alert('連結已複製到剪貼簿');
            }}>
              <i className="fas fa-link me-2"></i>
              複製連結
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
```

---

## 5. 主組件整合範例（EnglishTestManagement.js 修改片段）

```javascript
// components/EnglishTestManagement.js（關鍵修改部分）

import { useEnhancedFeatures } from '../hooks/useEnhancedFeatures';
import AdvancedFilterPanel from './english-test/AdvancedFilterPanel';
import EnhancedTable from './english-test/EnhancedTable';
import BulkActionToolbar from './english-test/BulkActionToolbar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

export default function EnglishTestManagement() {
  const { token } = useOutletContext();
  const { flags, loading: flagsLoading } = useEnhancedFeatures(token);
  
  // 現有狀態（保持不變）
  const [registrations, setRegistrations] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 新版狀態（僅在 Feature Flag 啟用時使用）
  const [advancedFilters, setAdvancedFilters] = useState({});
  const [selectedRows, setSelectedRows] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'DESC' });

  // 鍵盤快捷鍵（僅在 Feature Flag 啟用時）
  useKeyboardShortcuts([
    { 
      keys: [true, false, false, 'a'], 
      handler: () => handleBulkApprove(),
      preventDefault: true 
    },
    { 
      keys: [false, false, false, 'escape'], 
      handler: () => {
        setSelectedRows([]);
        setShowDetailModal(false);
      }
    }
  ], flags.keyboardShortcuts);

  // 載入報名列表（擴展版本）
  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        
        // 舊版參數（保持相容）
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm }),
        
        // 新版參數（僅在 Feature Flag 啟用時）
        ...(flags.enhancedUI && advancedFilters.dateFrom && { 
          dateFrom: advancedFilters.dateFrom 
        }),
        ...(flags.enhancedUI && advancedFilters.dateTo && { 
          dateTo: advancedFilters.dateTo 
        }),
        ...(flags.enhancedUI && advancedFilters.colleges?.length > 0 && {
          colleges: advancedFilters.colleges
        }),
        ...(flags.enhancedUI && sortConfig.key && {
          sortBy: sortConfig.key,
          sortOrder: sortConfig.direction
        })
      });

      const response = await fetch(`/api/english-test/registrations?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (error) {
      console.error('載入報名列表錯誤:', error);
      alert('載入報名列表時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  // 批量操作處理
  const handleBulkApprove = async () => {
    if (selectedRows.length === 0) return;
    if (!confirm(`確定要批量通過 ${selectedRows.length} 筆記錄嗎？`)) return;

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
        alert('批量更新成功');
        setSelectedRows([]);
        loadRegistrations();
      } else {
        alert('批量更新失敗');
      }
    } catch (error) {
      console.error('批量更新錯誤:', error);
      alert('批量更新時發生錯誤');
    }
  };

  // 條件渲染
  if (flagsLoading) {
    return <div>載入中...</div>;
  }

  return (
    <div>
      {/* 統計資訊（保持不變） */}
      {/* ... */}

      {/* 篩選器：根據 Feature Flag 選擇版本 */}
      {flags.enhancedUI ? (
        <AdvancedFilterPanel
          onFilterChange={(filters) => {
            setAdvancedFilters(filters);
            setCurrentPage(1);
            // 延遲載入以節省 API 呼叫
            const timeoutId = setTimeout(() => {
              loadRegistrations();
            }, 500);
            return () => clearTimeout(timeoutId);
          }}
        />
      ) : (
        // 舊版篩選器（保持原樣）
        <div className="card mb-4">
          {/* 現有篩選器程式碼 */}
        </div>
      )}

      {/* 批量操作工具列 */}
      {flags.enhancedUI && flags.bulkOperations && (
        <BulkActionToolbar
          selectedCount={selectedRows.length}
          onBulkApprove={handleBulkApprove}
          onBulkReject={handleBulkReject}
          onBulkDelete={handleBulkDelete}
          onBulkExport={handleBulkExport}
        />
      )}

      {/* 表格：根據 Feature Flag 選擇版本 */}
      {flags.enhancedUI ? (
        <EnhancedTable
          data={registrations}
          onSort={(key, direction) => {
            setSortConfig({ key, direction });
            loadRegistrations();
          }}
          onRowSelect={setSelectedRows}
          selectedRows={selectedRows}
          onViewDetail={handleViewDetail}
          onQuickStatusUpdate={handleQuickStatusUpdate}
          onDelete={handleDelete}
        />
      ) : (
        // 舊版表格（保持原樣）
        <div className="table-responsive">
          {/* 現有表格程式碼 */}
        </div>
      )}

      {/* Modal（保持不變或使用新版） */}
      {/* ... */}
    </div>
  );
}
```

---

**注意**：以上所有代碼範例都遵循以下原則：
1. ✅ 向下相容：不影響既有功能
2. ✅ Feature Flag 保護：新功能可隨時關閉
3. ✅ 錯誤處理：新功能錯誤不影響舊功能
4. ✅ 可回滾：透過 Feature Flag 即可回滾
