// src/components/ClassOverview.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useOutletContext } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Form, 
  Table, 
  Alert, 
  Spinner, 
  Row, 
  Col,
  // InputGroup,
  Modal,
  ProgressBar
} from 'react-bootstrap';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { handleAPIError } from '../utils/errorHandler';
import { getCurrentSemester, SEMESTER_OPTIONS as SEMESTER_OPTIONS_UTILS } from '../utils/semesterUtils';
import { buildAccessProfile, hasPermission } from '../utils/accessControl';
import { P } from '../constants/permissions';

const SEMESTER_OPTIONS = [
  { value: '114-1', label: '114-1學期' },
  { value: '113-2', label: '113-2學期' },
  { value: '114-2', label: '114-2學期' },
  { value: '115-1', label: '115-1學期' },
  { value: '115-2', label: '115-2學期' }
];

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'All', label: '所有活動' },
  { value: 'ET', label: 'English Table' },
  { value: 'EC', label: 'English Club' },
  { value: 'JT', label: 'Job Talk' },
  { value: 'IF', label: 'International Forum' }
];

const SORT_OPTIONS = [
  { value: 'coverage', label: '參與率' },
  { value: 'attends', label: '簽到總次數' },
  { value: 'className', label: '班級名稱' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const RADIAN = Math.PI / 180;
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (!percent || percent <= 0 || !name) return null;
  const radius = outerRadius + 20;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#333"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      style={{ fontSize: '12px' }}
    >
      {`${name} ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ClassOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole, token, accessProfile: ctxAccess } = useOutletContext() || {};
  const accessProfile = ctxAccess || buildAccessProfile(token || '', userRole || '');
  const canManageClasses = hasPermission(accessProfile, P.CAN_MANAGE_CLASSES);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [targetClass, setTargetClass] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  
  // 篩選條件
  const [filters, setFilters] = useState({
    semester: getCurrentSemester() ||'114-1',
    activityType: 'All',
    search: '',
    sortBy: 'coverage',
    sortOrder: 'desc',
    page: 1,
    pageSize: 20
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  // 檔案上傳相關
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadClassName, setUploadClassName] = useState('');
  const [uploadTeacherName, setUploadTeacherName] = useState('');
  const [uploadSemester, setUploadSemester] = useState(getCurrentSemester() || '114-1');
  const [uploadResult, setUploadResult] = useState(null);

  // 載入資料
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/classes/overview?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setPagination(result.pagination || { total: 0, totalPages: 0 });
      } else {
        const errorData = await response.json();
        setError(errorData.error || '載入資料失敗');
      }
    } catch (err) {
      const errMsg = handleAPIError(err);
      setError(errMsg?.display || errMsg?.zh || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 監聽路由變化，當從其他頁面返回時重新載入資料
  useEffect(() => {
    if (location.pathname === '/admin/classes') {
      loadData();
    }
  }, [location.pathname, loadData]);

  // 處理篩選變更
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1 // 除了分頁外，其他篩選變更都重置到第一頁
    }));
  };

  // 處理搜尋（防抖）
  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearchChange = (value) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    setSearchTimeout(setTimeout(() => {
      handleFilterChange('search', value);
    }, 300));
  };

  // 匯出 Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        semester: filters.semester,
        activityType: filters.activityType
      });

      const response = await fetch(`/api/admin/classes/overview/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `班級參與概況_${filters.semester}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '匯出失敗');
      }
    } catch (err) {
      setError('匯出失敗：' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // 下載範例檔案
  const handleDownloadSample = async () => {
    try {
      const response = await fetch('/api/admin/classes/sample', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '班級名單範例.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(errorData.error || '下載範例檔案失敗');
      }
    } catch (err) {
      setError('下載範例檔案失敗：' + err.message);
    }
  };

  // 檔案上傳
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setError('請選擇檔案');
      return;
    }

    if (!uploadClassName.trim()) {
      setError('請輸入班級名稱');
      return;
    }

    if (!uploadTeacherName.trim()) {
      setError('請輸入老師姓名');
      return;
    }

    if (!uploadSemester) {
      setError('請選擇學期');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await fetch(`/api/admin/classes/roster/import?semester=${uploadSemester}&className=${encodeURIComponent(uploadClassName.trim())}&teacherName=${encodeURIComponent(uploadTeacherName.trim())}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setUploadResult(result);
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadClassName('');
        setUploadTeacherName('');
        setUploadSemester(getCurrentSemester() || '114-1'); // 重置為當前學期
        loadData(); // 重新載入資料
      } else {
        setError(result.error || '上傳失敗');
      }
    } catch (err) {
      setError('上傳失敗：' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const openDeleteModal = (classItem) => {
    setTargetClass(classItem);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setTargetClass(null);
    setDeleteError('');
  };

  const handleDeleteClass = async () => {
    if (!targetClass) return;

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const response = await fetch(`/api/admin/classes/${targetClass.classId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || '刪除班級失敗');
      }

      setStatusMessage(result.message || `班級「${targetClass.className}」已刪除`);
      setError('');
      closeDeleteModal();
      loadData();
    } catch (err) {
      setDeleteError(err.message || '刪除班級失敗');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 準備圖表資料
  const chartData = data.map(item => ({
    name: item.className,
    coverage: item.coverage,
    attends: item.attendedCountTotal
  }));

  const pieData = data.reduce((acc, item) => {
    if (item.byType && typeof item.byType === 'object') {
      Object.entries(item.byType).forEach(([type, count]) => {
        if (count > 0) { // 只顯示有數據的活動類型
          const existing = acc.find(d => d.name === type);
          if (existing) {
            existing.value += count;
          } else {
            acc.push({ name: type, value: count });
          }
        }
      });
    }
    return acc;
  }, []);


  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="text-muted">
          <i className="fas fa-calendar-alt me-2" aria-hidden="true"></i>
          學期：{filters.semester}
        </div>
        <div>
          {canManageClasses && (
            <>
              <Button
                variant="outline-secondary"
                onClick={handleDownloadSample}
                className="me-2"
              >
                <i className="fas fa-file-download me-2"></i>
                下載範例
              </Button>
              <Button
                variant="outline-primary"
                onClick={() => setShowUploadModal(true)}
                className="me-2"
              >
                <i className="fas fa-upload me-2"></i>
                匯入名單
              </Button>
            </>
          )}
          <Button 
            variant="outline-success" 
            onClick={handleExport}
            disabled={exporting || data.length === 0}
          >
            {exporting ? (
              <>
                <Spinner size="sm" className="me-2" />
                匯出中...
              </>
            ) : (
              <>
                <i className="fas fa-download me-2"></i>
                匯出 Excel
              </>
            )}
          </Button>
        </div>
      </div>

      {error && <Alert variant="danger">{error}</Alert>}
      {statusMessage && <Alert variant="success">{statusMessage}</Alert>}

      {/* 篩選控制列 */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={2}>
              <Form.Label>學期</Form.Label>
              <Form.Select
                value={filters.semester}
                onChange={(e) => handleFilterChange('semester', e.target.value)}
              >
                {SEMESTER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>活動類型</Form.Label>
              <Form.Select
                value={filters.activityType}
                onChange={(e) => handleFilterChange('activityType', e.target.value)}
              >
                {ACTIVITY_TYPE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Label>搜尋班級</Form.Label>
              <Form.Control
                type="text"
                placeholder="輸入班級名稱..."
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Label>排序方式</Form.Label>
              <Form.Select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                {SORT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Label>排序順序</Form.Label>
              <Form.Select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </Form.Select>
            </Col>
            <Col md={1}>
              <Form.Label>每頁筆數</Form.Label>
              <Form.Select
                value={filters.pageSize}
                onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 圖表區域 */}
      {data.length > 0 && (
        <Row className="mb-4">
          <Col md={8}>
            <Card>
              <Card.Header>
                <h5>各班參與率</h5>
              </Card.Header>
              <Card.Body>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="coverage" fill="#8884d8" name="參與率(%)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card>
              <Card.Header>
                <h5>活動類型分布</h5>
              </Card.Header>
              <Card.Body>
                {pieData.length === 0 ? (
                  <div className="text-center text-muted py-4">
                    尚無活動類型資料
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="40%"
                        cy="50%"
                        labelLine
                        label={renderPieLabel}
                        outerRadius={90}
                        innerRadius={30}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend layout="vertical" align="right" verticalAlign="middle" />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* 資料表格 */}
      <Card>
        <Card.Header>
          <h5>班級統計</h5>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">載入中...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted">沒有找到符合條件的資料</p>
            </div>
          ) : (
            <>
              <Table responsive striped hover>
                <thead>
                  <tr>
                    <th>班級名稱</th>
                    <th>老師姓名</th>
                    <th>名冊人數</th>
                    <th>至少參與人數</th>
                    <th>參與率</th>
                    <th>簽到總次數</th>
                    <th>平均參與次數</th>
                    <th>No-shows總數</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.classId}>
                      <td>{item.className}</td>
                      <td>{item.teacherName || '-'}</td>
                      <td>{item.studentCount}</td>
                      <td>{item.participatedCount}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          <ProgressBar 
                            now={item.coverage} 
                            style={{ width: '60px', height: '20px' }}
                            className="me-2"
                          />
                          <span>{item.coverage.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td>{item.attendedCountTotal}</td>
                      <td>{item.avgAttendPerStudent}</td>
                      <td>{item.noShowCountTotal}</td>
                      <td>
                        <div>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => navigate(`/admin/classes/${item.classId}?semester=${filters.semester}`)}
                          >
                            查看明細
                          </Button>
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => navigate(`/admin/classes/${item.classId}/bestep?semester=${filters.semester}`)}
                          >
                            BESTEP
                          </Button>
                        </div>
                        {canManageClasses && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => openDeleteModal(item)}
                          >
                            刪除資料
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>

              {/* 分頁 */}
              {pagination.totalPages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <div>
                    顯示第 {(filters.page - 1) * filters.pageSize + 1} - {Math.min(filters.page * filters.pageSize, pagination.total)} 筆，
                    共 {pagination.total} 筆
                  </div>
                  <div>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={filters.page === 1}
                      onClick={() => handleFilterChange('page', filters.page - 1)}
                    >
                      上一頁
                    </Button>
                    <span className="mx-2">
                      第 {filters.page} 頁，共 {pagination.totalPages} 頁
                    </span>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      disabled={filters.page === pagination.totalPages}
                      onClick={() => handleFilterChange('page', filters.page + 1)}
                    >
                      下一頁
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* 刪除班級 Modal */}
      <Modal show={showDeleteModal} onHide={closeDeleteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>刪除班級資料</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p className="mb-2">
            確定要刪除班級
            <strong className="ms-1">
              {targetClass?.className || ''}
            </strong>
            嗎？
          </p>
          <p className="text-danger small">
            此操作會移除班級名冊與統計資料，且無法復原。
          </p>
          {deleteError && (
            <Alert variant="danger" className="mb-0">
              {deleteError}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeDeleteModal} disabled={deleteLoading}>
            取消
          </Button>
          <Button variant="danger" onClick={handleDeleteClass} disabled={deleteLoading}>
            {deleteLoading ? '刪除中...' : '確認刪除'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 檔案上傳 Modal */}
      <Modal show={showUploadModal} onHide={() => {
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadClassName('');
        setUploadTeacherName('');
        setUploadSemester(getCurrentSemester() || '114-1');
        setError('');
      }}>
        <Modal.Header closeButton>
          <Modal.Title>匯入班級名單</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>學期 <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={uploadSemester}
              onChange={(e) => setUploadSemester(e.target.value)}
            >
              {SEMESTER_OPTIONS_UTILS.filter(opt => opt.value !== '').map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              預設為當前學期（{getCurrentSemester() || '114-1'}），可手動選擇其他學期
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>班級名稱 <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="請輸入班級名稱，例如：英文中級 GEEN116"
              value={uploadClassName}
              onChange={(e) => setUploadClassName(e.target.value)}
            />
            <Form.Text className="text-muted">
              此班級名稱將套用到檔案中的所有學生
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>老師姓名 <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              placeholder="請輸入老師姓名"
              value={uploadTeacherName}
              onChange={(e) => setUploadTeacherName(e.target.value)}
            />
            <Form.Text className="text-muted">
              此老師將負責此班級的學生參與狀況追蹤
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>選擇 Excel 檔案 <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setUploadFile(e.target.files[0])}
            />
            <Form.Text className="text-muted">
              支援 .xlsx 和 .xls 格式，檔案大小限制 10MB
            </Form.Text>
          </Form.Group>
          
          <Alert variant="info">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>檔案格式要求：</strong>
                <ul className="mb-0 mt-2">
                  <li>必須包含：學號、姓名</li>
                  <li>可選包含：系所、年級</li>
                  <li>支援中英文欄位名稱</li>
                  <li>班級名稱在此處手動輸入</li>
                </ul>
              </div>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={handleDownloadSample}
              >
                <i className="fas fa-download me-1"></i>
                下載範例
              </Button>
            </div>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowUploadModal(false)}>
            取消
          </Button>
          <Button 
            variant="primary" 
            onClick={handleFileUpload}
            disabled={!uploadFile || !uploadClassName.trim() || !uploadTeacherName.trim() || !uploadSemester || uploading}
          >
            {uploading ? (
              <>
                <Spinner size="sm" className="me-2" />
                上傳中...
              </>
            ) : (
              '上傳'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 上傳結果 Modal */}
      {uploadResult && (
        <Modal show={!!uploadResult} onHide={() => setUploadResult(null)}>
          <Modal.Header closeButton>
            <Modal.Title>上傳結果</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="success">
              <strong>上傳成功！</strong>
            </Alert>
            <ul>
              <li>學期：{uploadResult.semester}</li>
              <li>新增班級：{uploadResult.classesCreated} 個</li>
              <li>更新班級：{uploadResult.classesUpdated} 個</li>
              <li>處理學生：{uploadResult.membersUpserted} 人</li>
              <li>跳過：{uploadResult.skipped} 筆</li>
            </ul>
            {uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <Alert variant="warning">
                <strong>警告：</strong>
                <ul className="mb-0 mt-2">
                  {uploadResult.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="primary" onClick={() => setUploadResult(null)}>
              確定
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  );
}
