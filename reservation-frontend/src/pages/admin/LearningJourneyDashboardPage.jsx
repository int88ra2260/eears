import React, { useEffect, useMemo, useState } from 'react';
import B2KpiSection from '../../components/learningJourneyV3/B2KpiSection';
import BreakdownTabs from '../../components/learningJourneyV3/BreakdownTabs';
import BreakdownTable from '../../components/learningJourneyV3/BreakdownTable';
import StudentTable from '../../components/learningJourneyV3/StudentTable';
import {
  getLearningJourneyV3B2Report,
  getLearningJourneyV3Breakdown,
  getLearningJourneyV3Students,
} from '../../services/learningJourneyV3Api';

const RECENT_KEY = 'learning_journey_v3_recent_semesters';

function parseJwtPayload(token) {
  try {
    if (!token) return null;
    const parts = String(token).split('.');
    if (parts.length < 2) return null;
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(raw)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

function uniquePush(list, value) {
  return [value, ...list.filter((v) => v !== value)].slice(0, 12);
}

export default function LearningJourneyDashboardPage() {
  const token = localStorage.getItem('token') || '';
  const userRole = (localStorage.getItem('userRole') || '').toLowerCase();
  const tokenPayload = parseJwtPayload(token) || {};
  const teacherLevel = String(tokenPayload.teacherLevel || '').toLowerCase();
  const teacherView = userRole === 'teacher' && teacherLevel !== 'executive';
  const [semesterId, setSemesterId] = useState('');
  const [recentSemesters, setRecentSemesters] = useState([]);
  const [activeBreakdown, setActiveBreakdown] = useState('grade');

  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiError, setKpiError] = useState('');
  const [b2Report, setB2Report] = useState(null);

  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState('');
  const [students, setStudents] = useState([]);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState('');
  const [breakdownRows, setBreakdownRows] = useState([]);

  useEffect(() => {
    try {
      const fromStorage = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
      const list = Array.isArray(fromStorage) ? fromStorage.filter(Boolean) : [];
      setRecentSemesters(list);
      if (list.length > 0) setSemesterId(list[0]);
    } catch (_) {
      setRecentSemesters([]);
    }
  }, []);

  const normalizedBreakdownRows = useMemo(
    () =>
      (breakdownRows || []).map((row) => ({
        key: `${activeBreakdown}-${row.group}`,
        label: row.group,
        count: row.totalStudents,
        skills: row.skills || {}
      })),
    [breakdownRows, activeBreakdown]
  );

  const saveRecent = (id) => {
    const next = uniquePush(recentSemesters, id);
    setRecentSemesters(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  };

  const loadData = async () => {
    const sem = String(semesterId || '').trim();
    if (!sem) return;
    saveRecent(sem);

    setKpiLoading(true);
    setKpiError('');
    setStudentsLoading(true);
    setStudentsError('');

    try {
      const data = await getLearningJourneyV3B2Report(token, sem);
      setB2Report(data || null);
    } catch (err) {
      setB2Report(null);
      setKpiError(err.message || '讀取 B2 KPI 失敗');
    } finally {
      setKpiLoading(false);
    }

    try {
      const data = await getLearningJourneyV3Students(token, sem, { limit: 200, offset: 0 });
      setStudents(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setStudents([]);
      setStudentsError(err.message || '讀取學生清單失敗');
    } finally {
      setStudentsLoading(false);
    }

    setBreakdownLoading(true);
    setBreakdownError('');
    try {
      const data = await getLearningJourneyV3Breakdown(token, sem, activeBreakdown);
      setBreakdownRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setBreakdownRows([]);
      setBreakdownError(err.message || '讀取 Breakdown 失敗');
    } finally {
      setBreakdownLoading(false);
    }
  };

  useEffect(() => {
    const sem = String(semesterId || '').trim();
    if (!sem) return;
    setBreakdownLoading(true);
    setBreakdownError('');
    getLearningJourneyV3Breakdown(token, sem, activeBreakdown)
      .then((data) => setBreakdownRows(Array.isArray(data) ? data : []))
      .catch((err) => {
        setBreakdownRows([]);
        setBreakdownError(err.message || '讀取 Breakdown 失敗');
      })
      .finally(() => setBreakdownLoading(false));
  }, [token, semesterId, activeBreakdown]);

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-1">{teacherView ? '我的授課學生學習歷程' : '全校學習歷程總覽'}</h4>
          <p className="text-muted mb-0">使用 V3 API 顯示學期 B2 指標、breakdown 與學生清單。</p>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small mb-1">Semester</label>
              <input
                list="lj-v3-semesters"
                className="form-control"
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                placeholder="例如 114-1"
              />
              <datalist id="lj-v3-semesters">
                {recentSemesters.map((id) => (
                  <option value={id} key={id} />
                ))}
              </datalist>
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-primary w-100" onClick={loadData} disabled={!semesterId || kpiLoading || studentsLoading}>
                載入 Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-semibold">B2 KPI（四技能）</div>
        <div className="card-body">
          <B2KpiSection loading={kpiLoading} report={b2Report} error={kpiError} />
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header fw-semibold">Breakdown</div>
        <div className="card-body">
          <BreakdownTabs activeTab={activeBreakdown} onChange={setActiveBreakdown} />
          <div className="mt-3">
            <BreakdownTable
              loading={breakdownLoading}
              error={breakdownError}
              rows={normalizedBreakdownRows}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header fw-semibold">Student Table</div>
        <div className="card-body">
          <StudentTable
            loading={studentsLoading}
            error={studentsError}
            students={students}
            semesterId={semesterId}
          />
        </div>
      </div>
    </div>
  );
}
