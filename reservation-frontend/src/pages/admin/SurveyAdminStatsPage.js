import React, { useEffect, useState, useMemo } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Spinner from 'react-bootstrap/Spinner';
import Alert from 'react-bootstrap/Alert';
import { buildAccessProfile, hasPermission } from '../../utils/accessControl';
import { P } from '../../constants/permissions';

export default function SurveyAdminStatsPage() {
  const { surveyId } = useParams();
  const { token, userRole, accessProfile: ctxProfile } = useOutletContext();
  const accessProfile = ctxProfile || buildAccessProfile(token || '', userRole || '');
  const canView = hasPermission(accessProfile, P.CAN_VIEW_SURVEY_ANALYTICS);

  const [summary, setSummary] = useState(null);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const headers = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'X-User-Role': accessProfile.role || 'worker',
    }),
    [token, accessProfile.role]
  );

  useEffect(() => {
    if (!token || !canView) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [sRes, qRes] = await Promise.all([
          fetch(`/api/admin/surveys/${surveyId}/analytics/summary`, { headers }),
          fetch(`/api/admin/surveys/${surveyId}/analytics/questions`, { headers }),
        ]);
        const sJson = await sRes.json().catch(() => ({}));
        const qJson = await qRes.json().catch(() => ({}));
        if (!sRes.ok) throw new Error(sJson.error || '摘要載入失敗');
        if (!qRes.ok) throw new Error(qJson.error || '題目統計載入失敗');
        if (!cancelled) {
          setSummary(sJson);
          setQuestions(qJson);
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, canView, surveyId, headers]);

  if (!canView) {
    return (
      <div className="container py-4">
        <Alert variant="warning">無權限檢視問卷統計。</Alert>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="mb-3">
        <Link to="/admin/survey-module">← 問卷模組總覽</Link>
      </div>
      <h2 className="h4 text-primary mb-3">問卷統計（survey #{surveyId}）</h2>
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      )}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && summary && (
        <div className="row g-3">
          <div className="col-md-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <Card.Title className="h6 text-muted">總回答數</Card.Title>
                <p className="display-6 mb-0 text-primary">{summary.totalResponses}</p>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <Card.Title className="h6 text-muted">近 7 天</Card.Title>
                <p className="display-6 mb-0 text-primary">{summary.last7Days}</p>
              </Card.Body>
            </Card>
          </div>
          <div className="col-md-4">
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <Card.Title className="h6 text-muted">備註</Card.Title>
                <p className="small mb-0 text-muted">{summary.completionRateNote}</p>
              </Card.Body>
            </Card>
          </div>
        </div>
      )}
      {!loading && !error && questions?.questions?.length > 0 && (
        <Card className="border-0 shadow-sm mt-4">
          <Card.Header className="bg-white fw-semibold">選項／量表分布</Card.Header>
          <Card.Body>
            <ul className="list-unstyled mb-0 small">
              {questions.questions.map((q) => (
                <li key={q.id} className="mb-3">
                  <div className="fw-semibold">{q.label}</div>
                  <pre className="bg-light p-2 rounded small mb-0">{JSON.stringify(q.distribution, null, 0)}</pre>
                </li>
              ))}
            </ul>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
