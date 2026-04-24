// TODO: legacy dashboard, candidate for removal — not mounted in App.js routes; see AdminDashboardProduct.
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import useToast from '../../components/ui/useToast';

function KpiCard({ title, value, hint, reliability = 'high' }) {
  const reliabilityMeta = {
    high: { label: '資料可靠度：高', cls: 'text-success' },
    medium: { label: '資料可靠度：中', cls: 'text-warning' },
    low: { label: '資料可靠度：低', cls: 'text-danger' },
  }[reliability] || { label: '資料可靠度：中', cls: 'text-warning' };

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body">
        <div className="text-muted small">{title}</div>
        <div className="display-6 fw-bold mt-1">{value}</div>
        {hint ? <div className="text-muted small mt-2">{hint}</div> : null}
        <div className={`small mt-2 ${reliabilityMeta.cls}`}>{reliabilityMeta.label}</div>
      </div>
    </div>
  );
}

function QuickLinkCard({ to, title, desc }) {
  return (
    <Link to={to} className="text-decoration-none">
      <div className="card h-100 shadow-sm border-0 bg-light">
        <div className="card-body">
          <div className="fw-semibold text-dark">{title}</div>
          <div className="small text-muted mt-1">{desc}</div>
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const { token, userRole } = useOutletContext();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [englishPendingCount, setEnglishPendingCount] = useState(null);
  const [announcementDraftCount, setAnnouncementDraftCount] = useState(null);
  const [violations, setViolations] = useState([]);
  const [sourceStatus, setSourceStatus] = useState({
    events: 'unknown',
    reservations: 'unknown',
    english: 'unknown',
    announcements: 'unknown',
    violations: 'unknown',
  });

  const authHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
    'X-User-Role': userRole || 'worker',
  }), [token, userRole]);

  useEffect(() => {
    let ignore = false;

    if (!token) {
      setLoading(false);
      setError('尚未登入，請先登入後查看儀表板。');
      return () => { ignore = true; };
    }

    const load = async () => {
      setLoading(true);
      setError('');
      const today = new Date().toISOString().slice(0, 10);

      const tasks = await Promise.allSettled([
        fetch('/api/events', { headers: authHeaders }).then((r) => r.json()),
        fetch('/api/reservations', { headers: authHeaders }).then(async (r) => (r.ok ? r.json() : [])),
        fetch('/api/english-test/registrations?page=1&limit=1&status=pending', { headers: authHeaders })
          .then(async (r) => (r.ok ? r.json() : null)),
        fetch('/api/admin/announcements?page=1&limit=20&status=draft', { headers: authHeaders })
          .then(async (r) => (r.ok ? r.json() : null)),
        fetch('/api/blacklist', { headers: authHeaders }).then(async (r) => (r.ok ? r.json() : [])),
      ]);

      if (ignore) return;

      const eventData = tasks[0].status === 'fulfilled' && Array.isArray(tasks[0].value) ? tasks[0].value : [];
      const reservationData = tasks[1].status === 'fulfilled' && Array.isArray(tasks[1].value) ? tasks[1].value : [];
      const englishData = tasks[2].status === 'fulfilled' ? tasks[2].value : null;
      const draftData = tasks[3].status === 'fulfilled' ? tasks[3].value : null;
      const violationData = tasks[4].status === 'fulfilled' && Array.isArray(tasks[4].value) ? tasks[4].value : [];
      setSourceStatus({
        events: tasks[0].status === 'fulfilled' ? 'ok' : 'fail',
        reservations: tasks[1].status === 'fulfilled' ? 'ok' : 'fail',
        english: tasks[2].status === 'fulfilled' ? 'ok' : 'fail',
        announcements: tasks[3].status === 'fulfilled' ? 'ok' : 'fail',
        violations: tasks[4].status === 'fulfilled' ? 'ok' : 'fail',
      });

      setEvents(eventData);
      setReservations(reservationData);
      setViolations(violationData);
      setEnglishPendingCount(typeof englishData?.total === 'number' ? englishData.total : (Array.isArray(englishData?.data) ? englishData.data.length : null));
      setAnnouncementDraftCount(Array.isArray(draftData?.items) ? draftData.items.length : null);

      if (tasks.every((t) => t.status === 'rejected')) {
        setError('目前無法載入儀表板資料，請稍後再試。');
        toast.warning('儀表板資料載入失敗，請稍後重試');
      }

      setLoading(false);
      // derived values use inline to avoid state bloat
      void today;
    };

    load();
    return () => { ignore = true; };
  }, [authHeaders, toast, token]);

  const todayReservations = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return reservations.filter((r) => {
      const ts = String(r.createdAt || r.timestamp || '');
      return ts.startsWith(today);
    }).length;
  }, [reservations]);

  const recentEvents = useMemo(() => events.slice(0, 5), [events]);
  const recentViolations = useMemo(() => violations.slice(0, 5), [violations]);

  if (loading) {
    return <div className="alert alert-info">載入 Dashboard 中...</div>;
  }

  if (error) {
    return <div className="alert alert-warning">{error}</div>;
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">系統總覽 Dashboard</h4>
        <Link to="/admin/settings/system" className="btn btn-outline-primary btn-sm">前往系統設定</Link>
      </div>
      <div className="alert alert-light border small mb-3">
        統計時間範圍說明：今日預約數＝今日 00:00 至目前；其餘 KPI 以目前可取得資料快照為準。
      </div>

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="今日預約數"
            value={todayReservations}
            hint="時間範圍：今日 00:00 至現在（依預約建立時間）"
            reliability={sourceStatus.reservations === 'ok' ? 'high' : 'low'}
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="近期活動數"
            value={events.length}
            hint="時間範圍：目前可讀取到的活動清單"
            reliability={sourceStatus.events === 'ok' ? 'high' : 'low'}
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="英檢待審核"
            value={englishPendingCount ?? '--'}
            hint="時間範圍：目前狀態為 pending 的報名"
            reliability={sourceStatus.english === 'ok' ? 'high' : 'low'}
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="公告草稿數"
            value={announcementDraftCount ?? '--'}
            hint="時間範圍：目前狀態為草稿的公告"
            reliability={sourceStatus.announcements === 'ok' ? 'high' : 'low'}
          />
        </div>
      </div>

      <h5 className="mb-3">快速入口</h5>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/operations" title="活動管理" desc="活動報表、預約管理、簽到與匯入" /></div>
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/announcements" title="公告管理" desc="公告建立、發布、置頂" /></div>
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/surveys" title="問卷管理" desc="問卷統計與匯出" /></div>
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/english-test" title="英檢管理" desc="英檢報名審核與狀態管理" /></div>
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/violations" title="違規管理" desc="違規紀錄與黑名單關聯" /></div>
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/reports" title="報表 / 匯出" desc="跨模組報表與資料下載" /></div>
        <div className="col-12 col-md-6 col-xl-3"><QuickLinkCard to="/admin/settings/system" title="系統設定" desc="報名開關、feature flags、設定入口" /></div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header">最近活動</div>
            <div className="card-body">
              <div className="text-muted small mb-2">顯示範圍：最近 5 筆活動資料</div>
              {recentEvents.length === 0 ? (
                <div className="text-muted small">目前沒有可顯示的活動資料。</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {recentEvents.map((e) => (
                    <li key={e.id} className="list-group-item px-0">
                      <div className="fw-semibold">{e.name}</div>
                      <div className="small text-muted">{e.date} {e.startTime} - {e.endTime}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header">待處理提醒</div>
            <div className="card-body">
              <div className="text-muted small mb-2">顯示範圍：最近 5 筆違規相關提醒</div>
              {recentViolations.length === 0 ? (
                <div className="text-muted small">目前沒有待注意的違規紀錄。</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {recentViolations.map((v, idx) => (
                    <li key={`${v.id || idx}`} className="list-group-item px-0">
                      <div className="fw-semibold">{v.studentId || '未知學號'} {v.studentName || ''}</div>
                      <div className="small text-muted">{v.reason || v.description || '違規紀錄'}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

