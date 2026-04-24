import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Form, Spinner, Alert } from 'react-bootstrap';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

import dayjs from 'dayjs';
import { getCurrentSemester, SEMESTER_OPTIONS } from '../../utils/semesterUtils';
import { fetchClient } from '../../utils/fetchClient';

function KpiCard({ title, value, suffix = '' }) {
  return (
    <div className="col-12 col-md-3">
      <Card className="h-100">
        <Card.Body>
          <div className="text-muted small">{title}</div>
          <div className="fs-4 fw-semibold">
            {value}
            {suffix}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const dt = dayjs(dateStr);
  if (!dt.isValid()) return String(dateStr);
  return dt.format('MM/DD');
}

export default function AdminAnalyticsPage() {
  const outlet = useOutletContext() || {};
  const token = outlet.token || localStorage.getItem('token');

  const [semester, setSemester] = useState(getCurrentSemester() || '114-1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [overview, setOverview] = useState(null);
  const [activityTrend, setActivityTrend] = useState([]);
  const [attendanceTrend, setAttendanceTrend] = useState([]);
  const [classRankings, setClassRankings] = useState([]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    setOverview(null);
    setActivityTrend([]);
    setAttendanceTrend([]);
    setClassRankings([]);

    try {
      const authHeader = { Authorization: `Bearer ${token}` };
      const kind = 'reservation';
      const sem = encodeURIComponent(semester);

      const [
        overviewRes,
        trendsRes,
        eventsRes,
        classesRes,
      ] = await Promise.all([
        fetchClient(`/api/analytics/overview?semester=${sem}&kind=${encodeURIComponent(kind)}`, { headers: authHeader }),
        fetchClient(`/api/analytics/trends?semester=${sem}&kind=${encodeURIComponent(kind)}`, { headers: authHeader }),
        fetchClient(`/api/analytics/events?semester=${sem}`, { headers: authHeader }),
        fetchClient(`/api/analytics/classes?semester=${sem}`, { headers: authHeader }),
      ]);

      const getJsonOrThrow = async (res) => {
        const json = await res.json().catch(() => ({}));
        if (res.ok) return json;
        const rid = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
        const msg = json?.error || json?.message || '載入失敗';
        throw new Error(rid ? `${msg}（錯誤識別碼：${rid}）` : msg);
      };

      const [overviewJson, trendsJson, eventsJson, classesJson] = await Promise.all([
        getJsonOrThrow(overviewRes),
        getJsonOrThrow(trendsRes),
        getJsonOrThrow(eventsRes),
        getJsonOrThrow(classesRes),
      ]);

      setOverview(overviewJson || null);
      setActivityTrend(trendsJson?.activityTrend || []);
      setAttendanceTrend(eventsJson?.attendanceTrend || []);
      setClassRankings(classesJson?.rankings || []);
    } catch (e) {
      setError(e?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [token, semester]);

  useEffect(() => {
    load();
  }, [load]);

  const kpis = useMemo(() => {
    if (!overview) {
      return {
        totalReservations: 0,
        attendanceRate: 0,
        violationRate: 0,
        englishPassRate: 0,
      };
    }
    return {
      totalReservations: Number(overview.totalReservations || 0),
      attendanceRate: Number(overview.attendanceRate || 0),
      violationRate: Number(overview.violationRate || 0),
      englishPassRate: Number(overview.englishPassRate || 0),
    };
  }, [overview]);

  const activityChartData = useMemo(() => {
    return (activityTrend || []).map((p) => ({
      date: formatDateLabel(p.date),
      reservationsCount: Number(p.reservationsCount || 0),
      rawDate: p.date,
    }));
  }, [activityTrend]);

  const attendanceChartData = useMemo(() => {
    return (attendanceTrend || []).map((p) => ({
      date: formatDateLabel(p.date),
      attendanceRate: Number(p.attendanceRate || 0),
      rawDate: p.date,
    }));
  }, [attendanceTrend]);

  const classChartData = useMemo(() => {
    // BarChart x 軸字串過長時會擠；這裡優先用短名 classId
    return (classRankings || []).map((c) => ({
      classKey: c.className ? c.className : `Class ${c.classId}`,
      classId: c.classId,
      violationRate: Number(c.violationRate || 0),
      attendanceRate: Number(c.attendanceRate || 0),
      reservationsCount: Number(c.reservationsCount || 0),
    }));
  }, [classRankings]);

  return (
    <div className="container-fluid px-2 px-md-3">
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <p className="text-muted small mb-0">依學期檢視預約、出席、違規與英檢指標。</p>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <Form.Select value={semester} onChange={(e) => setSemester(e.target.value)} style={{ width: 180 }}>
            {SEMESTER_OPTIONS.filter((o) => o.value).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Form.Select>
        </div>
      </div>

      {loading && (
        <div className="text-center py-5" role="status" aria-busy="true">
          <Spinner animation="border" />
        </div>
      )}

      {error && !loading && <Alert variant="danger">{error}</Alert>}

      {!loading && !error && (
        <>
          <div className="row g-3 mb-3">
            <KpiCard title="總預約數" value={kpis.totalReservations} />
            <KpiCard title="出席率" value={kpis.attendanceRate} suffix="%" />
            <KpiCard title="違規率" value={kpis.violationRate} suffix="%" />
            <KpiCard title="英檢通過率" value={kpis.englishPassRate} suffix="%" />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12 col-lg-6">
              <Card className="h-100">
                <Card.Header>活動趨勢（依活動日期）</Card.Header>
                <Card.Body style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={activityChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" minTickGap={20} />
                      <YAxis />
                      <Tooltip formatter={(v) => [`${v} 筆`, '預約數']} labelFormatter={() => ''} />
                      <Line type="monotone" dataKey="reservationsCount" stroke="#0d6efd" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </div>

            <div className="col-12 col-lg-6">
              <Card className="h-100">
                <Card.Header>出席率（依活動日期）</Card.Header>
                <Card.Body style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={attendanceChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" minTickGap={20} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v) => [`${v}%`, '出席率']} labelFormatter={() => ''} />
                      <Line type="monotone" dataKey="attendanceRate" stroke="#198754" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </div>
          </div>

          <div className="row g-3 mb-3">
            <div className="col-12">
              <Card className="h-100">
                <Card.Header>班級排行（Top 10，依違規率由高到低）</Card.Header>
                <Card.Body style={{ height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={classChartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="classKey" interval={0} tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <Tooltip
                        formatter={(v, name, props) => {
                          const key = props?.payload;
                          const label = name === 'violationRate' ? '違規率' : name;
                          return [`${v}%`, label];
                        }}
                      />
                      <Bar dataKey="violationRate" fill="#dc3545" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

