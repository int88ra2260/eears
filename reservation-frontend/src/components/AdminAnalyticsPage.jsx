import React, { useCallback, useEffect, useState } from 'react';
import { Card, Table, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { useOutletContext } from 'react-router-dom';
import { getCurrentSemester, SEMESTER_OPTIONS } from '../utils/semesterUtils';
import { handleAPIError } from '../utils/errorHandler';
import { fetchClient } from '../utils/fetchClient';

export default function AdminAnalyticsPage() {
  const outlet = useOutletContext() || {};
  const token = outlet.token || localStorage.getItem('token');
  const [semester, setSemester] = useState(getCurrentSemester() || '114-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetchClient(`/api/analytics/overview?semester=${encodeURIComponent(semester)}`, {
        headers: { Authorization: `Bearer ${token || ''}` }
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
      setData(json);
    } catch (e) {
      const errMsg = handleAPIError(e);
      setError(errMsg?.display || errMsg?.zh || '載入失敗');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [semester, token]);

  useEffect(() => {
    load();
  }, [load]);

  const riskCounts = data?.distribution?.riskLevelCounts || { low: 0, medium: 0, high: 0 };
  const top10 = data?.top10Classes || [];
  const highRiskClasses = data?.highRiskClasses || [];

  return (
    <div className="container-fluid px-2 px-md-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <h2 className="h5 mb-0">行政總覽</h2>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ width: 180 }}>
            {SEMESTER_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Form.Select>
          <Button variant="outline-secondary" size="sm" onClick={() => load()}>
            重新整理
          </Button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}

      {!loading && data && (
        <>
          <div className="row g-3 mb-3">
            <KpiCard title="全校參與率" value={`${data.participationRate ?? 0}%`} />
            <KpiCard title="全校平均參與次數" value={`${data.avgParticipationCount ?? 0}`} />
            <KpiCard title="全校通過率" value={`${data.bestepPassRate ?? 0}%`} />
            <KpiCard title="高風險學生數" value={`${data.highRiskStudentCount ?? 0}`} borderDanger />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <Card className="h-100">
                <Card.Header>風險分布（依風險等級）</Card.Header>
                <Card.Body>
                  <Table striped hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>風險等級</th>
                        <th>人數</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>低</td><td>{riskCounts.low}</td></tr>
                      <tr><td>中</td><td>{riskCounts.medium}</td></tr>
                      <tr><td>高</td><td>{riskCounts.high}</td></tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>

            <div className="col-12 col-lg-6">
              <Card className="h-100">
                <Card.Header>問卷交叉分析（有填 / 未填）</Card.Header>
                <Card.Body>
                  <Table striped hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th></th>
                        <th>平均參與次數</th>
                        <th>平均分數</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>有填問卷</td>
                        <td>{data.surveyCrossAnalysis?.withSurvey?.avgParticipation ?? '—'}</td>
                        <td>{data.surveyCrossAnalysis?.withSurvey?.avgScore ?? '—'}</td>
                      </tr>
                      <tr>
                        <td>未填問卷</td>
                        <td>{data.surveyCrossAnalysis?.withoutSurvey?.avgParticipation ?? '—'}</td>
                        <td>{data.surveyCrossAnalysis?.withoutSurvey?.avgScore ?? '—'}</td>
                      </tr>
                    </tbody>
                  </Table>
                  <div className="text-muted small mt-2">
                    avgScore 取自該學期最佳培力英檢總分（有分數才會計入）。
                  </div>
                </Card.Body>
              </Card>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <Card className="h-100">
                <Card.Header>班級排行榜（Top 10）</Card.Header>
                <Card.Body>
                  <Table striped hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>班級</th>
                        <th>高風險學生數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top10.map((c) => (
                        <tr key={c.classId}>
                          <td>{c.className || c.classId}</td>
                          <td>{c.riskStudentCount}</td>
                        </tr>
                      ))}
                      {top10.length === 0 && (
                        <tr><td colSpan={2} className="text-center text-muted">沒有資料</td></tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>

            <div className="col-12 col-lg-6">
              <Card className="h-100">
                <Card.Header>高風險班級列表</Card.Header>
                <Card.Body>
                  <Table striped hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>班級</th>
                        <th>高風險學生數</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highRiskClasses.map((c) => (
                        <tr key={c.classId}>
                          <td>{c.className || c.classId}</td>
                          <td>{c.riskStudentCount}</td>
                        </tr>
                      ))}
                      {highRiskClasses.length === 0 && (
                        <tr><td colSpan={2} className="text-center text-muted">沒有資料</td></tr>
                      )}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </div>
          </div>

          <Card>
            <Card.Header>分群概況（依年級 / 系所）</Card.Header>
            <Card.Body>
              <div className="row g-3">
                <div className="col-12 col-lg-6">
                  <h6 className="mb-2">by grade</h6>
                  <Table striped hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>年級</th>
                        <th>總人數</th>
                        <th>高風險</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.byGrade || []).map((g) => (
                        <tr key={g.grade}>
                          <td>{g.grade}</td>
                          <td>{g.totalStudents}</td>
                          <td>{g.highRiskStudentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
                <div className="col-12 col-lg-6">
                  <h6 className="mb-2">by department</h6>
                  <Table striped hover size="sm" className="mb-0">
                    <thead>
                      <tr>
                        <th>系所</th>
                        <th>總人數</th>
                        <th>高風險</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.byDepartment || []).map((d) => (
                        <tr key={d.department}>
                          <td>{d.department}</td>
                          <td>{d.totalStudents}</td>
                          <td>{d.highRiskStudentCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}
    </div>
  );
}

function KpiCard({ title, value, borderDanger }) {
  return (
    <div className="col-12 col-md-3">
      <Card className={`h-100 ${borderDanger ? 'border border-danger' : ''}`}>
        <Card.Body>
          <div className="text-muted small">{title}</div>
          <div className="fs-4 fw-semibold">{value}</div>
        </Card.Body>
      </Card>
    </div>
  );
}

