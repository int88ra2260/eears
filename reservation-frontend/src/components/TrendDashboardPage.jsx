import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Table, Button, Form, Spinner, Alert } from 'react-bootstrap';
import { SEMESTER_OPTIONS } from '../utils/semesterUtils';
import { handleAPIError } from '../utils/errorHandler';
import { fetchClient } from '../utils/fetchClient';

export default function TrendDashboardPage() {
  const outlet = useOutletContext() || {};
  const token = outlet.token || localStorage.getItem('token');

  const [mode, setMode] = useState('overview'); // overview | student | class
  const [studentId, setStudentId] = useState('');
  const [classId, setClassId] = useState('');
  const [fromSemester, setFromSemester] = useState('113-2');
  const [toSemester, setToSemester] = useState('115-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      let url = '';
      if (mode === 'overview') {
        url = `/api/analytics/trends/overview?fromSemester=${encodeURIComponent(fromSemester)}&toSemester=${encodeURIComponent(toSemester)}`;
      } else if (mode === 'student') {
        if (!studentId.trim()) throw new Error('請輸入學生學號');
        url = `/api/analytics/trends?studentId=${encodeURIComponent(studentId.trim())}&fromSemester=${encodeURIComponent(fromSemester)}&toSemester=${encodeURIComponent(toSemester)}`;
      } else {
        if (!classId.trim()) throw new Error('請輸入班級 ID');
        url = `/api/analytics/trends/classes/${encodeURIComponent(classId.trim())}?fromSemester=${encodeURIComponent(fromSemester)}&toSemester=${encodeURIComponent(toSemester)}`;
      }

      const res = await fetchClient(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
        const msg = json?.error || json?.message || '載入失敗';
        const err = new Error(msg);
        err.requestId = requestId;
        err.status = res.status;
        if (requestId) err.message = `${msg}（錯誤識別碼：${requestId}）`;
        throw err;
      }
      setData(json);
    } catch (e) {
      const errMsg = handleAPIError(e);
      setError(errMsg?.display || errMsg?.zh || '載入失敗');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [token, mode, studentId, classId, fromSemester, toSemester]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-fluid px-2 px-md-3">
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <Form.Group>
              <Form.Label>模式</Form.Label>
              <Form.Select value={mode} onChange={(e) => setMode(e.target.value)}>
                <option value="overview">全校</option>
                <option value="class">班級</option>
                <option value="student">學生</option>
              </Form.Select>
            </Form.Group>
            {mode === 'student' && (
              <Form.Group>
                <Form.Label>Student ID</Form.Label>
                <Form.Control value={studentId} onChange={(e) => setStudentId(e.target.value)} />
              </Form.Group>
            )}
            {mode === 'class' && (
              <Form.Group>
                <Form.Label>Class ID</Form.Label>
                <Form.Control value={classId} onChange={(e) => setClassId(e.target.value)} />
              </Form.Group>
            )}
            <Form.Group>
              <Form.Label>From</Form.Label>
              <Form.Select value={fromSemester} onChange={(e) => setFromSemester(e.target.value)}>
                {SEMESTER_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>To</Form.Label>
              <Form.Select value={toSemester} onChange={(e) => setToSemester(e.target.value)}>
                {SEMESTER_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.value}</option>)}
              </Form.Select>
            </Form.Group>
            <Button onClick={load}>查詢</Button>
          </div>
        </Card.Body>
      </Card>

      {loading && <div className="text-center py-4"><Spinner animation="border" /></div>}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && data && (
        <>
          <Card className="mb-3">
            <Card.Header>趨勢資料</Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table striped hover size="sm" className="mb-0">
                  <thead>
                    <tr>
                      <th>KPI</th>
                      {(data.semesters || []).map((sem) => <th key={sem}>{sem}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(data.metrics || {}).map(([k, arr]) => (
                      <tr key={k}>
                        <td>{k}</td>
                        {(arr || []).map((v, idx) => (
                          <td key={`${k}-${idx}`}>{typeof v === 'object' ? JSON.stringify(v) : v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {data.decisionKpis && (
            <Card>
              <Card.Header>Decision KPIs</Card.Header>
              <Card.Body>
                <div>Participation Improvement Rate: {data.decisionKpis.participationImprovementRate ?? '—'}%</div>
                <div>High Risk Improvement Rate: {data.decisionKpis.highRiskImprovementRate ?? '—'}%</div>
                <div>Teacher Impact Growth: {data.decisionKpis.teacherImpact?.growth ?? '—'}</div>
              </Card.Body>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

