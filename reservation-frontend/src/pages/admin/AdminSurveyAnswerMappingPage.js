import React, { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Table from 'react-bootstrap/Table';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';
import useToast from '../../components/ui/useToast';

const defaultFilters = {
  surveyId: '',
  surveyVersionId: '',
  status: 'all',
  sourceQuestionKey: '',
  targetQuestionKey: '',
};

export default function AdminSurveyAnswerMappingPage() {
  const { token } = useOutletContext();
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }), [token]);
  const toast = useToast();
  const [filters, setFilters] = useState(defaultFilters);
  const [options, setOptions] = useState({ surveys: [], versions: [] });
  const [rows, setRows] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    surveyId: '',
    surveyVersionId: '',
    sourceQuestionKey: '',
    targetQuestionKey: '',
    sourceLabel: '',
    targetLabel: '',
    mappingType: 'manual',
    confidenceScore: '0.8',
    notes: '',
  });
  const [proposalInfo, setProposalInfo] = useState(null);

  const loadOptions = async () => {
    const res = await fetch('/api/admin/survey-center/meta/options', { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '載入 options 失敗');
    setOptions({ surveys: data.surveys || [], versions: data.versions || [] });
  };

  const loadRows = async () => {
    const q = new URLSearchParams({ ...filters });
    const res = await fetch(`/api/admin/surveys/answer-mappings?${q.toString()}`, { headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '載入 mappings 失敗');
    setRows(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    Promise.all([loadOptions(), loadRows()]).catch((e) => toast.danger(e.message || '初始化失敗'));
  }, []);

  useEffect(() => {
    loadRows().catch((e) => toast.danger(e.message || '載入 mappings 失敗'));
  }, [filters.surveyId, filters.surveyVersionId, filters.status]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      surveyId: '',
      surveyVersionId: '',
      sourceQuestionKey: '',
      targetQuestionKey: '',
      sourceLabel: '',
      targetLabel: '',
      mappingType: 'manual',
      confidenceScore: '0.8',
      notes: '',
    });
    setShowModal(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      surveyId: form.surveyId || null,
      surveyVersionId: form.surveyVersionId || null,
      confidenceScore: Number(form.confidenceScore || 0),
    };
    const url = editing ? `/api/admin/surveys/answer-mappings/${editing.id}` : '/api/admin/surveys/answer-mappings';
    const method = editing ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '儲存失敗');
    toast.success(editing ? 'mapping 已更新' : 'mapping 已建立');
    setShowModal(false);
    loadRows();
  };

  const approve = async (id) => {
    const res = await fetch(`/api/admin/surveys/answer-mappings/${id}/approve`, { method: 'POST', headers, body: JSON.stringify({}) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '核准失敗');
    toast.success('mapping 已核准');
    loadRows();
  };

  const reject = async (id) => {
    const res = await fetch(`/api/admin/surveys/answer-mappings/${id}/reject`, { method: 'POST', headers, body: JSON.stringify({ notes: 'rejected by admin' }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || '拒絕失敗');
    toast.success('mapping 已拒絕');
    loadRows();
  };

  const generateProposals = async () => {
    const payload = {
      surveyId: filters.surveyId || null,
      surveyVersionId: filters.surveyVersionId || null,
    };
    const res = await fetch('/api/admin/surveys/answer-mappings/proposals', { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'proposal 產生失敗');
    const proposals = data.proposals || [];
    setProposalInfo({ total: proposals.length, high: proposals.filter((p) => Number(p.confidenceScore || 0) >= 0.9).length });
    if (proposals.length === 0) {
      toast.info('沒有可產生的 proposal');
      return;
    }
    for (const p of proposals) {
      // eslint-disable-next-line no-await-in-loop
      await fetch('/api/admin/surveys/answer-mappings', { method: 'POST', headers, body: JSON.stringify(p) });
    }
    toast.success(`已建立 ${proposals.length} 筆 proposal`);
    loadRows();
  };

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h2 className="h4 text-primary mb-1">Answer Mapping Tool</h2>
          <div className="text-muted small">管理 unmatched answers 對應，需核准後才生效</div>
        </div>
        <div className="d-flex gap-2">
          <Button variant="outline-primary" onClick={generateProposals}>產生 proposals</Button>
          <Button onClick={openCreate}>手動新增 mapping</Button>
        </div>
      </div>

      {proposalInfo ? <Alert variant="info">proposal: total={proposalInfo.total}, high-confidence={proposalInfo.high}</Alert> : null}

      <Card className="border-0 shadow-sm mb-3">
        <Card.Body className="row g-2">
          <div className="col-md-2"><Form.Select value={filters.surveyId} onChange={(e) => setFilters((f) => ({ ...f, surveyId: e.target.value }))}><option value="">survey</option>{options.surveys.map((s) => <option key={s.id} value={s.id}>{s.title || s.name}</option>)}</Form.Select></div>
          <div className="col-md-2"><Form.Select value={filters.surveyVersionId} onChange={(e) => setFilters((f) => ({ ...f, surveyVersionId: e.target.value }))}><option value="">version</option>{options.versions.filter((v) => !filters.surveyId || String(v.surveyId) === String(filters.surveyId)).map((v) => <option key={v.id} value={v.id}>v{v.versionNumber}</option>)}</Form.Select></div>
          <div className="col-md-2"><Form.Select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}><option value="all">all</option><option value="pending">pending</option><option value="approved">approved</option><option value="rejected">rejected</option></Form.Select></div>
          <div className="col-md-3"><Form.Control placeholder="source key" value={filters.sourceQuestionKey} onChange={(e) => setFilters((f) => ({ ...f, sourceQuestionKey: e.target.value }))} /></div>
          <div className="col-md-3"><Form.Control placeholder="target key" value={filters.targetQuestionKey} onChange={(e) => setFilters((f) => ({ ...f, targetQuestionKey: e.target.value }))} /></div>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm">
        <Card.Body className="table-responsive">
          <Table size="sm" hover>
            <thead><tr><th>source key</th><th>target key</th><th>type</th><th>confidence</th><th>status</th><th>notes</th><th>操作</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.sourceQuestionKey}</td>
                  <td>{r.targetQuestionKey}</td>
                  <td>{r.mappingType}</td>
                  <td>{r.confidenceScore}</td>
                  <td>{r.status}</td>
                  <td>{r.notes || '-'}</td>
                  <td className="d-flex gap-1">
                    <Button size="sm" variant="outline-primary" onClick={() => { setEditing(r); setForm({ ...r, confidenceScore: String(r.confidenceScore || '') }); setShowModal(true); }}>編輯</Button>
                    <Button size="sm" variant="outline-success" onClick={() => approve(r.id)}>approve</Button>
                    <Button size="sm" variant="outline-danger" onClick={() => reject(r.id)}>reject</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editing ? '編輯 mapping' : '新增 mapping'}</Modal.Title></Modal.Header>
        <Modal.Body className="row g-2">
          <div className="col-6"><Form.Control placeholder="surveyId" value={form.surveyId || ''} onChange={(e) => setForm((f) => ({ ...f, surveyId: e.target.value }))} /></div>
          <div className="col-6"><Form.Control placeholder="surveyVersionId" value={form.surveyVersionId || ''} onChange={(e) => setForm((f) => ({ ...f, surveyVersionId: e.target.value }))} /></div>
          <div className="col-6"><Form.Control placeholder="sourceQuestionKey" value={form.sourceQuestionKey || ''} onChange={(e) => setForm((f) => ({ ...f, sourceQuestionKey: e.target.value }))} /></div>
          <div className="col-6"><Form.Control placeholder="targetQuestionKey" value={form.targetQuestionKey || ''} onChange={(e) => setForm((f) => ({ ...f, targetQuestionKey: e.target.value }))} /></div>
          <div className="col-6"><Form.Control placeholder="sourceLabel" value={form.sourceLabel || ''} onChange={(e) => setForm((f) => ({ ...f, sourceLabel: e.target.value }))} /></div>
          <div className="col-6"><Form.Control placeholder="targetLabel" value={form.targetLabel || ''} onChange={(e) => setForm((f) => ({ ...f, targetLabel: e.target.value }))} /></div>
          <div className="col-6"><Form.Select value={form.mappingType || 'manual'} onChange={(e) => setForm((f) => ({ ...f, mappingType: e.target.value }))}><option value="manual">manual</option><option value="exact">exact</option><option value="heuristic">heuristic</option><option value="deprecated_key_alias">deprecated_key_alias</option></Form.Select></div>
          <div className="col-6"><Form.Control type="number" step="0.01" min="0" max="1" value={form.confidenceScore || ''} onChange={(e) => setForm((f) => ({ ...f, confidenceScore: e.target.value }))} /></div>
          <div className="col-12"><Form.Control as="textarea" rows={3} placeholder="notes" value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
          <Button onClick={() => save().catch((e) => toast.danger(e.message || '儲存失敗'))}>儲存</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
