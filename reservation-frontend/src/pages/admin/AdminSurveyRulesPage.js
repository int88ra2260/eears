import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';
import Pagination from 'react-bootstrap/Pagination';
import useToast from '../../components/ui/useToast';

const DEFAULT_FORM = {
  semesterId: '',
  activityType: 'ET',
  surveyId: '',
  surveyVersionId: '',
  isEnabled: true,
  triggerMode: 'before_reservation',
  fillScope: 'once_per_semester',
  appliesToAllEvents: true,
  eventId: '',
  startAt: '',
  endAt: '',
  priority: 100,
};

function statusLabel(v) {
  const m = {
    active_now: ['success', 'active now'],
    not_started: ['info', 'not started'],
    expired: ['secondary', 'expired'],
    disabled: ['dark', 'disabled'],
    overridden_by_higher_priority: ['warning', 'overridden'],
  };
  const [variant, label] = m[v] || ['light', v || '-'];
  return <Badge bg={variant}>{label}</Badge>;
}

export default function AdminSurveyRulesPage() {
  const toast = useToast();
  const { token } = useOutletContext();
  const authHeaders = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({ semesterId: '', activityType: '', isEnabled: 'all' });
  const [options, setOptions] = useState({ semesters: [], surveys: [], versions: [], events: [] });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState({ semesterId: '', activityType: 'ET', eventId: '', result: null, loading: false });
  const [simulation, setSimulation] = useState({ currentTime: '', triggerMode: '', result: null, loading: false });
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [conflictText, setConflictText] = useState('');

  const loadOptions = async () => {
    try {
      const res = await fetch('/api/admin/survey-center/meta/options', { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '載入選項失敗');
      setOptions({
        semesters: data.semesters || [],
        surveys: data.surveys || [],
        versions: data.versions || [],
        events: data.events || [],
      });
    } catch (e) {
      toast.danger(e.message || '載入選項失敗');
    }
  };

  const loadRules = async (page = pagination.page) => {
    try {
      setLoading(true);
      setError('');
      const q = new URLSearchParams({
        page: String(page),
        pageSize: String(pagination.pageSize),
        ...(filters.semesterId ? { semesterId: filters.semesterId } : {}),
        ...(filters.activityType ? { activityType: filters.activityType } : {}),
        ...(filters.isEnabled !== 'all' ? { isEnabled: filters.isEnabled } : {}),
      });
      const res = await fetch(`/api/admin/survey-rules?${q.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '載入規則失敗');
      setRows(data.rows || []);
      setPagination((p) => ({ ...p, ...(data.pagination || {}), page }));
    } catch (e) {
      setError(e.message || '載入規則失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    loadRules(1);
  }, [filters.semesterId, filters.activityType, filters.isEnabled]);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setConflictText('');
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setConflictText('');
    setForm({
      semesterId: row.semesterId || '',
      activityType: row.activityType || 'ET',
      surveyId: row.surveyId || '',
      surveyVersionId: row.surveyVersionId || '',
      isEnabled: !!row.isEnabled,
      triggerMode: row.triggerMode || 'before_reservation',
      fillScope: row.fillScope || 'once_per_semester',
      appliesToAllEvents: !!row.appliesToAllEvents,
      eventId: row.eventId || '',
      startAt: row.startAt ? String(row.startAt).slice(0, 16) : '',
      endAt: row.endAt ? String(row.endAt).slice(0, 16) : '',
      priority: row.priority ?? 100,
    });
    setShowModal(true);
  };

  const submitRule = async () => {
    const payload = {
      ...form,
      eventId: form.appliesToAllEvents ? null : form.eventId || null,
      semesterId: form.semesterId || null,
      surveyVersionId: form.surveyVersionId || null,
      startAt: form.startAt || null,
      endAt: form.endAt || null,
      priority: Number(form.priority || 100),
    };
    try {
      const url = editing ? `/api/admin/survey-rules/${editing.id}` : '/api/admin/survey-rules';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'RULE_CONFLICT') {
          setConflictText(
            `${data.message}（${data.conflictType || 'RULE_CONFLICT'}）` +
            `；衝突規則: ${(data.details || []).map((d) => `#${d.id}(P${d.priority})`).join(', ')}` +
            `${data.suggestion ? `；建議：${data.suggestion}` : ''}`
          );
          return;
        }
        throw new Error(data.message || '儲存失敗');
      }
      toast.success(editing ? '規則已更新' : '規則已建立');
      setShowModal(false);
      loadRules();
    } catch (e) {
      toast.danger(e.message || '儲存失敗');
    }
  };

  const performDelete = async () => {
    try {
      const res = await fetch(`/api/admin/survey-rules/${deleteConfirm.id}`, { method: 'DELETE', headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '刪除失敗');
      toast.success('規則已刪除');
      setDeleteConfirm({ show: false, id: null });
      loadRules();
    } catch (e) {
      toast.danger(e.message || '刪除失敗');
    }
  };

  const runPreview = async () => {
    setPreview((p) => ({ ...p, loading: true, result: null }));
    try {
      const q = new URLSearchParams({
        ...(preview.semesterId ? { semesterId: preview.semesterId } : {}),
        ...(preview.activityType ? { activityType: preview.activityType } : {}),
        ...(preview.eventId ? { eventId: preview.eventId } : {}),
      });
      const res = await fetch(`/api/admin/survey-rules/effective/query?${q.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '查詢失敗');
      setPreview((p) => ({ ...p, loading: false, result: data || null }));
    } catch (e) {
      setPreview((p) => ({ ...p, loading: false }));
      toast.danger(e.message || '查詢失敗');
    }
  };

  const runSimulation = async () => {
    setSimulation((s) => ({ ...s, loading: true, result: null }));
    try {
      const q = new URLSearchParams({
        ...(preview.semesterId ? { semesterId: preview.semesterId } : {}),
        ...(preview.activityType ? { activityType: preview.activityType } : {}),
        ...(preview.eventId ? { eventId: preview.eventId } : {}),
        ...(simulation.currentTime ? { currentTime: simulation.currentTime } : {}),
        ...(simulation.triggerMode ? { triggerMode: simulation.triggerMode } : {}),
      });
      const res = await fetch(`/api/admin/survey-rules/simulate/query?${q.toString()}`, { headers: authHeaders });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || '模擬失敗');
      setSimulation((s) => ({ ...s, loading: false, result: data }));
    } catch (e) {
      setSimulation((s) => ({ ...s, loading: false, result: null }));
      toast.danger(e.message || '模擬失敗');
    }
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="h4 text-primary mb-1">問卷規則</h2>
          <div className="text-muted small">管理各學期 / 各活動類型的問卷啟用與觸發規則</div>
        </div>
        <Button onClick={openCreate}>新增規則</Button>
      </div>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="row g-2">
          <div className="col-md-3">
            <Form.Select value={filters.semesterId} onChange={(e) => setFilters((f) => ({ ...f, semesterId: e.target.value }))}>
              <option value="">全部學期</option>
              {options.semesters.map((s) => <option key={s.id} value={s.id}>{s.code} {s.name ? `- ${s.name}` : ''}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Select value={filters.activityType} onChange={(e) => setFilters((f) => ({ ...f, activityType: e.target.value }))}>
              <option value="">全部活動類型</option>
              {['ET', 'EC', 'IF', 'JT', 'GENERAL'].map((x) => <option key={x} value={x}>{x}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Select value={filters.isEnabled} onChange={(e) => setFilters((f) => ({ ...f, isEnabled: e.target.value }))}>
              <option value="all">全部狀態</option>
              <option value="true">enabled</option>
              <option value="false">disabled</option>
            </Form.Select>
          </div>
          <div className="col-md-3 d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => setFilters({ semesterId: '', activityType: '', isEnabled: 'all' })}>重設</Button>
            <Button variant="outline-primary" onClick={() => loadRules(1)}>查詢</Button>
          </div>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className="bg-white fw-semibold">Effective Rule Preview</Card.Header>
        <Card.Body className="row g-2 align-items-center">
          <div className="col-md-3">
            <Form.Select value={preview.semesterId} onChange={(e) => setPreview((p) => ({ ...p, semesterId: e.target.value }))}>
              <option value="">學期</option>
              {options.semesters.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Select value={preview.activityType} onChange={(e) => setPreview((p) => ({ ...p, activityType: e.target.value }))}>
              {['ET', 'EC', 'IF', 'JT', 'GENERAL'].map((x) => <option key={x} value={x}>{x}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3">
            <Form.Select value={preview.eventId} onChange={(e) => setPreview((p) => ({ ...p, eventId: e.target.value }))}>
              <option value="">所有活動</option>
              {options.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.id} - {ev.name}</option>)}
            </Form.Select>
          </div>
          <div className="col-md-3 d-flex gap-2">
            <Button onClick={runPreview}>查詢生效規則</Button>
            <Button variant="outline-primary" onClick={runSimulation}>模擬解析</Button>
            {preview.loading && <Spinner size="sm" animation="border" />}
          </div>
          <div className="col-md-3">
            <Form.Control type="datetime-local" value={simulation.currentTime} onChange={(e) => setSimulation((s) => ({ ...s, currentTime: e.target.value }))} />
          </div>
          <div className="col-md-3">
            <Form.Select value={simulation.triggerMode} onChange={(e) => setSimulation((s) => ({ ...s, triggerMode: e.target.value }))}>
              <option value="">trigger mode</option>
              {['before_reservation', 'after_reservation', 'optional'].map((x) => <option key={x} value={x}>{x}</option>)}
            </Form.Select>
          </div>
          <div className="col-12">
            {preview.result ? (
              <Alert variant="info" className="mb-0">
                生效規則：#{preview.result.id} / 問卷 {preview.result.surveyId} / 版本 {preview.result.surveyVersionId || '-'} / P{preview.result.priority}
              </Alert>
            ) : <div className="small text-muted">尚未查詢或目前無符合規則</div>}
          </div>
          {simulation.result ? (
            <div className="col-12">
              <Alert variant="secondary" className="mb-2">
                模擬結果：matched={simulation.result.matchedRules?.length || 0} / active={simulation.result.activeRules?.length || 0} / selected={simulation.result.selectedRule ? `#${simulation.result.selectedRule.id}` : 'none'}
              </Alert>
              <div className="table-responsive">
                <Table size="sm" bordered>
                  <thead><tr><th>trace</th><th>ruleId</th><th>message/reasons</th></tr></thead>
                  <tbody>
                    {(simulation.result.trace || []).map((t, idx) => (
                      <tr key={`${t.ruleId}-${idx}`}>
                        <td>{t.step}</td>
                        <td>{t.ruleId || '-'}</td>
                        <td>{t.message || (t.reasons || []).join(', ') || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {(simulation.result.conflictWarnings || []).length > 0 ? (
                <Alert variant="warning" className="mb-0">
                  conflictWarnings: {(simulation.result.conflictWarnings || []).map((c) => `${c.type}(${(c.relatedRules || []).join('/')})`).join('；')}
                </Alert>
              ) : null}
            </div>
          ) : null}
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading ? <div className="text-center py-4"><Spinner animation="border" /></div> : null}
          {!loading && error ? <Alert variant="danger">{error}</Alert> : null}
          {!loading && !error ? (
            <div className="table-responsive">
              <Table size="sm" hover className="align-middle">
                <thead className="table-light">
                  <tr>
                    <th>ID</th><th>學期</th><th>活動</th><th>問卷</th><th>版本</th><th>trigger</th><th>scope</th><th>allEvents</th>
                    <th>event</th><th>start/end</th><th>P</th><th>enabled</th><th>生效狀態</th><th>更新</th><th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>{r.Semester?.code || '-'}</td>
                      <td>{r.activityType || '-'}</td>
                      <td>{r.Survey?.title || r.Survey?.name || r.surveyId}</td>
                      <td>{r.SurveyVersion?.versionNumber || '-'}</td>
                      <td>{r.triggerMode || '-'}</td>
                      <td>{r.fillScope || '-'}</td>
                      <td>{r.appliesToAllEvents ? 'Y' : 'N'}</td>
                      <td>{r.eventId || '-'}</td>
                      <td className="small">{r.startAt ? new Date(r.startAt).toLocaleString() : '-'}<br />{r.endAt ? new Date(r.endAt).toLocaleString() : '-'}</td>
                      <td>{r.priority}</td>
                      <td>{r.isEnabled ? <Badge bg="success">enabled</Badge> : <Badge bg="secondary">disabled</Badge>}</td>
                      <td>{statusLabel(r.effectiveStatus)}</td>
                      <td className="small text-nowrap">{new Date(r.updatedAt).toLocaleString()}</td>
                      <td className="d-flex gap-1">
                        <Button size="sm" variant="outline-primary" onClick={() => openEdit(r)}>編輯</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => setDeleteConfirm({ show: true, id: r.id })}>刪除</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : null}
          <Pagination className="mb-0">
            <Pagination.Prev disabled={pagination.page <= 1} onClick={() => loadRules(pagination.page - 1)} />
            <Pagination.Item active>{pagination.page}</Pagination.Item>
            <Pagination.Next disabled={pagination.page >= (pagination.totalPages || 1)} onClick={() => loadRules(pagination.page + 1)} />
          </Pagination>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>{editing ? '編輯規則' : '新增規則'}</Modal.Title></Modal.Header>
        <Modal.Body>
          {conflictText ? <Alert variant="warning">{conflictText}</Alert> : null}
          <div className="row g-2">
            <div className="col-md-4">
              <Form.Label>semester</Form.Label>
              <Form.Select value={form.semesterId} onChange={(e) => setForm((f) => ({ ...f, semesterId: e.target.value }))}>
                <option value="">-</option>
                {options.semesters.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>activityType</Form.Label>
              <Form.Select value={form.activityType} onChange={(e) => setForm((f) => ({ ...f, activityType: e.target.value }))}>
                {['ET', 'EC', 'IF', 'JT', 'GENERAL'].map((x) => <option key={x} value={x}>{x}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>priority</Form.Label>
              <Form.Control type="number" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>survey</Form.Label>
              <Form.Select value={form.surveyId} onChange={(e) => setForm((f) => ({ ...f, surveyId: e.target.value }))}>
                <option value="">-</option>
                {options.surveys.map((s) => <option key={s.id} value={s.id}>{s.title || s.name || s.surveyKey}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>version</Form.Label>
              <Form.Select value={form.surveyVersionId} onChange={(e) => setForm((f) => ({ ...f, surveyVersionId: e.target.value }))}>
                <option value="">-</option>
                {options.versions.filter((v) => String(v.surveyId) === String(form.surveyId)).map((v) => <option key={v.id} value={v.id}>v{v.versionNumber}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>triggerMode</Form.Label>
              <Form.Select value={form.triggerMode} onChange={(e) => setForm((f) => ({ ...f, triggerMode: e.target.value }))}>
                {['before_reservation', 'after_reservation', 'optional'].map((x) => <option key={x} value={x}>{x}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>fillScope</Form.Label>
              <Form.Select value={form.fillScope} onChange={(e) => setForm((f) => ({ ...f, fillScope: e.target.value }))}>
                {['once_per_semester', 'once_per_activity', 'once_per_event'].map((x) => <option key={x} value={x}>{x}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <Form.Check type="switch" label="Enabled" checked={form.isEnabled} onChange={(e) => setForm((f) => ({ ...f, isEnabled: e.target.checked }))} />
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <Form.Check type="switch" label="appliesToAllEvents" checked={form.appliesToAllEvents} onChange={(e) => setForm((f) => ({ ...f, appliesToAllEvents: e.target.checked }))} />
            </div>
            <div className="col-md-8">
              <Form.Label>event（單一活動綁定）</Form.Label>
              <Form.Select disabled={form.appliesToAllEvents} value={form.eventId} onChange={(e) => setForm((f) => ({ ...f, eventId: e.target.value }))}>
                <option value="">-</option>
                {options.events.map((ev) => <option key={ev.id} value={ev.id}>{ev.id} - {ev.name}</option>)}
              </Form.Select>
            </div>
            <div className="col-md-6">
              <Form.Label>startAt</Form.Label>
              <Form.Control type="datetime-local" value={form.startAt} onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))} />
            </div>
            <div className="col-md-6">
              <Form.Label>endAt</Form.Label>
              <Form.Control type="datetime-local" value={form.endAt} onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))} />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
          <Button onClick={submitRule}>{editing ? '更新' : '建立'}</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={deleteConfirm.show} onHide={() => setDeleteConfirm({ show: false, id: null })} centered>
        <Modal.Header closeButton><Modal.Title>刪除規則</Modal.Title></Modal.Header>
        <Modal.Body>確定要刪除規則 #{deleteConfirm.id}？</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteConfirm({ show: false, id: null })}>取消</Button>
          <Button variant="danger" onClick={performDelete}>刪除</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
