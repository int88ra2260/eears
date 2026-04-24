import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLearningJourneyProfile } from '../../services/learningJourneyApi';

const EMPTY = '—';

export default function EnglishTestStudentTimelinePage() {
  const { studentId } = useParams();
  const token = localStorage.getItem('token') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!studentId) return;
      setLoading(true);
      setError('');
      try {
        const payload = await getLearningJourneyProfile(token, studentId);
        if (!cancelled) setData(payload);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          const rid = e.requestId ? `（Request-ID: ${e.requestId}）` : '';
          setError(`${e.message || '載入失敗'}${rid}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, studentId]);

  const timeline = Array.isArray(data?.timeline) ? data.timeline : [];

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">學生歷程（Timeline）</h5>
        <Link className="btn btn-outline-secondary btn-sm" to={`/admin/english-test-tracking/students/${encodeURIComponent(studentId || '')}`}>
          返回 V2 學生頁
        </Link>
      </div>
      {loading && <div className="alert alert-info py-2">載入中…</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}
      {!loading && !error && data && (
        <p className="small text-muted">
          學號：{data.student?.studentId || studentId}；名冊／培力／BESTEP／活動等事件共 {timeline.length} 筆（依聚合 read model）。
        </p>
      )}
      {!loading && timeline.length === 0 && !error && <div className="text-muted">尚無可顯示的 timeline 事件。</div>}
      <ul className="small list-unstyled">
        {timeline.slice(0, 40).map((item) => (
          <li key={item.id || `${item.type}-${item.date}`} className="mb-1 border-bottom pb-1">
            <span className="text-muted">{item.date || EMPTY}</span>
            {' · '}
            <strong>{item.type}</strong>
            {' — '}
            {item.title || EMPTY}
            {item.status ? `（${item.status}）` : ''}
            <span className="text-muted"> — {item.source || EMPTY}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
