// src/components/ClassBestepOverview.js
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
  Modal
} from 'react-bootstrap';
import { handleAPIError } from '../utils/errorHandler';
import { getCurrentSemester } from '../utils/semesterUtils';

const EXAM_TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'LR', label: 'LR（聽讀）' },
  { value: 'SW', label: 'SW（說寫）' }
];

export default function ClassBestepOverview() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [classInfo, setClassInfo] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  
  // 篩選條件
  const [filters, setFilters] = useState({
    semester: searchParams.get('semester') || getCurrentSemester(),
    examType: 'all',
    search: '',
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
      params.append('semester', filters.semester);
      params.append('examType', filters.examType);
      params.append('page', filters.page);
      params.append('pageSize', filters.pageSize);
      if (filters.search) {
        params.append('search', filters.search);
      }

      const response = await fetch(`/api/admin/classes/${classId}/bestep-overview?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setClassInfo(result.classInfo);
        setStatistics(result.statistics);
        setStudents(result.students || []);
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

  // 顯示學生詳細資訊
  const handleShowStudentDetail = (student) => {
    setSelectedStudent(student);
    setShowStudentModal(true);
  };

  // 格式化 CEFR 等級顯示
  const formatLevel = (level) => {
    if (!level) return '-';
    const levelColors = {
      'A1': 'secondary',
      'A2': 'info',
      'B1': 'warning',
      'B2': 'success',
      'C1': 'primary',
      'C2': 'danger'
    };
    return <Badge bg={levelColors[level] || 'secondary'}>{level}</Badge>;
  };

  const getRegistrationStatusInfo = (status) => {
    const statusMap = {
      pending: { label: '審核中', variant: 'warning' },
      approved: { label: '已通過', variant: 'info' },
      revision: { label: '請修正', variant: 'danger' },
      success: { label: '報名成功', variant: 'success' },
      failed: { label: '報名失敗', variant: 'secondary' },
      expired: { label: '已過期', variant: 'secondary' }
    };
    if (!status) return { label: '已報名', variant: 'secondary' };
    return statusMap[status] || { label: status, variant: 'secondary' };
  };

  const sanitizeFileName = (name) => {
    return String(name || '')
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, '_')
      .trim();
  };

  const renderPersonalRegistration = (registration) => {
    if (!registration) return <Badge bg="secondary">未報名</Badge>;
    const info = getRegistrationStatusInfo(registration.status);
    return <Badge bg={info.variant}>{info.label}</Badge>;
  };

  // 格式化出席狀態
  const formatAttendance = (attendance) => {
    if (!attendance || Object.keys(attendance).length === 0) {
      return <Badge bg="secondary">未匯入</Badge>;
    }
    
    const lr = attendance.LR;
    const sw = attendance.SW;
    
    if (!lr && !sw) {
      return <Badge bg="secondary">未匯入</Badge>;
    }
    
    return (
      <div>
        {lr && (
          <div className="mb-1">
            <Badge bg={lr.attended ? 'success' : 'danger'}>
              LR: {lr.attended ? '出席' : '缺席'}
            </Badge>
          </div>
        )}
        {sw && (
          <div>
            <Badge bg={sw.attended ? 'success' : 'danger'}>
              SW: {sw.attended ? '出席' : '缺席'}
            </Badge>
          </div>
        )}
      </div>
    );
  };

  // 匯出 BESTEP Excel
  const handleExportBestepExcel = async () => {
    if (exporting) return;
    setExporting(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.append('semester', filters.semester);
      params.append('examType', filters.examType);
      if (filters.search) params.append('search', filters.search);

      const response = await fetch(`/api/admin/classes/${classId}/bestep-overview/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || errorData.message || '匯出失敗');
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');

      const dateStr = new Date().toISOString().split('T')[0];
      const safeClassName = sanitizeFileName(classInfo?.className || 'class');
      a.href = url;
      a.download = `班級參與概況_BESTEP_${safeClassName}_${dateStr}.xlsx`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError('匯出失敗：' + (err.message || err));
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
            <h3 className="mb-0 h5">
              <i className="fas fa-graduation-cap me-2"></i>
              {classInfo?.className || '載入中...'}（{filters.semester}）
            </h3>
            {classInfo?.teacherName && (
              <p className="text-muted mb-0 mt-1">
                <i className="fas fa-chalkboard-teacher me-2"></i>
                {classInfo.teacherName}
              </p>
            )}
          </div>
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
              <Form.Label>考試類型</Form.Label>
              <Form.Select
                value={filters.examType}
                onChange={(e) => handleFilterChange('examType', e.target.value)}
              >
                {EXAM_TYPE_OPTIONS.map(option => (
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
                placeholder="輸入學號或姓名..."
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </Col>
            <Col md={2}>
              <Form.Label>每頁筆數</Form.Label>
              <Form.Select
                value={filters.pageSize}
                onChange={(e) => handleFilterChange('pageSize', parseInt(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* 統計摘要 */}
      {statistics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-primary">{statistics.totalStudents}</h5>
                <p className="mb-0">名冊人數</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-success">{statistics.registeredCount}</h5>
                <p className="mb-0">報名成功</p>
                <small className="text-muted">({statistics.registrationRate}%)</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className="text-info">
                  {statistics.lrAttendedCount} / {statistics.swAttendedCount}
                </h5>
                <p className="mb-0">LR / SW 出席</p>
                <small className="text-muted">
                  ({statistics.lrAttendanceRate}% / {statistics.swAttendanceRate}%)
                </small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h5 className={statistics.passedCount > 0 ? 'text-success' : 'text-muted'}>
                  {statistics.passedCount}
                </h5>
                <p className="mb-0">達標人數</p>
                <small className="text-muted">({statistics.passRate}%)</small>
                {statistics.avgScore && (
                  <div className="mt-1">
                    <small className="text-muted">平均分: {statistics.avgScore}</small>
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* 資料表格 */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
          <h5 className="mb-0">學生 BESTEP 資訊</h5>
          <Button
            variant="outline-success"
            onClick={handleExportBestepExcel}
            disabled={exporting || students.length === 0}
          >
            {exporting ? (
              <>
                <Spinner size="sm" className="me-2" />
                匯出中...
              </>
            ) : (
              <>
                <i className="fas fa-download me-2"></i>
                匯出 BESTEP Excel
              </>
            )}
          </Button>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2">載入中...</p>
            </div>
          ) : students.length === 0 ? (
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
                      <th>報考項目</th>
                      <th>抵免項目</th>
                      <th>個人報名</th>
                      <th>團體報名</th>
                      <th>出席狀況</th>
                      <th>成績</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student, index) => (
                      <tr key={student.studentId || index}>
                        <td>{student.studentId}</td>
                        <td>{student.studentName}</td>
                        <td>{student.department || '-'}</td>
                        <td>
                          {student.personalRegistration?.examTypeLabel
                            || (student.personalRegistration?.examType
                              ? ({
                                  LRSW: '聽讀說寫',
                                  LR: '聽讀',
                                  SW: '說寫',
                                  NON: '不報考'
                                }[student.personalRegistration.examType] || student.personalRegistration.examType)
                              : '—')}
                        </td>
                        <td>{student.personalRegistration?.exemptionType ?? '無'}</td>
                        <td>
                          {renderPersonalRegistration(student.personalRegistration)}
                        </td>
                        <td>
                          {student.groupRegistration ? (
                            <div>
                              <Badge bg="info">{student.groupRegistration.teamName}</Badge>
                              {student.groupRegistration.rank && (
                                <div className="mt-1">
                                  <small className="text-muted">
                                    名次: {student.groupRegistration.rank}
                                    {student.groupRegistration.rewardAmount && 
                                      ` (獎勵: ${student.groupRegistration.rewardAmount}元)`
                                    }
                                  </small>
                                </div>
                              )}
                            </div>
                          ) : (
                            <Badge bg="secondary">無</Badge>
                          )}
                        </td>
                        <td>{formatAttendance(student.attendance)}</td>
                        <td>
                          {student.score ? (
                            <div>
                              <div className="mb-1">
                                <small>
                                  總分: <strong>{student.score.totalScore || '-'}</strong>
                                </small>
                              </div>
                              <div className="mb-1">
                                <small>
                                  L: {formatLevel(student.score.listeningLevel)} / 
                                  R: {formatLevel(student.score.readingLevel)} / 
                                  S: {formatLevel(student.score.speakingLevel)} / 
                                  W: {formatLevel(student.score.writingLevel)}
                                </small>
                              </div>
                              {student.score.passed && (
                                <Badge bg="success">達標</Badge>
                              )}
                            </div>
                          ) : (
                            <Badge bg="secondary">未匯入</Badge>
                          )}
                        </td>
                        <td>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-1"
                            onClick={() => handleShowStudentDetail(student)}
                          >
                            查看詳情
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => navigate(`/admin/analytics/student/${encodeURIComponent(student.studentId)}?fromSemester=${encodeURIComponent(filters.semester)}&toSemester=${encodeURIComponent(filters.semester)}`)}
                          >
                            學生歷程
                          </Button>
                        </td>
                      </tr>
                    ))}
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

      {/* 學生詳細資訊 Modal */}
      <Modal show={showStudentModal} onHide={() => setShowStudentModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedStudent?.studentName} ({selectedStudent?.studentId}) - BESTEP 詳細資訊
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedStudent && (
            <div>
              <Row className="mb-3">
                <Col md={6}>
                  <h6>個人報名</h6>
                  {selectedStudent.personalRegistration ? (
                    <div>
                      <p>狀態: {renderPersonalRegistration(selectedStudent.personalRegistration)}</p>
                      <p>報考項目: {selectedStudent.personalRegistration.examTypeLabel || '—'}</p>
                      <p>抵免項目: {selectedStudent.personalRegistration.exemptionType ?? '無'}</p>
                      <p>報名 ID: {selectedStudent.personalRegistration.regId}</p>
                      <p>更新時間: {new Date(selectedStudent.personalRegistration.updatedAt).toLocaleString('zh-TW')}</p>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="mt-1"
                        onClick={() =>
                          navigate(`/admin/english-test?id=${selectedStudent.personalRegistration.regId}`)
                        }
                      >
                        開啟此筆報名（管理）
                      </Button>
                    </div>
                  ) : (
                    <p className="text-muted">未報名</p>
                  )}
                </Col>
                <Col md={6}>
                  <h6>團體報名</h6>
                  {selectedStudent.groupRegistration ? (
                    <div>
                      <p>隊伍名稱: <Badge bg="info">{selectedStudent.groupRegistration.teamName}</Badge></p>
                      <p>角色: {selectedStudent.groupRegistration.role === 'leader' ? '隊長' : '隊員'}</p>
                      {selectedStudent.groupRegistration.rank && (
                        <>
                          <p>名次: {selectedStudent.groupRegistration.rank}</p>
                          {selectedStudent.groupRegistration.rewardAmount && (
                            <p>獎勵金額: {selectedStudent.groupRegistration.rewardAmount} 元</p>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">無</p>
                  )}
                </Col>
              </Row>

              <Row className="mb-3">
                <Col md={6}>
                  <h6>出席狀況</h6>
                  {selectedStudent.attendance && Object.keys(selectedStudent.attendance).length > 0 ? (
                    <div>
                      {selectedStudent.attendance.LR && (
                        <div className="mb-2">
                          <strong>LR（聽讀）:</strong>
                          <Badge bg={selectedStudent.attendance.LR.attended ? 'success' : 'danger'} className="ms-2">
                            {selectedStudent.attendance.LR.attended ? '出席' : '缺席'}
                          </Badge>
                          <p className="mb-0 mt-1">
                            <small>日期: {selectedStudent.attendance.LR.examDate}</small>
                          </p>
                          {selectedStudent.attendance.LR.absentReason && (
                            <p className="mb-0">
                              <small>缺席原因: {selectedStudent.attendance.LR.absentReason}</small>
                            </p>
                          )}
                        </div>
                      )}
                      {selectedStudent.attendance.SW && (
                        <div>
                          <strong>SW（說寫）:</strong>
                          <Badge bg={selectedStudent.attendance.SW.attended ? 'success' : 'danger'} className="ms-2">
                            {selectedStudent.attendance.SW.attended ? '出席' : '缺席'}
                          </Badge>
                          <p className="mb-0 mt-1">
                            <small>日期: {selectedStudent.attendance.SW.examDate}</small>
                          </p>
                          {selectedStudent.attendance.SW.absentReason && (
                            <p className="mb-0">
                              <small>缺席原因: {selectedStudent.attendance.SW.absentReason}</small>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted">未匯入</p>
                  )}
                </Col>
                <Col md={6}>
                  <h6>成績</h6>
                  {selectedStudent.score ? (
                    <div>
                      <p>總分: <strong>{selectedStudent.score.totalScore || '-'}</strong></p>
                      <p>整體等級: {formatLevel(selectedStudent.score.overallLevel)}</p>
                      <p>達標: {selectedStudent.score.passed ? <Badge bg="success">是</Badge> : <Badge bg="danger">否</Badge>}</p>
                      <hr />
                      <p><strong>各項成績:</strong></p>
                      <p>聽力: {selectedStudent.score.listeningScore || '-'} {formatLevel(selectedStudent.score.listeningLevel)}</p>
                      <p>閱讀: {selectedStudent.score.readingScore || '-'} {formatLevel(selectedStudent.score.readingLevel)}</p>
                      <p>口說: {selectedStudent.score.speakingScore || '-'} {formatLevel(selectedStudent.score.speakingLevel)}</p>
                      <p>寫作: {selectedStudent.score.writingScore || '-'} {formatLevel(selectedStudent.score.writingLevel)}</p>
                    </div>
                  ) : (
                    <p className="text-muted">未匯入</p>
                  )}
                </Col>
              </Row>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStudentModal(false)}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
