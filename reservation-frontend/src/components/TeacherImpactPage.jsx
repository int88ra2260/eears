import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Form, Button, Spinner, Alert } from 'react-bootstrap';
import { SEMESTER_OPTIONS } from '../utils/semesterUtils';
import { handleAPIError } from '../utils/errorHandler';
import { fetchClient } from '../utils/fetchClient';

export default function TeacherImpactPage() {
  const outlet = useOutletContext() || {};
  const token = outlet.token || localStorage.getItem('token');

  const [fromSemester, setFromSemester] = useState('113-2');
  const [toSemester, setToSemester] = useState('115-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [impact, setImpact] = useState(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchClient(
        `/api/analytics/trends/overview?fromSemester=${encodeURIComponent(fromSemester)}&toSemester=${encodeURIComponent(toSemester)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
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
      setImpact(json.decisionKpis?.teacherImpact || null);
    } catch (e) {
      const errMsg = handleAPIError(e);
      setError(errMsg?.display || errMsg?.zh || '載入失敗');
      setImpact(null);
    } finally {
      setLoading(false);
    }
  }, [token, fromSemester, toSemester]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-fluid px-2 px-md-3">
      <Card className="mb-3">
        <Card.Body>
          <div className="d-flex gap-2 flex-wrap align-items-end">
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
            <Button onClick={load}>更新</Button>
          </div>
        </Card.Body>
      </Card>

      {loading && <div className="text-center py-4"><Spinner animation="border" /></div>}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && impact && (
        <Card>
          <Card.Header>教師影響力（全校平均教學分數成長）</Card.Header>
          <Card.Body>
            <div>Previous Semester: {impact.previousSemester}</div>
            <div>Current Semester: {impact.currentSemester}</div>
            <div>Previous Avg Teaching Score: {impact.previousAvgTeachingScore}</div>
            <div>Current Avg Teaching Score: {impact.currentAvgTeachingScore}</div>
            <div className="fw-semibold">Growth: {impact.growth}</div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

