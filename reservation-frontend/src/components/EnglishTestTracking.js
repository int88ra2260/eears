import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Form,
  Alert,
  Row,
  Col,
  Table,
  Spinner,
  Tabs,
  Tab
} from 'react-bootstrap';
import SemesterReportDashboard from './englishTestTracking/SemesterReportDashboard';
import './englishTestTracking/EnglishTestTrackingDashboard.css';

const SKILLS = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];
const SKILL_LABELS = { LISTENING: '聽力', READING: '閱讀', SPEAKING: '口說', WRITING: '寫作' };

function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJSONOrText(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    return { data: await res.json(), isJson: true };
  }
  const text = await res.text();
  return { data: text.length > 4000 ? text.slice(0, 4000) + '... (truncated)' : text, isJson: false };
}

export default function EnglishTestTracking() {
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');
  const [loadingSemesters, setLoadingSemesters] = useState(true);
  const [reportAttainment, setReportAttainment] = useState(null);
  const [reportCount, setReportCount] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState('');

  // 名冊匯入
  const [enrollmentFile, setEnrollmentFile] = useState(null);
  const [enrollmentOverwrite, setEnrollmentOverwrite] = useState(false);
  const [enrollmentUploading, setEnrollmentUploading] = useState(false);
  const [enrollmentResult, setEnrollmentResult] = useState(null);

  // 成績匯入
  const [attemptsFile, setAttemptsFile] = useState(null);
  const [attemptsImportName, setAttemptsImportName] = useState('');
  const [attemptsUploading, setAttemptsUploading] = useState(false);
  const [attemptsResult, setAttemptsResult] = useState(null);

  // 重算
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeResult, setRecomputeResult] = useState(null);

  // 單人查詢
  const [studentQueryId, setStudentQueryId] = useState('');
  const [studentAttempts, setStudentAttempts] = useState(null);
  const [studentBestSkills, setStudentBestSkills] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(false);

  const fetchSemesters = useCallback(async () => {
    setLoadingSemesters(true);
    try {
      const res = await fetch('/api/english-tests/semesters', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSemesters(data);
        if (data.length && !semesterId) setSemesterId(data[0].id || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSemesters(false);
    }
  }, []);

  useEffect(() => {
    fetchSemesters();
  }, [fetchSemesters]);

  const fetchReport = useCallback(async () => {
    if (!semesterId) return;
    setLoadingReport(true);
    setReportAttainment(null);
    setReportCount(null);
    setReportError('');
    try {
      const [attainmentRes, countRes] = await Promise.all([
        fetch(`/api/english-tests/report/semester/${encodeURIComponent(semesterId)}/grade-skill-summary?metric=attainment&threshold=B2&includeTotal=false`, {
          headers: getAuthHeaders()
        }),
        fetch(`/api/english-tests/report/semester/${encodeURIComponent(semesterId)}/grade-skill-summary?metric=count&includeTotal=false`, {
          headers: getAuthHeaders()
        })
      ]);

      const [attainmentParsed, countParsed] = await Promise.all([
        parseJSONOrText(attainmentRes),
        parseJSONOrText(countRes)
      ]);

      if (!attainmentRes.ok || !countRes.ok) {
        const details = [];
        if (!attainmentRes.ok) details.push(`attainment: HTTP ${attainmentRes.status}`);
        if (!countRes.ok) details.push(`count: HTTP ${countRes.status}`);
        setReportError(`無法載入學期報表（${details.join(', ')}）`);
      } else if (!attainmentParsed.isJson || !countParsed.isJson) {
        setReportError('學期報表回傳格式異常（非 JSON），請稍後重試。');
      } else {
        setReportAttainment(attainmentParsed.data);
        setReportCount(countParsed.data);
      }
    } catch (e) {
      console.error(e);
      setReportError(e.message || '學期報表載入失敗');
    } finally {
      setLoadingReport(false);
    }
  }, [semesterId]);

  useEffect(() => {
    if (semesterId) fetchReport();
  }, [semesterId, fetchReport]);

  const handleEnrollmentImport = async () => {
    if (!enrollmentFile || !semesterId) {
      alert('請選擇學期並上傳 Excel');
      return;
    }
    setEnrollmentUploading(true);
    setEnrollmentResult(null);
    try {
      const formData = new FormData();
      formData.append('file', enrollmentFile);
      formData.append('semesterId', semesterId);
      formData.append('overwriteWithThisSheet', enrollmentOverwrite);
      const res = await fetch('/api/english-tests/enrollment/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const parsed = await parseJSONOrText(res);
      const data = parsed.data && parsed.isJson ? parsed.data : { error: `HTTP ${res.status}` };
      if (parsed.isJson) setEnrollmentResult(data);
      else setEnrollmentResult({ error: data.error, raw: parsed.data });
      if (res.ok) {
        setEnrollmentFile(null);
        fetchSemesters();
        fetchReport();
      }
    } catch (e) {
      setEnrollmentResult({ error: e.message });
    } finally {
      setEnrollmentUploading(false);
    }
  };

  const handleAttemptsImport = async () => {
    if (!attemptsFile) {
      alert('請選擇成績 Excel');
      return;
    }
    if (!attemptsImportName.trim()) {
      alert('請填寫本次匯入名稱');
      return;
    }
    setAttemptsUploading(true);
    setAttemptsResult(null);
    try {
      const formData = new FormData();
      formData.append('file', attemptsFile);
      formData.append('semesterId', semesterId);
      formData.append('treatDuplicateAs', 'replace');
      formData.append('importName', attemptsImportName.trim());
      const res = await fetch('/api/english-tests/attempts/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData
      });
      const parsed = await parseJSONOrText(res);
      if (parsed.isJson) setAttemptsResult(parsed.data);
      else setAttemptsResult({ error: `HTTP ${res.status}`, raw: parsed.data });
      if (res.ok) {
        setAttemptsFile(null);
        setAttemptsImportName('');
      }
    } catch (e) {
      setAttemptsResult({ error: e.message });
    } finally {
      setAttemptsUploading(false);
    }
  };

  const handleRecompute = async () => {
    if (!semesterId) return;
    setRecomputing(true);
    setRecomputeResult(null);
    try {
      const res = await fetch('/api/english-tests/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ semesterId, fullRecompute: true })
      });
      const parsed = await parseJSONOrText(res);
      if (parsed.isJson) {
        setRecomputeResult(parsed.data);
      } else {
        setRecomputeResult({
          error: `HTTP ${res.status}：非 JSON 回應（可能是 502/HTML 錯誤頁）。`,
          raw: parsed.data
        });
      }
      if (res.ok) fetchReport();
    } catch (e) {
      setRecomputeResult({ error: e.message });
    } finally {
      setRecomputing(false);
    }
  };

  const queryStudent = async () => {
    const id = studentQueryId.trim();
    if (!id) return;
    setLoadingStudent(true);
    setStudentAttempts(null);
    setStudentBestSkills(null);
    try {
      const [attemptsRes, bestRes] = await Promise.all([
        fetch(`/api/english-tests/student/${encodeURIComponent(id)}/attempts`, { headers: getAuthHeaders() }),
        fetch(`/api/english-tests/student/${encodeURIComponent(id)}/best-skills?semesterId=${encodeURIComponent(semesterId || '')}`, { headers: getAuthHeaders() })
      ]);
      if (attemptsRes.ok) {
        const parsed = await parseJSONOrText(attemptsRes);
        if (parsed.isJson) setStudentAttempts(parsed.data);
      }
      if (bestRes.ok) {
        const parsed = await parseJSONOrText(bestRes);
        if (parsed.isJson) setStudentBestSkills(parsed.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStudent(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <p className="text-muted small mb-3">依學期檢視全校英檢成績長期趨勢。</p>

      <Row>
        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label>學期</Form.Label>
            {semesters.length > 0 ? (
              <Form.Select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                disabled={loadingSemesters}
              >
                <option value="">請選擇</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.id}</option>
                ))}
              </Form.Select>
            ) : (
              <Form.Control
                type="text"
                disabled={loadingSemesters}
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                placeholder="輸入學期代碼（如 114-1）"
              />
            )}
          </Form.Group>
          {semesters.length === 0 && !loadingSemesters && (
            <div className="text-muted small mb-2">
              目前尚未建立任何學期資料。請手動輸入學期代碼（後端會於匯入名冊時自動建立）。
            </div>
          )}
        </Col>
        <Col md={4}>
          <Form.Group className="mb-2">
            <Form.Label>報表條件</Form.Label>
            <Form.Control value="B2(含)以上達標統計" disabled readOnly />
          </Form.Group>
        </Col>
        <Col md={2} />
        <Col md={2} className="d-flex align-items-end">
          <Button variant="outline-primary" size="sm" onClick={fetchReport} disabled={loadingReport || !semesterId}>
            {loadingReport ? <Spinner animation="border" size="sm" /> : '重新載入報表'}
          </Button>
        </Col>
      </Row>

      <Tabs defaultActiveKey="report" className="mb-3">
        <Tab eventKey="report" title="學期報表">
          <div className="tracking-dashboard">
            <SemesterReportDashboard
              attainmentReport={reportAttainment}
              countReport={reportCount}
              loading={loadingReport}
              error={reportError}
              onReload={fetchReport}
            />
          </div>
        </Tab>

        <Tab eventKey="import" title="匯入">
          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header>學期在學名冊匯入</Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2">
                    <Form.Label>學期</Form.Label>
                    {semesters.length > 0 ? (
                      <Form.Select
                        value={semesterId}
                        onChange={(e) => setSemesterId(e.target.value)}
                        disabled={loadingSemesters}
                      >
                        <option value="">請選擇</option>
                        {semesters.map((s) => (
                          <option key={s.id} value={s.id}>{s.id}</option>
                        ))}
                      </Form.Select>
                    ) : (
                      <Form.Control
                        type="text"
                        disabled={loadingSemesters}
                        value={semesterId}
                        onChange={(e) => setSemesterId(e.target.value)}
                        placeholder="輸入學期代碼（如 114-1）"
                      />
                    )}
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setEnrollmentFile(e.target.files?.[0] || null)}
                    />
                  </Form.Group>
                  <Form.Check
                    type="checkbox"
                    label="以本次名冊覆蓋（未出現者設為不納入統計）"
                    checked={enrollmentOverwrite}
                    onChange={(e) => setEnrollmentOverwrite(e.target.checked)}
                    className="mb-2"
                  />
                  <Button variant="primary" onClick={handleEnrollmentImport} disabled={enrollmentUploading || !enrollmentFile}>
                    {enrollmentUploading ? <Spinner animation="border" size="sm" /> : '上傳名冊'}
                  </Button>
                  {enrollmentResult && (
                    <div className="mt-2">
                      {enrollmentResult.error && <Alert variant="danger">{enrollmentResult.error}</Alert>}
                      {enrollmentResult.imported != null && (
                        <Alert variant="info">
                          新增 {enrollmentResult.imported}、更新 {enrollmentResult.updated}、略過 {enrollmentResult.skipped}
                          {enrollmentResult.errors?.length > 0 && `，錯誤 ${enrollmentResult.errors.length} 筆`}
                        </Alert>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header>成績 Excel 匯入</Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2">
                    <Form.Label>匯入名稱</Form.Label>
                    <Form.Control
                      type="text"
                      value={attemptsImportName}
                      onChange={(e) => setAttemptsImportName(e.target.value)}
                      placeholder="例如：114-2培力成績匯入"
                      maxLength={120}
                    />
                    <div className="text-muted small mt-1">將作為後續歷程追蹤的節點名稱。</div>
                  </Form.Group>
                  <Form.Group className="mb-2">
                    <Form.Control
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => setAttemptsFile(e.target.files?.[0] || null)}
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    onClick={handleAttemptsImport}
                    disabled={attemptsUploading || !attemptsFile || !attemptsImportName.trim()}
                  >
                    {attemptsUploading ? <Spinner animation="border" size="sm" /> : '上傳成績'}
                  </Button>
                  {attemptsResult && (
                    <div className="mt-2">
                      {attemptsResult.error && <Alert variant="danger">{attemptsResult.error}</Alert>}
                      {attemptsResult.imported != null && (
                        <Alert variant="info">
                          匯入 {attemptsResult.imported} 筆、略過 {attemptsResult.skipped}
                          {attemptsResult.importBatchId && <small className="d-block">Batch: {attemptsResult.importBatchId}</small>}
                        </Alert>
                      )}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Card>
            <Card.Header>重算最佳成績</Card.Header>
            <Card.Body>
              <p className="text-muted small">依選定學期，以在學名冊為準重算各年級×各能力最佳成績。</p>
              <Button variant="secondary" onClick={handleRecompute} disabled={recomputing || !semesterId}>
                {recomputing ? <Spinner animation="border" size="sm" /> : '全量重算'}
              </Button>
              {recomputeResult && (
                <Alert className="mt-2" variant={recomputeResult.error ? 'danger' : 'success'}>
                  {recomputeResult.error || `已處理 ${recomputeResult.studentsProcessed} 人，更新 ${recomputeResult.recomputed} 筆最佳成績`}
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="student" title="單人查詢">
          <Card>
            <Card.Body>
              <Row className="align-items-end">
                <Col md={4}>
                  <Form.Label>學號</Form.Label>
                  <Form.Control
                    value={studentQueryId}
                    onChange={(e) => setStudentQueryId(e.target.value)}
                    placeholder="輸入學號"
                  />
                </Col>
                <Col>
                  <Button variant="primary" onClick={queryStudent} disabled={loadingStudent || !studentQueryId.trim()}>
                    {loadingStudent ? <Spinner animation="border" size="sm" /> : '查詢'}
                  </Button>
                </Col>
              </Row>
              {studentAttempts && (
                <div className="mt-3">
                  <h6>原始成績 attempts</h6>
                  <Table size="sm" bordered>
                    <thead><tr><th>日期</th><th>測驗類型</th><th>聽</th><th>讀</th><th>說</th><th>寫</th></tr></thead>
                    <tbody>
                      {studentAttempts.attempts.map((a) => {
                        const scores = (a.scores || []).reduce((acc, s) => { acc[s.skill] = s; return acc; }, {});
                        return (
                          <tr key={a.id}>
                            <td>{a.testDate}</td>
                            <td>{a.testType}</td>
                            {SKILLS.map((sk) => {
                              const s = scores[sk];
                              return <td key={sk}>{s ? `${s.rawScore ?? '-'} ${s.cefr ?? ''}` : '-'}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
              {studentBestSkills && studentBestSkills.bestSkills?.length > 0 && (
                <div className="mt-3">
                  <h6>四項最佳與來源</h6>
                  <Table size="sm" bordered>
                    <thead><tr><th>能力</th><th>分數</th><th>CEFR</th><th>來源 attemptId</th><th>測驗日期</th></tr></thead>
                    <tbody>
                      {studentBestSkills.bestSkills.map((b) => (
                        <tr key={`${b.semesterId}-${b.skill}`}>
                          <td>{SKILL_LABELS[b.skill]}</td>
                          <td>{b.rawScore ?? '-'}</td>
                          <td>{b.cefr ?? '-'}</td>
                          <td>{b.attemptId}</td>
                          <td>{b.bestAttempt?.testDate ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

    </div>
  );
}
