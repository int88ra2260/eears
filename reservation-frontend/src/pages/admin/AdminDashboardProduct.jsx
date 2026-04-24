import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link, useOutletContext } from 'react-router-dom';
import useToast from '../../components/ui/useToast';
import { getReliabilityFault, makeDevRequestId } from '../../utils/reliabilityFaults';
import { buildAccessProfile, hasPermission } from '../../utils/accessControl';
import { P } from '../../constants/permissions';

const KPI_STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  EMPTY: 'empty',
  ERROR: 'error',
};

function getSemesterInfo(date) {
  const eventDate = new Date(date);
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth() + 1;
  if (year === 2025 && month >= 2 && month <= 7) return '113-2';
  if ((year === 2025 && month >= 8) || (year === 2026 && month <= 1)) return '114-1';
  if (year === 2026 && month >= 2 && month <= 7) return '114-2';
  return '113-2';
}

function withinNextDays(dateStr, days) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return d >= start && d <= end;
}

function latencyCategory(latencyMs) {
  const n = Number(latencyMs);
  if (!Number.isFinite(n)) return 'unknown';
  if (n < 100) return 'normal';
  if (n < 500) return 'slow';
  return 'abnormal';
}

function formatLocalDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (!d || Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function KpiCard({ title, timeLabel, status, value, onRefresh, hint, diagnostic }) {
  const isLoading = status === KPI_STATUS.LOADING;
  const isEmpty = status === KPI_STATUS.EMPTY;
  const isError = status === KPI_STATUS.ERROR;

  const display =
    isLoading ? null : isError ? 'N/A' : isEmpty ? 0 : typeof value === 'number' ? value : value ?? 0;

  const d = diagnostic || null;

  const helper = isLoading
    ? '載入中...'
    : isError
      ? d?.errorBrief || 'API 請求失敗'
      : isEmpty
        ? '目前無資料'
        : hint || '';

  const requestId = d?.requestId || null;
  const lastUpdatedAt = d?.lastUpdatedAt || null;
  const source = d?.source || '';

  const statusLabel = isLoading ? 'loading' : isError ? 'error' : isEmpty ? 'empty' : 'success';

  const tooltipContent = (
    <div style={{ maxWidth: 260 }}>
      <div className="small text-muted mb-2">{source}</div>
      <div className="small">
        <div>最後更新：{lastUpdatedAt ? lastUpdatedAt : '--'}</div>
        <div>狀態：{statusLabel}</div>
        {isError ? (
          <>
            <div className="mt-1">錯誤：{helper}</div>
            {requestId ? <div>錯誤識別碼：{requestId}</div> : <div>錯誤識別碼：--</div>}
            {requestId ? (
              <div className="mt-1">
                <Link to={`/admin/logs?requestId=${encodeURIComponent(requestId)}`}>查看操作紀錄</Link>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="card h-100 shadow-sm">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div>
            <div className="text-muted small">{title}</div>
            {timeLabel ? <div className="small text-muted mt-1">{timeLabel}</div> : null}
          </div>
          <div className="d-flex align-items-start gap-1">
            <OverlayTrigger
              placement="left"
              overlay={<Tooltip id={`kpi-tip-${String(title).replace(/\\s+/g, '-').replace(/[^\\w-]/g, '')}`}>{tooltipContent}</Tooltip>}
            >
              <Button variant="link" size="sm" disabled={isLoading} title="KPI 診斷資訊">
                ℹ️
              </Button>
            </OverlayTrigger>
            <Button
              variant="link"
              size="sm"
              disabled={isLoading}
              title="重新整理此 KPI"
              onClick={onRefresh}
            >
              🔄
            </Button>
          </div>
        </div>

        <div className="mt-2">
          {isLoading ? (
            <div className="d-flex align-items-center gap-2">
              <Spinner animation="border" size="sm" role="status" />
              <div className="text-muted small">載入中</div>
            </div>
          ) : (
            <div className="display-6 fw-bold">{display}</div>
          )}
        </div>

        <div className={`small mt-2 ${isError ? 'text-danger' : isEmpty ? 'text-muted' : 'text-muted'}`}>{helper}</div>
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

export default function AdminDashboardProduct() {
  const { token, userRole } = useOutletContext();
  // Phase 5.6/5.7 uses inline error text + existing UI; toast is only for refresh diagnostics.
  const toast = useToast();

  const accessProfile = useMemo(
    () => buildAccessProfile(token || '', userRole || ''),
    [token, userRole],
  );

  const [recentEvents, setRecentEvents] = useState([]);
  const [violations, setViolations] = useState([]);

  const [healthState, setHealthState] = useState({
    status: KPI_STATUS.LOADING,
    health: null,
    error: null,
    requestId: null,
  });

  const [kpiTodayReservations, setKpiTodayReservations] = useState({
    status: KPI_STATUS.LOADING,
    value: null,
    lastUpdatedAt: null,
    requestId: null,
    errorBrief: null,
  });
  const [kpiRecentEvents, setKpiRecentEvents] = useState({
    status: KPI_STATUS.LOADING,
    value: null,
    lastUpdatedAt: null,
    requestId: null,
    errorBrief: null,
  });
  const [kpiEnglishPending, setKpiEnglishPending] = useState({
    status: KPI_STATUS.LOADING,
    value: null,
    lastUpdatedAt: null,
    requestId: null,
    errorBrief: null,
  });
  const [kpiAnnouncementDraft, setKpiAnnouncementDraft] = useState({
    status: KPI_STATUS.LOADING,
    value: null,
    lastUpdatedAt: null,
    requestId: null,
    errorBrief: null,
  });

  const [eventsSectionStatus, setEventsSectionStatus] = useState(KPI_STATUS.LOADING);
  const [violationsSectionStatus, setViolationsSectionStatus] = useState(KPI_STATUS.LOADING);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      'X-User-Role': userRole || 'worker',
    }),
    [token, userRole],
  );

  const fetchTodayReservationsKpi = useCallback(async () => {
    if (!token) {
      setKpiTodayReservations({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId: null,
        errorBrief: '尚未登入',
      });
      return;
    }
    setKpiTodayReservations({ status: KPI_STATUS.LOADING, value: null, lastUpdatedAt: null, requestId: null, errorBrief: null });
    try {
      const res = await fetch('/api/reservations', { headers: authHeaders });
      const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
      if (!res.ok) {
        const err = new Error('API 請求失敗');
        err.requestId = requestId;
        err.errorBrief = 'API 請求失敗';
        throw err;
      }
      const data = await res.json();
      const today = new Date().toISOString().slice(0, 10);
      const count = Array.isArray(data)
        ? data.filter((r) => String(r.createdAt || r.timestamp || '').startsWith(today)).length
        : 0;

      const updatedAt = formatLocalDateTime(new Date());
      setKpiTodayReservations({
        status: count === 0 ? KPI_STATUS.EMPTY : KPI_STATUS.SUCCESS,
        value: count,
        lastUpdatedAt: updatedAt,
        requestId: null,
        errorBrief: null,
      });
    } catch (e) {
      const requestId = e?.requestId || null;
      const isTimeout = e?.name === 'AbortError' || e?.code === 'ECONNABORTED' || e?.errorBrief === '取得超時';
      setKpiTodayReservations({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId,
        errorBrief: isTimeout ? '取得超時' : 'API 請求失敗',
      });
    }
  }, [authHeaders, token]);

  const fetchRecentEventsKpi = useCallback(async () => {
    if (!token) {
      setKpiRecentEvents({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId: null,
        errorBrief: '尚未登入',
      });
      setEventsSectionStatus(KPI_STATUS.ERROR);
      return;
    }
    setKpiRecentEvents({ status: KPI_STATUS.LOADING, value: null, lastUpdatedAt: null, requestId: null, errorBrief: null });
    setEventsSectionStatus(KPI_STATUS.LOADING);
    try {
      const res = await fetch('/api/events', { headers: authHeaders });
      const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
      if (!res.ok) {
        const err = new Error('API 請求失敗');
        err.requestId = requestId;
        err.errorBrief = 'API 請求失敗';
        throw err;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const filtered = list.filter((evt) => withinNextDays(evt.date, 7));
      setRecentEvents(filtered.slice(0, 5));
      const count = filtered.length;

      const updatedAt = formatLocalDateTime(new Date());
      setKpiRecentEvents({
        status: count === 0 ? KPI_STATUS.EMPTY : KPI_STATUS.SUCCESS,
        value: count,
        lastUpdatedAt: updatedAt,
        requestId: null,
        errorBrief: null,
      });
      setEventsSectionStatus(count === 0 ? KPI_STATUS.EMPTY : KPI_STATUS.SUCCESS);
    } catch (e) {
      setRecentEvents([]);
      const requestId = e?.requestId || null;
      const isTimeout = e?.name === 'AbortError' || e?.code === 'ECONNABORTED' || e?.errorBrief === '取得超時';
      setKpiRecentEvents({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId,
        errorBrief: isTimeout ? '取得超時' : 'API 請求失敗',
      });
      setEventsSectionStatus(KPI_STATUS.ERROR);
    }
  }, [authHeaders, token]);

  const fetchEnglishPendingKpi = useCallback(async () => {
    if (!token) {
      setKpiEnglishPending({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId: null,
        errorBrief: '尚未登入',
      });
      return;
    }
    if (!hasPermission(accessProfile, P.CAN_VIEW_ENGLISH_TEST_METRICS)) {
      setKpiEnglishPending({
        status: KPI_STATUS.EMPTY,
        value: 0,
        lastUpdatedAt: null,
        requestId: null,
        errorBrief: null,
      });
      return;
    }
    setKpiEnglishPending({ status: KPI_STATUS.LOADING, value: null, lastUpdatedAt: null, requestId: null, errorBrief: null });
    try {
      const res = await fetch('/api/english-test/registrations/metrics/pending-count', { headers: authHeaders });
      const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
      if (!res.ok) {
        const err = new Error('API 請求失敗');
        err.requestId = requestId;
        err.errorBrief = 'API 請求失敗';
        throw err;
      }
      const j = await res.json();
      const total = typeof j?.count === 'number' ? j.count : 0;

      const updatedAt = formatLocalDateTime(new Date());
      setKpiEnglishPending({
        status: total === 0 ? KPI_STATUS.EMPTY : KPI_STATUS.SUCCESS,
        value: total,
        lastUpdatedAt: updatedAt,
        requestId: null,
        errorBrief: null,
      });
    } catch (e) {
      const requestId = e?.requestId || null;
      const isTimeout = e?.name === 'AbortError' || e?.code === 'ECONNABORTED' || e?.errorBrief === '取得超時';
      setKpiEnglishPending({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId,
        errorBrief: isTimeout ? '取得超時' : 'API 請求失敗',
      });
    }
  }, [authHeaders, token, accessProfile]);

  const fetchAnnouncementDraftKpi = useCallback(async () => {
    if (!token) {
      setKpiAnnouncementDraft({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId: null,
        errorBrief: '尚未登入',
      });
      return;
    }
    if (!hasPermission(accessProfile, P.CAN_MANAGE_ANNOUNCEMENTS)) {
      setKpiAnnouncementDraft({
        status: KPI_STATUS.EMPTY,
        value: 0,
        lastUpdatedAt: null,
        requestId: null,
        errorBrief: null,
      });
      return;
    }
    setKpiAnnouncementDraft({ status: KPI_STATUS.LOADING, value: null, lastUpdatedAt: null, requestId: null, errorBrief: null });
    try {
      // limit 不影響 total，只為減少資料量
      const res = await fetch('/api/admin/announcements?page=1&limit=1&status=draft', { headers: authHeaders });
      const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
      if (!res.ok) {
        const err = new Error('API 請求失敗');
        err.requestId = requestId;
        err.errorBrief = 'API 請求失敗';
        throw err;
      }
      const j = await res.json();
      const total =
        (typeof j?.pagination?.total === 'number' ? j.pagination.total : null) ??
        (typeof j?.total === 'number' ? j.total : null) ??
        (Array.isArray(j?.items) ? j.items.length : 0);

      const updatedAt = formatLocalDateTime(new Date());
      setKpiAnnouncementDraft({
        status: total === 0 ? KPI_STATUS.EMPTY : KPI_STATUS.SUCCESS,
        value: total,
        lastUpdatedAt: updatedAt,
        requestId: null,
        errorBrief: null,
      });
    } catch (e) {
      const requestId = e?.requestId || null;
      const isTimeout = e?.name === 'AbortError' || e?.code === 'ECONNABORTED' || e?.errorBrief === '取得超時';
      setKpiAnnouncementDraft({
        status: KPI_STATUS.ERROR,
        value: null,
        lastUpdatedAt: null,
        requestId,
        errorBrief: isTimeout ? '取得超時' : 'API 請求失敗',
      });
    }
  }, [authHeaders, token, accessProfile]);

  const fetchViolationsSection = useCallback(async () => {
    if (!token) {
      setViolations([]);
      setViolationsSectionStatus(KPI_STATUS.ERROR);
      return;
    }
    setViolationsSectionStatus(KPI_STATUS.LOADING);
    try {
      const semester = getSemesterInfo(new Date().toISOString().slice(0, 10));
      const res = await fetch(`/api/blacklist?semester=${encodeURIComponent(semester)}`, { headers: authHeaders });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();

      const list = j?.success ? (Array.isArray(j.data) ? j.data : []) : (Array.isArray(j) ? j : (Array.isArray(j?.data) ? j.data : []));
      setViolations(list);
      setViolationsSectionStatus(list.length === 0 ? KPI_STATUS.EMPTY : KPI_STATUS.SUCCESS);
    } catch (e) {
      setViolations([]);
      setViolationsSectionStatus(KPI_STATUS.ERROR);
    }
  }, [authHeaders, token]);

  useEffect(() => {
    // Phase 5.6/5.7: Each KPI has independent state; failures should not break the whole page.
    fetchTodayReservationsKpi();
    fetchRecentEventsKpi();
    fetchEnglishPendingKpi();
    fetchAnnouncementDraftKpi();
    fetchViolationsSection();
  }, [fetchTodayReservationsKpi, fetchRecentEventsKpi, fetchEnglishPendingKpi, fetchAnnouncementDraftKpi, fetchViolationsSection]);

  const loadHealth = useCallback(async () => {
    setHealthState({ status: KPI_STATUS.LOADING, health: null, error: null, requestId: null });
    try {
      const fault = getReliabilityFault();
      const devRid = makeDevRequestId('DEV');
      if (fault === 'healthFail') {
        const err = new Error('健康檢查失敗（dev fault）');
        err.requestId = devRid;
        throw err;
      }
      if (fault === 'healthSlowDb' || fault === 'healthSlowEmail') {
        const now = new Date();
        const isDbSlow = fault === 'healthSlowDb';
        const health = {
          status: 'ok',
          timestamp: now.toISOString(),
          services: {
            db: { status: 'ok', latencyMs: isDbSlow ? 650 : 35 },
            email: { status: 'ok', latencyMs: isDbSlow ? 260 : 650 },
          },
        };
        setHealthState({ status: KPI_STATUS.SUCCESS, health, error: null, requestId: devRid });
        return;
      }

      const res = await fetch('/api/health');
      const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json?.error || json?.message || '健康檢查失敗');
        err.requestId = requestId;
        err.status = res.status;
        throw err;
      }
      setHealthState({ status: KPI_STATUS.SUCCESS, health: json, error: null, requestId });
    } catch (e) {
      const requestId = e?.requestId || null;
      setHealthState({
        status: KPI_STATUS.ERROR,
        health: null,
        error: e?.message || '健康檢查失敗',
        requestId,
      });
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const kpiAllEmpty =
    kpiTodayReservations.status === KPI_STATUS.EMPTY &&
    kpiRecentEvents.status === KPI_STATUS.EMPTY &&
    kpiEnglishPending.status === KPI_STATUS.EMPTY &&
    kpiAnnouncementDraft.status === KPI_STATUS.EMPTY;

  const recentViolations = useMemo(() => violations.slice(0, 5), [violations]);

  const handleCardRefresh = useCallback(
    async (what) => {
      try {
        if (what === 'reservations') await fetchTodayReservationsKpi();
        if (what === 'events') await fetchRecentEventsKpi();
        if (what === 'english') await fetchEnglishPendingKpi();
        if (what === 'announcements') await fetchAnnouncementDraftKpi();
      } catch (e) {
        toast.warning('儀表板資料載入失敗，請稍後重試');
      }
    },
    [fetchAnnouncementDraftKpi, fetchEnglishPendingKpi, fetchRecentEventsKpi, fetchTodayReservationsKpi, toast],
  );

  return (
    <div>
      <div className="d-flex justify-content-end align-items-center mb-3">
        <Link to="/admin/settings/system" className="btn btn-outline-primary btn-sm">
          前往系統設定
        </Link>
      </div>

      <div className="alert alert-light border small mb-3">
        統計時間範圍語意：今日預約數＝今日 00:00 至目前；活動數＝近 7 天；英檢/公告依其狀態分類計算。
      </div>

      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
            <div>
              <div className="fw-semibold">系統狀態</div>
              <div className="small text-muted mt-1">用於快速判斷後端服務是否正常運作</div>
            </div>
            <div className="d-flex align-items-center gap-2">
              {healthState.status === KPI_STATUS.LOADING ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <div className="text-muted small">檢查中...</div>
                </>
              ) : healthState.status === KPI_STATUS.ERROR ? (
                <div className="text-danger fw-semibold">
                  異常
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 ms-2"
                    onClick={loadHealth}
                  >
                    請重新整理
                  </button>
                  {healthState.requestId ? (
                    <div className="small text-muted fw-normal mt-1">
                      requestId：{healthState.requestId}
                      {' '}
                      <Link to={`/admin/logs?requestId=${encodeURIComponent(healthState.requestId)}`}>查看操作紀錄</Link>
                    </div>
                  ) : null}
                </div>
              ) : (
                (() => {
                  const h = healthState.health || {};
                  const dbStatus = String(h.services?.db?.status || '').toLowerCase();
                  const emailStatus = String(h.services?.email?.status || '').toLowerCase();
                  const dbLatencyMs = h.services?.db?.latencyMs;
                  const emailLatencyMs = h.services?.email?.latencyMs;

                  const dbCat = latencyCategory(dbLatencyMs);
                  const emailCat = latencyCategory(emailLatencyMs);

                  // 判斷建議：db 掛掉或 db 偏慢/異常 => 異常（紅），避免 email 偏慢造成誤判全掛
                  const overall =
                    dbStatus !== 'ok' || dbCat === 'abnormal'
                      ? 'error'
                      : emailStatus !== 'ok' || emailCat !== 'normal'
                        ? 'partial'
                        : 'ok';

                  const label = overall === 'ok' ? '正常' : overall === 'partial' ? '部分異常' : '異常';
                  const cls = overall === 'ok' ? 'text-success' : overall === 'partial' ? 'text-warning' : 'text-danger';

                  const catText = (cat) =>
                    cat === 'normal' ? '正常' : cat === 'slow' ? '偏慢' : cat === 'abnormal' ? '異常' : 'N/A';

                  return (
                    <>
                      <div className={`fw-semibold ${cls}`}>{label}</div>
                      <div className="small text-muted">
                        DB：{dbStatus || 'N/A'} / 延遲 {dbLatencyMs == null ? 'N/A' : `${Math.round(dbLatencyMs)}ms`}（{catText(dbCat)}）<br />
                        Email：{emailStatus || 'N/A'} / 延遲{' '}
                        {emailLatencyMs == null ? 'N/A' : `${Math.round(emailLatencyMs)}ms`}（{catText(emailCat)}）
                        {healthState.requestId ? ` / requestId: ${healthState.requestId}` : ''}
                      </div>
                    </>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>

      {kpiAllEmpty ? (
        <div className="alert alert-info border mb-4" role="status">
          <div className="fw-semibold">目前尚無資料</div>
          <div className="small text-muted mt-1">請新增活動或開始使用系統。</div>
          <div className="mt-3">
            <Link to="/admin/operations" className="btn btn-outline-primary btn-sm">
              前往活動管理
            </Link>
          </div>
        </div>
      ) : null}

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="今日預約數"
            timeLabel="今日"
            status={kpiTodayReservations.status}
            value={kpiTodayReservations.value}
            hint="時間範圍：今日 00:00 至現在（依預約建立時間）"
            diagnostic={{
              source: '資料來源：GET /api/reservations（統計今日預約數）',
              lastUpdatedAt: kpiTodayReservations.lastUpdatedAt,
              requestId: kpiTodayReservations.requestId,
              errorBrief: kpiTodayReservations.errorBrief,
            }}
            onRefresh={() => handleCardRefresh('reservations')}
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="活動數"
            timeLabel="近 7 天"
            status={kpiRecentEvents.status}
            value={kpiRecentEvents.value}
            hint="時間範圍：近 7 天內（以活動日期判斷）"
            diagnostic={{
              source: '資料來源：GET /api/events（統計近 7 天活動數）',
              lastUpdatedAt: kpiRecentEvents.lastUpdatedAt,
              requestId: kpiRecentEvents.requestId,
              errorBrief: kpiRecentEvents.errorBrief,
            }}
            onRefresh={() => handleCardRefresh('events')}
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="英檢待審核"
            timeLabel="待處理"
            status={kpiEnglishPending.status}
            value={kpiEnglishPending.value}
            hint="時間範圍：目前狀態為 pending 的報名"
            diagnostic={{
              source: '資料來源：GET /api/english-test/registrations/metrics/pending-count',
              lastUpdatedAt: kpiEnglishPending.lastUpdatedAt,
              requestId: kpiEnglishPending.requestId,
              errorBrief: kpiEnglishPending.errorBrief,
            }}
            onRefresh={() => handleCardRefresh('english')}
          />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <KpiCard
            title="公告草稿數"
            timeLabel="草稿總數"
            status={kpiAnnouncementDraft.status}
            value={kpiAnnouncementDraft.value}
            hint="時間範圍：目前狀態為 draft 的公告"
            diagnostic={{
              source: '資料來源：GET /api/admin/announcements?status=draft（統計草稿數）',
              lastUpdatedAt: kpiAnnouncementDraft.lastUpdatedAt,
              requestId: kpiAnnouncementDraft.requestId,
              errorBrief: kpiAnnouncementDraft.errorBrief,
            }}
            onRefresh={() => handleCardRefresh('announcements')}
          />
        </div>
      </div>

      <h5 className="mb-3">快速入口</h5>
      <div className="row g-3 mb-4">
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/operations" title="活動管理" desc="活動報表、預約管理、簽到與匯入" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/announcements" title="公告管理" desc="公告建立、發布、置頂" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/surveys" title="問卷管理" desc="問卷統計與匯出" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/english-test" title="英檢管理" desc="英檢報名審核與狀態管理" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/violations" title="違規管理" desc="違規紀錄與黑名單關聯" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/reports" title="報表 / 匯出" desc="跨模組報表與資料下載" />
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <QuickLinkCard to="/admin/settings/system" title="系統設定" desc="報名開關、feature flags、設定入口" />
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-6">
          <div className="card shadow-sm h-100">
            <div className="card-header">最近活動</div>
            <div className="card-body">
              <div className="text-muted small mb-2">顯示範圍：近 7 天內的活動（最近 5 筆）</div>
              {eventsSectionStatus === KPI_STATUS.LOADING ? (
                <div className="d-flex align-items-center gap-2">
                  <Spinner animation="border" size="sm" role="status" />
                  <div className="text-muted small">載入中</div>
                </div>
              ) : eventsSectionStatus === KPI_STATUS.ERROR ? (
                <div className="alert alert-warning py-2 mb-0">
                  活動資料暫時無法取得。
                  <Button variant="link" className="p-0 ms-2" onClick={() => handleCardRefresh('events')}>
                    請重新整理
                  </Button>
                </div>
              ) : recentEvents.length === 0 ? (
                <div>
                  <div className="text-muted small">尚未有活動</div>
                  <div className="mt-3">
                    <Link to="/admin/operations" className="btn btn-outline-primary btn-sm">
                      前往建立第一個活動
                    </Link>
                  </div>
                </div>
              ) : (
                <ul className="list-group list-group-flush">
                  {recentEvents.map((e) => (
                    <li key={e.id} className="list-group-item px-0">
                      <div className="fw-semibold">{e.name}</div>
                      <div className="small text-muted">
                        {e.date} {e.startTime} - {e.endTime}
                      </div>
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
              <div className="text-muted small mb-2">顯示範圍：依學期的違規相關提醒（最近 5 筆）</div>
              {violationsSectionStatus === KPI_STATUS.LOADING ? (
                <div className="d-flex align-items-center gap-2">
                  <Spinner animation="border" size="sm" role="status" />
                  <div className="text-muted small">載入中</div>
                </div>
              ) : violationsSectionStatus === KPI_STATUS.ERROR ? (
                <div className="alert alert-warning py-2 mb-0">
                  違規資料暫時無法取得。
                  <Button variant="link" className="p-0 ms-2" onClick={fetchViolationsSection}>
                    請重新整理
                  </Button>
                </div>
              ) : recentViolations.length === 0 ? (
                <div className="text-muted small">目前沒有待處理項目 🎉</div>
              ) : (
                <ul className="list-group list-group-flush">
                  {recentViolations.map((v, idx) => (
                    <li key={`${v.id || idx}`} className="list-group-item px-0">
                      <div className="fw-semibold">
                        {v.studentId || '未知學號'} {v.studentName || ''}
                      </div>
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

