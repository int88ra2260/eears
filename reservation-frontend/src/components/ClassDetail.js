// src/components/ClassDetail.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Form, 
  Table, 
  Alert, 
  Spinner, 
  Row, 
  Col,
  Badge,
  Tabs,
  Tab
} from 'react-bootstrap';
import { handleAPIError } from '../utils/errorHandler';

const ACTIVITY_TYPE_OPTIONS = [
  { value: 'All', label: '所有活動' },
  { value: 'ET', label: 'English Table' },
  { value: 'EC', label: 'English Club' },
  { value: 'JT', label: 'Job Talk' },
  { value: 'IF', label: 'International Forum' }
];

const SORT_OPTIONS = [
  { value: 'studentId', label: '學號' },
  { value: 'studentName', label: '姓名' },
  { value: 'attends', label: '簽到數' },
  { value: 'noShows', label: 'No-shows' }
];

export default function ClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [classInfo, setClassInfo] = useState({
    id: null,
    name: '載入中...',
    semester: '114-1',
    department: '',
    teacherName: ''
  });
  
  // 篩選條件
  const [filters, setFilters] = useState({
    semester: searchParams.get('semester') || '114-1',
    activityType: 'All',
    search: '',
    sortBy: 'studentId',
    sortOrder: 'asc',
    page: 1,
    pageSize: 50
  });
  
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0
  });

  // 載入資料
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`/api/admin/classes/${classId}/overview?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setPagination(result.pagination || { total: 0, totalPages: 0 });
        
        // 設定班級資訊
        if (result.classInfo) {
          setClassInfo({
            id: result.classInfo.id,
            name: result.classInfo.name || '未知班級',
            semester: result.classInfo.semester || filters.semester,
            department: result.classInfo.department || '',
            teacherName: result.classInfo.teacherName || ''
          });
        }
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
  }, [classId, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 處理篩選變更
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1
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

      const response = await fetch(`/api/admin/classes/${classId}/overview/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${classInfo?.className || '班級'}_明細_${filters.semester}.xlsx`;
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

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            variant="outline-secondary" 
            onClick={() => navigate('/admin/classes')}
            className="me-3"
          >
            <i className="fas fa-arrow-left me-2"></i>
            返回總覽
          </Button>
          <div>
            <h3 className="mb-0 h4">
              <i className="fas fa-users me-2"></i>
              {classInfo.name} ({classInfo.semester})
            </h3>
            {classInfo.teacherName && (
              <p className="text-muted mb-0 mt-1">
                <i className="fas fa-chalkboard-teacher me-2"></i>
                {classInfo.teacherName}
              </p>
            )}
          </div>
        </div>
        <div>
          <Button 
            variant="outline-info" 
            onClick={() => navigate(`/admin/classes/${classId}/bestep?semester=${filters.semester}`)}
            className="me-2"
          >
            <i className="fas fa-graduation-cap me-2"></i>
            BESTEP 概況
          </Button>
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
                <option value="114-1">114-1學期</option>
                <option value="113-2">113-2學期</option>
                <option value="114-2">114-2學期</option>
                <option value="115-1">115-1學期</option>
                <option value="115-2">115-2學期</option>
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
            <Col md={4}>
              <Form.Label>搜尋學生</Form.Label>
              <Form.Control
                type="text"
                placeholder="輸入學號、姓名或系所..."
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
                <option value="asc">升序</option>
                <option value="desc">降序</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 統計摘要 */}
      {data.length > 0 && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-primary">{data.length}</h5>
                <p className="mb-0">名冊人數</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-success">
                  {data.filter(s => s.attendedCountTotal > 0).length}
                </h5>
                <p className="mb-0">至少參與人數</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-info">
                  {data.reduce((sum, s) => sum + s.attendedCountTotal, 0)}
                </h5>
                <p className="mb-0">簽到總次數</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-warning">
                  {data.reduce((sum, s) => sum + s.noShowCount, 0)}
                </h5>
                <p className="mb-0">No-shows總數</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* 資料表格 */}
      <Card>
        <Card.Header>
          <h5>學生明細</h5>
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
              <div className="table-responsive">
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>學號</th>
                      <th>姓名</th>
                      <th>系所</th>
                      <th>總時數</th>
                      <th>計點數</th>
                      <th>最後簽到日</th>
                      <th>黑名單</th>
                      <th>教學評估</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((student, index) => {
                      // 從後端獲取總時數和計點數，如果沒有則計算
                      const totalHours = student.totalHours || 0;
                      const pointScore = student.pointScore || 0;
                      
                      return (
                        <tr key={student.studentId || index}>
                          <td>{student.studentId}</td>
                          <td>{student.studentName}</td>
                          <td>{student.department || '-'}</td>
                          <td>{totalHours ? totalHours.toFixed(1).replace(/\.0$/, '') : '0'}</td>
                          <td>{pointScore || '0'}</td>
                          <td>{student.lastAttendAt || '-'}</td>
                          <td>
                            {student.isBlacklisted ? (
                              <Badge bg="danger">是</Badge>
                            ) : (
                              <Badge bg="secondary">否</Badge>
                            )}
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => navigate(`/admin/analytics/student/${encodeURIComponent(student.studentId)}?fromSemester=${encodeURIComponent(filters.semester)}&toSemester=${encodeURIComponent(filters.semester)}`)}
                            >
                              查看學生歷程
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

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
    </div>
  );
}
