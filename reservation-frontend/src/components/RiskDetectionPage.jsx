import React, { useCallback, useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { Card, Table, Button, Spinner, Alert, Form, Badge } from 'react-bootstrap';
import { getCurrentSemester, SEMESTER_OPTIONS } from '../utils/semesterUtils';
import { handleAPIError } from '../utils/errorHandler';
import { fetchClient } from '../utils/fetchClient';

const RISK_LABEL = { low: '低', medium: '中', high: '高' };

export default function RiskDetectionPage() {
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const token = outlet.token || localStorage.getItem('token');

  const [semester, setSemester] = useState(getCurrentSemester() || '114-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [risks, setRisks] = useState([]);

  const load = useCallback(async () => {
    if (!token || !semester) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchClient(`/api/analytics/risk?semester=${encodeURIComponent(semester)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      setRisks(json.risks || []);
    } catch (e) {
      const errMsg = handleAPIError(e);
      setError(errMsg?.display || errMsg?.zh || '載入失敗');
      setRisks([]);
    } finally {
      setLoading(false);
    }
  }, [token, semester]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-fluid px-2 px-md-3">
      <div className="d-flex justify-content-end align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ width: 180 }}>
            {SEMESTER_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Form.Select>
          <Button variant="outline-secondary" size="sm" onClick={() => navigate('/admin/analytics/overview')}>
            返回行政總覽
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>高風險學生清單（riskLevel=high）</div>
            <div className="small text-muted">semester：{semester}，筆數：{risks.length}</div>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <Table striped hover size="sm" className="mb-0">
                <thead>
                  <tr>
                    <th>學號</th>
                    <th>riskScore</th>
                    <th>riskLevel</th>
                    <th>原因</th>
                  </tr>
                </thead>
                <tbody>
                  {risks.map((r) => (
                    <tr key={r.studentId}>
                      <td>{r.studentId}</td>
                      <td>{r.riskScore}</td>
                      <td>
                        <Badge bg="danger">{RISK_LABEL[r.riskLevel] || r.riskLevel}</Badge>
                      </td>
                      <td className="small">
                        {(r.reasons || []).length > 0 ? (
                          <ul className="mb-0 ps-3">
                            {r.reasons.map((reason, idx) => (
                              <li key={`${r.studentId}-${reason.key}-${idx}`}>
                                {reason.label}（value: {reason.value}, +{reason.contribution}）
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                  {risks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted">沒有高風險資料</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}

