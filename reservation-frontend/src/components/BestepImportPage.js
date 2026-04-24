// src/components/BestepImportPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  Button, 
  Form, 
  Alert, 
  Spinner, 
  Row, 
  Col,
  Tabs,
  Tab
} from 'react-bootstrap';
import { handleAPIError } from '../utils/errorHandler';

const SEMESTER_OPTIONS = [
  { value: '114-1', label: '114-1學期' },
  { value: '113-2', label: '113-2學期' },
  { value: '114-2', label: '114-2學期' },
  { value: '115-1', label: '115-1學期' },
  { value: '115-2', label: '115-2學期' }
];

export default function BestepImportPage() {
  const navigate = useNavigate();
  
  // 出席資料匯入
  const [attendanceData, setAttendanceData] = useState({
    semester: '114-1',
    examType: 'LR',
    examDate: '',
    file: null
  });
  const [attendanceUploading, setAttendanceUploading] = useState(false);
  const [attendanceResult, setAttendanceResult] = useState(null);
  const [attendanceError, setAttendanceError] = useState('');

  // 成績資料匯入
  const [scoreData, setScoreData] = useState({
    semester: '114-1',
    file: null
  });
  const [scoreUploading, setScoreUploading] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [scoreError, setScoreError] = useState('');

  // 團體名次計算
  const [rankingData, setRankingData] = useState({
    semester: '114-1'
  });
  const [rankingCalculating, setRankingCalculating] = useState(false);
  const [rankingResult, setRankingResult] = useState(null);
  const [rankingError, setRankingError] = useState('');

  // 匯入出席資料
  const handleAttendanceImport = async () => {
    if (!attendanceData.file) {
      setAttendanceError('請選擇檔案');
      return;
    }

    if (!attendanceData.examDate) {
      setAttendanceError('請輸入考試日期');
      return;
    }

    setAttendanceUploading(true);
    setAttendanceError('');
    setAttendanceResult(null);

    try {
      const formData = new FormData();
      formData.append('file', attendanceData.file);
      formData.append('semester', attendanceData.semester);
      formData.append('examType', attendanceData.examType);
      formData.append('examDate', attendanceData.examDate);

      const response = await fetch('/api/admin/bestep/attendance/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setAttendanceResult(result);
        setAttendanceData(prev => ({ ...prev, file: null }));
      } else {
        setAttendanceError(result.error || '匯入失敗');
      }
    } catch (err) {
      setAttendanceError(handleAPIError(err));
    } finally {
      setAttendanceUploading(false);
    }
  };

  // 匯入成績資料
  const handleScoreImport = async () => {
    if (!scoreData.file) {
      setScoreError('請選擇檔案');
      return;
    }

    setScoreUploading(true);
    setScoreError('');
    setScoreResult(null);

    try {
      const formData = new FormData();
      formData.append('file', scoreData.file);
      formData.append('semester', scoreData.semester);

      const response = await fetch('/api/admin/bestep/scores/import', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      const result = await response.json();

      if (response.ok) {
        setScoreResult(result);
        setScoreData(prev => ({ ...prev, file: null }));
      } else {
        setScoreError(result.error || '匯入失敗');
      }
    } catch (err) {
      setScoreError(handleAPIError(err));
    } finally {
      setScoreUploading(false);
    }
  };

  // 計算團體名次
  const handleCalculateRanking = async () => {
    setRankingCalculating(true);
    setRankingError('');
    setRankingResult(null);

    try {
      const response = await fetch('/api/admin/bestep/teams/calculate-ranking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          semester: rankingData.semester
        })
      });

      const result = await response.json();

      if (response.ok) {
        setRankingResult(result);
      } else {
        setRankingError(result.error || '計算失敗');
      }
    } catch (err) {
      setRankingError(handleAPIError(err));
    } finally {
      setRankingCalculating(false);
    }
  };

  // 下載錯誤報表
  const handleDownloadErrorReport = (errorFileUrl) => {
    if (errorFileUrl) {
      window.open(errorFileUrl, '_blank');
    }
  };

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <p className="text-muted small mb-0">
          <i className="fas fa-file-upload me-2" aria-hidden="true"></i>
          由 Excel 匯入 LR（聽讀）、SW（說寫）等 BESTEP 出席資料。
        </p>
        <Button 
          variant="outline-secondary" 
          onClick={() => navigate('/admin/classes')}
        >
          <i className="fas fa-arrow-left me-2"></i>
          返回
        </Button>
      </div>

      <Tabs defaultActiveKey="attendance" className="mb-4">
        {/* 出席資料匯入 */}
        <Tab eventKey="attendance" title="出席資料匯入">
          <Card>
            <Card.Header>
              <h5>匯入出席資料</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <strong>說明：</strong>
                <ul className="mb-0 mt-2">
                  <li>請分別匯入 LR（聽讀）和 SW（說寫）兩場考試的出席資料</li>
                  <li>檔案格式：Excel (.xlsx, .xls)</li>
                  <li>必須包含欄位：學號、姓名、出席狀態</li>
                  <li>系統會自動識別欄位名稱（支援中英文）</li>
                  <li>只有「報名成功」（status='success'）的學生才會被匯入</li>
                </ul>
              </Alert>

              <Row className="g-3">
                <Col md={3}>
                  <Form.Label>學期 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={attendanceData.semester}
                    onChange={(e) => setAttendanceData(prev => ({ ...prev, semester: e.target.value }))}
                  >
                    {SEMESTER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>考試類型 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={attendanceData.examType}
                    onChange={(e) => setAttendanceData(prev => ({ ...prev, examType: e.target.value }))}
                  >
                    <option value="LR">LR（聽讀）</option>
                    <option value="SW">SW（說寫）</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>考試日期 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="date"
                    value={attendanceData.examDate}
                    onChange={(e) => setAttendanceData(prev => ({ ...prev, examDate: e.target.value }))}
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>選擇檔案 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setAttendanceData(prev => ({ ...prev, file: e.target.files[0] }))}
                  />
                </Col>
              </Row>

              {attendanceError && (
                <Alert variant="danger" className="mt-3">
                  {attendanceError}
                </Alert>
              )}

              {attendanceResult && (
                <Alert variant={attendanceResult.success ? 'success' : 'warning'} className="mt-3">
                  <h6>匯入結果</h6>
                  <ul className="mb-0">
                    <li>成功匯入: {attendanceResult.imported} 筆</li>
                    <li>跳過: {attendanceResult.skipped} 筆</li>
                    {attendanceResult.errors && attendanceResult.errors.length > 0 && (
                      <li>錯誤: {attendanceResult.errors.length} 筆</li>
                    )}
                  </ul>
                  {attendanceResult.errorFileUrl && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleDownloadErrorReport(attendanceResult.errorFileUrl)}
                    >
                      <i className="fas fa-download me-2"></i>
                      下載錯誤報表
                    </Button>
                  )}
                </Alert>
              )}

              <div className="mt-3">
                <Button
                  variant="primary"
                  onClick={handleAttendanceImport}
                  disabled={attendanceUploading || !attendanceData.file || !attendanceData.examDate}
                >
                  {attendanceUploading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      匯入中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>
                      開始匯入
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        {/* 成績資料匯入 */}
        <Tab eventKey="scores" title="成績資料匯入">
          <Card>
            <Card.Header>
              <h5>匯入成績資料</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <strong>說明：</strong>
                <ul className="mb-0 mt-2">
                  <li>檔案格式：Excel (.xlsx, .xls)</li>
                  <li>必須包含欄位：學號、姓名、聽力分數、閱讀分數、口說分數、寫作分數、各項 CEFR 等級</li>
                  <li>系統會自動識別欄位名稱（支援多種變體）</li>
                  <li>系統會自動計算總分、整體等級和達標狀態</li>
                  <li>只有「報名成功」（status='success'）的學生才會被匯入</li>
                </ul>
              </Alert>

              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>學期 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={scoreData.semester}
                    onChange={(e) => setScoreData(prev => ({ ...prev, semester: e.target.value }))}
                  >
                    {SEMESTER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={8}>
                  <Form.Label>選擇檔案 <span className="text-danger">*</span></Form.Label>
                  <Form.Control
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setScoreData(prev => ({ ...prev, file: e.target.files[0] }))}
                  />
                </Col>
              </Row>

              {scoreError && (
                <Alert variant="danger" className="mt-3">
                  {scoreError}
                </Alert>
              )}

              {scoreResult && (
                <Alert variant={scoreResult.success ? 'success' : 'warning'} className="mt-3">
                  <h6>匯入結果</h6>
                  <ul className="mb-0">
                    <li>成功匯入: {scoreResult.imported} 筆</li>
                    <li>跳過: {scoreResult.skipped} 筆</li>
                    {scoreResult.errors && scoreResult.errors.length > 0 && (
                      <li>錯誤: {scoreResult.errors.length} 筆</li>
                    )}
                  </ul>
                  {scoreResult.errorFileUrl && (
                    <Button
                      variant="outline-danger"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleDownloadErrorReport(scoreResult.errorFileUrl)}
                    >
                      <i className="fas fa-download me-2"></i>
                      下載錯誤報表
                    </Button>
                  )}
                </Alert>
              )}

              <div className="mt-3">
                <Button
                  variant="primary"
                  onClick={handleScoreImport}
                  disabled={scoreUploading || !scoreData.file}
                >
                  {scoreUploading ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      匯入中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>
                      開始匯入
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        {/* 團體名次計算 */}
        <Tab eventKey="ranking" title="團體名次計算">
          <Card>
            <Card.Header>
              <h5>計算團體名次</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="info">
                <strong>說明：</strong>
                <ul className="mb-0 mt-2">
                  <li>根據團體成員的平均分數計算名次</li>
                  <li>支援並列名次（分數相同者視為同一名次）</li>
                  <li>名次並列時，其後名次會跳過並列數量</li>
                  <li>系統會自動計算獎勵金額</li>
                  <li>只有已匯入成績的團體才會被計算</li>
                </ul>
              </Alert>

              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>學期 <span className="text-danger">*</span></Form.Label>
                  <Form.Select
                    value={rankingData.semester}
                    onChange={(e) => setRankingData(prev => ({ ...prev, semester: e.target.value }))}
                  >
                    {SEMESTER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Row>

              {rankingError && (
                <Alert variant="danger" className="mt-3">
                  {rankingError}
                </Alert>
              )}

              {rankingResult && (
                <Alert variant="success" className="mt-3">
                  <h6>計算結果</h6>
                  <p>已計算 {rankingResult.teams?.length || 0} 個團體的名次</p>
                  <p>計算時間: {new Date(rankingResult.calculatedAt).toLocaleString('zh-TW')}</p>
                </Alert>
              )}

              <div className="mt-3">
                <Button
                  variant="primary"
                  onClick={handleCalculateRanking}
                  disabled={rankingCalculating}
                >
                  {rankingCalculating ? (
                    <>
                      <Spinner size="sm" className="me-2" />
                      計算中...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-calculator me-2"></i>
                      開始計算
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}
