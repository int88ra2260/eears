import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import useToast from '../../components/ui/useToast';

export default function AdminSurveyDataHealthPage() {
  const { token } = useOutletContext();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [problems, setProblems] = useState(null);
  const [rules, setRules] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runDetail, setRunDetail] = useState({ show: false, data: null });
  const [confirm, setConfirm] = useState({ show: false, type: '' });
  const [executeMode, setExecuteMode] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [a, b, c, d, e] = await Promise.all([
        fetch('/api/admin/surveys/health/overview', { headers }),
        fetch('/api/admin/surveys/health/problems', { headers }),
        fetch('/api/admin/surveys/health/rules', { headers }),
        fetch('/api/admin/surveys/health/readiness', { headers }),
        fetch('/api/admin/surveys/health/recent-runs', { headers }),
      ]);
      const [oa, ob, oc, od, oe] = await Promise.all([a.json(), b.json(), c.json(), d.json(), e.json()]);
      if (!a.ok || !b.ok || !c.ok || !d.ok || !e.ok) throw new Error('health API 載入失敗');
      setOverview(oa);
      setProblems(ob);
      setRules(oc);
      setReadiness(od);
      setRuns(Array.isArray(oe) ? oe : []);
    } catch (e) {
      toast.danger(e.message || 'health 載入失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const runRecheck = async (type) => {
    try {
      const endpoint = executeMode
        ? `/api/admin/surveys/repairs/execute/${type}`
        : `/api/admin/surveys/repairs/preview/${type}`;
      const payload = executeMode
        ? { mode: 'execute', confirmExecute: true, confirmPhrase }
        : { mode: 'dry_run' };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'recheck 失敗');
      toast.success(`${executeMode ? 'execute' : 'preview'} 完成：${type} (run #${data.id || '-'})`);
      load();
    } catch (e) {
      toast.danger(e.message || 'recheck 失敗');
    } finally {
      setConfirm({ show: false, type: '' });
    }
  };

  const loadRunDetail = async (id) => {
    try {
      const res = await fetch(`/api/admin/surveys/repairs/runs/${id}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'run detail 載入失敗');
      setRunDetail({ show: true, data });
    } catch (e) {
      toast.danger(e.message || 'run detail 載入失敗');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="h4 text-primary mb-1">Survey Data Health</h2>
          <div className="text-muted small">資料品質監控（P3，recheck 目前預設 dry-run）</div>
        </div>
        <Button variant="outline-primary" onClick={load}>重新整理</Button>
      </div>

      {loading ? <div className="text-center py-4"><Spinner animation="border" /></div> : null}

      {overview ? (
        <div className="row g-2 mb-3">
          {[
            ['responses total', overview.responsesTotal],
            ['missing semester', overview.missingSemesterCount],
            ['missing version', overview.missingVersionCount],
            ['unresolved semester', overview.unresolvedSemesterCount],
            ['unresolved version', overview.unresolvedVersionCount],
            ['unmatched answers', overview.unmatchedAnswersCount],
            ['fallback rendered', overview.fallbackRenderedResponsesCount],
            ['events missing semester', overview.eventsMissingSemester],
          ].map(([k, v]) => (
            <div key={k} className="col-md-3">
              <Card className="border-0 shadow-sm">
                <Card.Body className="py-2">
                  <div className="small text-muted">{k}</div>
                  <div className="h5 mb-0">{v}</div>
                </Card.Body>
              </Card>
            </div>
          ))}
        </div>
      ) : null}

      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="bg-white fw-semibold">Actions（dry-run）</Card.Header>
        <Card.Body>
          <div className="d-flex gap-2 flex-wrap mb-2">
            <Form.Check
              type="switch"
              checked={executeMode}
              onChange={(e) => setExecuteMode(e.target.checked)}
              label="啟用 execute mode（高風險）"
            />
            {executeMode ? (
              <Form.Control
                style={{ maxWidth: 320 }}
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="輸入 EXECUTE_SURVEY_REPAIR"
              />
            ) : null}
          </div>
          <div className="d-flex gap-2 flex-wrap">
          <Button variant="outline-secondary" onClick={() => setConfirm({ show: true, type: 'semester' })}>Re-run semester backfill</Button>
          <Button variant="outline-secondary" onClick={() => setConfirm({ show: true, type: 'version' })}>Re-run version resolution</Button>
          <Button variant="outline-secondary" onClick={() => setConfirm({ show: true, type: 'answers' })}>Re-run answer normalization check</Button>
          </div>
        </Card.Body>
      </Card>

      {readiness ? (
        <Card className="border-0 shadow-sm mb-3">
          <Card.Header className="bg-white fw-semibold">Release Gate Indicator</Card.Header>
          <Card.Body>
            <Alert variant={readiness.gate === 'Not ready' ? 'danger' : readiness.gate === 'Ready with warnings' ? 'warning' : 'success'}>
              {readiness.gate}
            </Alert>
            {(readiness.recommendedActions || []).length > 0 ? (
              <ul className="mb-0">
                {(readiness.recommendedActions || []).map((a, idx) => <li key={idx}>{a}</li>)}
              </ul>
            ) : <div className="text-muted small">目前無建議動作</div>}
          </Card.Body>
        </Card>
      ) : null}

      <div className="row g-3">
        <div className="col-lg-6">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold">Responses missing semester</Card.Header>
            <Card.Body className="table-responsive">
              <Table size="sm" hover>
                <thead><tr><th>id</th><th>surveyId</th><th>submittedAt</th></tr></thead>
                <tbody>{(problems?.responsesMissingSemester || []).slice(0, 30).map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.surveyId}</td><td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td></tr>)}</tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-6">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold">Responses missing version</Card.Header>
            <Card.Body className="table-responsive">
              <Table size="sm" hover>
                <thead><tr><th>id</th><th>surveyId</th><th>submittedAt</th></tr></thead>
                <tbody>{(problems?.responsesMissingVersion || []).slice(0, 30).map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.surveyId}</td><td>{r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-'}</td></tr>)}</tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-6">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold">Responses with unmatched answers</Card.Header>
            <Card.Body className="table-responsive">
              <Table size="sm" hover>
                <thead><tr><th>responseId</th><th>unmatched</th></tr></thead>
                <tbody>{(problems?.responsesWithUnmatchedAnswers || []).slice(0, 30).map((r) => <tr key={r.responseId}><td>{r.responseId}</td><td>{r.unmatchedAnswerCount}</td></tr>)}</tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
        <div className="col-lg-6">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold">Rule conflicts</Card.Header>
            <Card.Body>
              {(rules?.conflicts || []).length === 0 ? <Alert variant="success" className="mb-0">目前未檢測到衝突</Alert> : (
                <ul className="mb-0">
                  {(rules?.conflicts || []).slice(0, 20).map((c, idx) => (
                    <li key={`${c.type}-${idx}`}>{c.type} / rules: {(c.relatedRules || []).join(', ')} / suggestion: {c.suggestion}</li>
                  ))}
                </ul>
              )}
            </Card.Body>
          </Card>
        </div>
        <div className="col-12">
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-semibold">Recent Repair Runs</Card.Header>
            <Card.Body className="table-responsive">
              <Table size="sm" hover>
                <thead><tr><th>id</th><th>type</th><th>mode</th><th>status</th><th>requestedBy</th><th>createdAt</th><th>操作</th></tr></thead>
                <tbody>
                  {(runs || []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.repairType}</td>
                      <td>{r.mode}</td>
                      <td>{r.status}</td>
                      <td>{r.requestedBy || '-'}</td>
                      <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '-'}</td>
                      <td><Button size="sm" variant="outline-primary" onClick={() => loadRunDetail(r.id)}>詳情</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </div>
      </div>

      <Modal show={confirm.show} onHide={() => setConfirm({ show: false, type: '' })} centered>
        <Modal.Header closeButton><Modal.Title>確認執行</Modal.Title></Modal.Header>
        <Modal.Body>
          即將執行：{confirm.type} / mode={executeMode ? 'execute' : 'dry_run'}。是否繼續？
          {executeMode ? <div className="small text-danger mt-2">請確認輸入 EXECUTE_SURVEY_REPAIR，避免誤觸正式修補。</div> : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirm({ show: false, type: '' })}>取消</Button>
          <Button
            onClick={() => runRecheck(confirm.type)}
            disabled={executeMode && confirmPhrase !== 'EXECUTE_SURVEY_REPAIR'}
          >
            執行
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={runDetail.show} onHide={() => setRunDetail({ show: false, data: null })} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Repair Run 詳情</Modal.Title></Modal.Header>
        <Modal.Body>
          {runDetail.data ? (
            <>
              <div className="small text-muted mb-2">
                run #{runDetail.data.run?.id} / {runDetail.data.run?.repairType} / {runDetail.data.run?.mode} / {runDetail.data.run?.status}
              </div>
              <pre className="small bg-light p-2 rounded">{JSON.stringify(runDetail.data.run?.summaryJson || {}, null, 2)}</pre>
              <div className="table-responsive">
                <Table size="sm" bordered>
                  <thead><tr><th>entity</th><th>id</th><th>action</th><th>status</th><th>message</th></tr></thead>
                  <tbody>
                    {(runDetail.data.items || []).slice(0, 200).map((it) => (
                      <tr key={it.id}>
                        <td>{it.entityType}</td>
                        <td>{it.entityId}</td>
                        <td>{it.actionType}</td>
                        <td>{it.resultStatus}</td>
                        <td>{it.message || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </>
          ) : null}
        </Modal.Body>
      </Modal>
    </div>
  );
}
