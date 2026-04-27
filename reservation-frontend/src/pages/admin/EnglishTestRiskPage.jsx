import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSemesters } from '../../services/englishTestService';
import { getLearningJourneyRiskStudents } from '../../services/learningJourneyApi';

export default function EnglishTestRiskPage() {
  const token = localStorage.getItem('token') || '';
  const [semesterId, setSemesterId] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getSemesters(token);
        if (!mounted) return;
        const first = Array.isArray(list) && list.length > 0 ? String(list[0].id || '') : '';
        setSemesterId(first);
      } catch (_) {}
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!semesterId) return;
      setLoading(true);
      setError('');
      try {
        const data = await getLearningJourneyRiskStudents(token, semesterId);
        if (!mounted) return;
        setRows(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (!mounted) return;
        setRows([]);
        setError(e.message || '載入風險學生失敗');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, semesterId]);

  return (
    <div className="container-fluid py-3">
      <h5 className="mb-3">英檢風險分析</h5>
      <div className="row g-2 mb-3 align-items-end">
        <div className="col-md-3">
          <label className="form-label small mb-0">學期</label>
          <input className="form-control form-control-sm" value={semesterId} onChange={(e) => setSemesterId(e.target.value)} />
        </div>
      </div>
      {error ? <div className="alert alert-danger py-2">{error}</div> : null}
      {loading ? <div className="alert alert-info py-2">載入中…</div> : null}
      {!loading && !error && (
        <div className="table-responsive mb-3">
          <table className="table table-sm table-bordered">
            <thead className="table-light">
              <tr>
                <th>學號</th>
                <th>風險分數</th>
                <th>原因</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-muted">目前無風險學生</td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="font-monospace">{r.studentId}</td>
                    <td>{r.riskScore}</td>
                    <td>{(r.reasons || []).map((x) => x.message).join('；')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <Link className="btn btn-outline-primary btn-sm" to="/admin/english-test-tracking">
        前往英檢長期追蹤
      </Link>
    </div>
  );
}
