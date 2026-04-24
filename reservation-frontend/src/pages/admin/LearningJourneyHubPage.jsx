import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getLearningJourneyProfile,
  getLearningJourneySemesterDashboard,
  getLearningJourneyReconciliation,
  getLearningJourneyReadiness,
  getLearningJourneyEnglishTestSummaryCompare,
  getLearningJourneyEnglishTestStudentsCompare,
  getLearningJourneyEnglishTestStudentDetailCompare,
  postLearningJourneySync,
} from '../../services/learningJourneyApi';

const EMPTY = '—';

const SYNC_SECTION_OPTIONS = [
  { key: 'roster', label: '名冊 → student_semester_profiles' },
  { key: 'exam_registration', label: '培力報名 → exam_registrations（system）' },
  { key: 'bestep_scores', label: 'BESTEP 成績 → exam_attempts' },
  { key: 'activities', label: '預約／活動 → activity_participations' },
];

function hasCode(dataQuality, code) {
  return Array.isArray(dataQuality) && dataQuality.some((q) => q && q.code === code);
}

/** diff 全為 0，或人數差 ≤1 且達成率差 ≤0.001 時視為可試切換評估 */
function isTrialSwitchHintRow(comparePayload) {
  if (!comparePayload || comparePayload.status === 'error' || !comparePayload.diff) return false;
  const d = comparePayload.diff;
  const allZero =
    d.rosterActiveStudentCount === 0 &&
    d.validBestScoreStudentCount === 0 &&
    d.attainedStudentCount === 0 &&
    Number(d.attainmentRate || 0) === 0;
  const rateOk = Math.abs(Number(d.attainmentRate || 0)) <= 0.001;
  const countsTight =
    Math.abs(d.rosterActiveStudentCount || 0) <= 1 &&
    Math.abs(d.validBestScoreStudentCount || 0) <= 1 &&
    Math.abs(d.attainedStudentCount || 0) <= 1;
  return allZero || (countsTight && rateOk);
}

/** 學生列表 diff 筆數 <5 且佔比 <5% 時視為可試切換 */
function isStudentsListTrialHint(payload) {
  if (!payload || payload.status === 'error') return false;
  const dc = Number(payload.diffCount || 0);
  const maxC = Math.max(Number(payload.legacyCount || 0), Number(payload.v3Count || 0), 1);
  return dc < 5 && dc / maxC < 0.05;
}

export default function LearningJourneyHubPage() {
  const token = localStorage.getItem('token') || '';
  const [studentInput, setStudentInput] = useState('');
  const [semesterInput, setSemesterInput] = useState('114-1');
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [searched, setSearched] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [reconData, setReconData] = useState(null);
  const [reconLoading, setReconLoading] = useState(false);
  const [reconError, setReconError] = useState('');
  const [reconRequestId, setReconRequestId] = useState('');
  const [syncSectionsSel, setSyncSectionsSel] = useState(() =>
    SYNC_SECTION_OPTIONS.reduce((acc, s) => {
      acc[s.key] = true;
      return acc;
    }, {})
  );
  const [syncResult, setSyncResult] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [syncRequestId, setSyncRequestId] = useState('');
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareError, setCompareError] = useState('');
  const [compareRequestId, setCompareRequestId] = useState('');
  const [studCompareData, setStudCompareData] = useState(null);
  const [studCompareLoading, setStudCompareLoading] = useState(false);
  const [studCompareError, setStudCompareError] = useState('');
  const [studCompareRequestId, setStudCompareRequestId] = useState('');
  const [detailCompareStudentInput, setDetailCompareStudentInput] = useState('');
  const [detailCompareData, setDetailCompareData] = useState(null);
  const [detailCompareLoading, setDetailCompareLoading] = useState(false);
  const [detailCompareError, setDetailCompareError] = useState('');
  const [detailCompareRequestId, setDetailCompareRequestId] = useState('');
  const [readinessData, setReadinessData] = useState(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState('');
  const [readinessRequestId, setReadinessRequestId] = useState('');

  const loadProfile = useCallback(async () => {
    const sid = studentInput.trim();
    if (!sid) {
      setError('請輸入學號');
      setRequestId('');
      return;
    }
    setLoading(true);
    setError('');
    setRequestId('');
    setSearched(true);
    try {
      const data = await getLearningJourneyProfile(token, sid);
      setProfile(data);
    } catch (e) {
      setProfile(null);
      setError(e.message || '載入失敗');
      setRequestId(e.requestId || '');
    } finally {
      setLoading(false);
    }
  }, [studentInput, token]);

  const selectedSyncSections = useCallback(() => {
    return SYNC_SECTION_OPTIONS.map((s) => s.key).filter((k) => syncSectionsSel[k]);
  }, [syncSectionsSel]);

  const runLearningJourneySync = useCallback(
    async (dryRun) => {
      const sem = semesterInput.trim();
      if (!sem) {
        setSyncError('請輸入學期代碼');
        setSyncRequestId('');
        return;
      }
      const sections = selectedSyncSections();
      if (sections.length === 0) {
        setSyncError('請至少勾選一個同步區塊');
        setSyncRequestId('');
        return;
      }
      setSyncLoading(true);
      setSyncError('');
      setSyncRequestId('');
      try {
        const data = await postLearningJourneySync(token, { semesterId: sem, sections, dryRun });
        setSyncResult(data);
      } catch (e) {
        setSyncResult(null);
        setSyncError(e.message || '同步失敗');
        setSyncRequestId(e.requestId || '');
      } finally {
        setSyncLoading(false);
      }
    },
    [semesterInput, selectedSyncSections, token]
  );

  const applySyncThenReconcile = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setSyncError('請輸入學期代碼');
      setSyncRequestId('');
      return;
    }
    const sections = selectedSyncSections();
    if (sections.length === 0) {
      setSyncError('請至少勾選一個同步區塊');
      setSyncRequestId('');
      return;
    }
    setSyncLoading(true);
    setSyncError('');
    setSyncRequestId('');
    setReconError('');
    setReconRequestId('');
    try {
      const data = await postLearningJourneySync(token, { semesterId: sem, sections, dryRun: false });
      setSyncResult(data);
    } catch (e) {
      setSyncError(e.message || '同步失敗');
      setSyncRequestId(e.requestId || '');
      setSyncLoading(false);
      return;
    }
    try {
      const recon = await getLearningJourneyReconciliation(token, sem);
      setReconData(recon);
    } catch (e) {
      setReconError(e.message || '對帳載入失敗');
      setReconRequestId(e.requestId || '');
    } finally {
      setSyncLoading(false);
    }
  }, [semesterInput, selectedSyncSections, token]);

  const loadEnglishTestSummaryCompare = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setCompareError('請輸入學期代碼');
      setCompareRequestId('');
      return;
    }
    setCompareLoading(true);
    setCompareError('');
    setCompareRequestId('');
    try {
      const data = await getLearningJourneyEnglishTestSummaryCompare(token, sem);
      setCompareData(data);
    } catch (e) {
      setCompareData(null);
      setCompareError(e.message || '比較載入失敗');
      setCompareRequestId(e.requestId || '');
    } finally {
      setCompareLoading(false);
    }
  }, [semesterInput, token]);

  const loadEnglishTestStudentsCompare = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setStudCompareError('請輸入學期代碼');
      setStudCompareRequestId('');
      return;
    }
    setStudCompareLoading(true);
    setStudCompareError('');
    setStudCompareRequestId('');
    try {
      const data = await getLearningJourneyEnglishTestStudentsCompare(token, sem);
      setStudCompareData(data);
    } catch (e) {
      setStudCompareData(null);
      setStudCompareError(e.message || '學生列表比較失敗');
      setStudCompareRequestId(e.requestId || '');
    } finally {
      setStudCompareLoading(false);
    }
  }, [semesterInput, token]);

  const loadEnglishTestStudentDetailCompare = useCallback(async () => {
    const sem = semesterInput.trim();
    const sid = detailCompareStudentInput.trim();
    if (!sem) {
      setDetailCompareError('請輸入學期代碼（與上方「學期」共用）');
      setDetailCompareRequestId('');
      return;
    }
    if (!sid) {
      setDetailCompareError('請輸入學號');
      setDetailCompareRequestId('');
      return;
    }
    setDetailCompareLoading(true);
    setDetailCompareError('');
    setDetailCompareRequestId('');
    try {
      const data = await getLearningJourneyEnglishTestStudentDetailCompare(token, sem, sid);
      setDetailCompareData(data);
    } catch (e) {
      setDetailCompareData(null);
      setDetailCompareError(e.message || '學生詳情比較失敗');
      setDetailCompareRequestId(e.requestId || '');
    } finally {
      setDetailCompareLoading(false);
    }
  }, [semesterInput, detailCompareStudentInput, token]);

  const loadReconciliation = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setReconError('請輸入學期代碼');
      setReconRequestId('');
      return;
    }
    setReconLoading(true);
    setReconError('');
    setReconRequestId('');
    try {
      const data = await getLearningJourneyReconciliation(token, sem);
      setReconData(data);
    } catch (e) {
      setReconData(null);
      setReconError(e.message || '對帳載入失敗');
      setReconRequestId(e.requestId || '');
    } finally {
      setReconLoading(false);
    }
  }, [semesterInput, token]);

  const loadReadiness = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setReadinessError('請輸入學期代碼');
      setReadinessRequestId('');
      return;
    }
    setReadinessLoading(true);
    setReadinessError('');
    setReadinessRequestId('');
    try {
      const data = await getLearningJourneyReadiness(token, sem);
      setReadinessData(data);
    } catch (e) {
      setReadinessData(null);
      setReadinessError(e.message || '準備度檢查失敗');
      setReadinessRequestId(e.requestId || '');
    } finally {
      setReadinessLoading(false);
    }
  }, [semesterInput, token]);

  const loadDashboard = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setError('請輸入學期代碼');
      setRequestId('');
      return;
    }
    setLoading(true);
    setError('');
    setRequestId('');
    try {
      const data = await getLearningJourneySemesterDashboard(token, sem);
      setDashboard(data);
    } catch (e) {
      setDashboard(null);
      setError(e.message || '載入失敗');
      setRequestId(e.requestId || '');
    } finally {
      setLoading(false);
    }
  }, [semesterInput, token]);

  const st = profile?.student || {};
  const flags = st.aggregateFlags || {};
  const timeline = Array.isArray(profile?.timeline) ? profile.timeline : [];
  const attempts = Array.isArray(profile?.examAttempts) ? profile.examAttempts : [];
  const activities = Array.isArray(profile?.activities) ? profile.activities : [];
  const regs = Array.isArray(profile?.examRegistrations) ? profile.examRegistrations : [];
  const dq = Array.isArray(profile?.dataQuality) ? profile.dataQuality : [];

  const noStudent = searched && profile && hasCode(dq, 'NO_STUDENT_AGGREGATE');
  const noExamHint = profile && hasCode(dq, 'NO_EXAM_AGGREGATE');
  const noActivityHint = profile && hasCode(dq, 'NO_ACTIVITY_AGGREGATE');

  const hasExamData =
    flags.hasExamRegistrations ||
    flags.hasEtExamAttempts ||
    flags.hasBestepScores ||
    flags.hasBestSkills ||
    flags.hasBestepAttendance;
  const hasActivityData =
    flags.hasReservations || flags.hasActivityParticipations || flags.hasBestepAttendance;

  return (
    <div className="container-fluid py-3">
      <h4 className="mb-2">英語學習歷程中心</h4>
      <p className="text-muted small mb-3">
        唯讀聚合（v3）：資料來自 et_*、培力報名、BESTEP、預約與 LJS。審核與匯入請仍使用既有後台功能。
      </p>

      <div className="row g-2 mb-3 align-items-end">
        <div className="col-md-4">
          <label className="form-label small mb-0">學號</label>
          <input
            className="form-control form-control-sm"
            value={studentInput}
            onChange={(e) => setStudentInput(e.target.value)}
            placeholder="例如：D11400001"
          />
        </div>
        <div className="col-md-2">
          <button type="button" className="btn btn-primary btn-sm w-100" disabled={loading} onClick={loadProfile}>
            載入
          </button>
        </div>
        <div className="col-md-3">
          <label className="form-label small mb-0">學期（全校摘要）</label>
          <input
            className="form-control form-control-sm"
            value={semesterInput}
            onChange={(e) => setSemesterInput(e.target.value)}
            placeholder="114-1"
          />
        </div>
        <div className="col-md-2">
          <button type="button" className="btn btn-outline-secondary btn-sm w-100" disabled={loading} onClick={loadDashboard}>
            學期摘要
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">切換準備度（V2 read model → v3）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            整合對帳、儀表摘要 compare、學生列表 compare、以及最多 10 位學生之詳情 compare，產出 <code>ready</code>／<code>not_ready</code>／<code>error</code>。
            不會修改 <code>.env</code> 或自動開啟 <code>ENABLE_LEARNING_JOURNEY_V3_READ_MODEL</code>。請使用與下方相同的<strong>學期</strong>代碼。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={readinessLoading} onClick={loadReadiness}>
            {readinessLoading ? '檢查中…' : '執行 readiness check'}
          </button>
          {readinessError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {readinessError}
              {readinessRequestId ? <div className="small mt-1">Request-ID：{readinessRequestId}</div> : null}
            </div>
          )}
          {readinessData && (
            <div className="mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted">整體狀態</span>
                <span
                  className={`badge ${
                    readinessData.status === 'ready'
                      ? 'bg-success'
                      : readinessData.status === 'not_ready'
                        ? 'bg-warning text-dark'
                        : 'bg-danger'
                  }`}
                >
                  {readinessData.status}
                </span>
              </div>
              {readinessData.recommendation ? (
                <div
                  className={`alert py-2 mb-2 ${
                    readinessData.status === 'ready' ? 'alert-success' : readinessData.status === 'not_ready' ? 'alert-warning' : 'alert-danger'
                  }`}
                >
                  <div className="fw-semibold mb-1">建議</div>
                  <div className="mb-0">{readinessData.recommendation}</div>
                </div>
              ) : null}
              {Array.isArray(readinessData.checks) && readinessData.checks.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>key</th>
                        <th>label</th>
                        <th>status</th>
                        <th>message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readinessData.checks.map((c) => (
                        <tr key={c.key}>
                          <td className="font-monospace">{c.key}</td>
                          <td>{c.label}</td>
                          <td>
                            <span
                              className={`badge ${
                                c.status === 'ok' ? 'bg-success' : c.status === 'warning' ? 'bg-warning text-dark' : 'bg-danger'
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="text-break">{c.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {readinessData.checks?.some((c) => c.metrics && Object.keys(c.metrics).length > 0) ? (
                <details className="mt-2">
                  <summary className="text-muted" style={{ cursor: 'pointer' }}>
                    metrics（JSON）
                  </summary>
                  <pre className="small bg-light p-2 rounded mt-1 mb-0 text-break" style={{ maxHeight: 240, overflow: 'auto' }}>
                    {JSON.stringify(
                      readinessData.checks.map((c) => ({ key: c.key, metrics: c.metrics })),
                      null,
                      2
                    )}
                  </pre>
                </details>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">資料對帳</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            使用上方<strong>學期</strong>代碼，比對 et 名冊、培力報名、BESTEP、長期追蹤與活動等來源與 LJS 聚合表之差異（唯讀）。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={reconLoading} onClick={loadReconciliation}>
            {reconLoading ? '對帳中…' : '執行對帳'}
          </button>
          {reconError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {reconError}
              {reconRequestId ? <div className="small mt-1">Request-ID：{reconRequestId}</div> : null}
            </div>
          )}
          {reconData && Array.isArray(reconData.queryErrors) && reconData.queryErrors.length > 0 && (
            <div className="alert alert-warning py-2 mt-2 mb-0 small">
              部分查詢錯誤：{reconData.queryErrors.map((e) => e.message).join('；')}
            </div>
          )}
          {reconData && Array.isArray(reconData.sections) && reconData.sections.length > 0 && (
            <div className="table-responsive mt-3">
              <table className="table table-sm table-bordered mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>區塊</th>
                    <th>來源筆數</th>
                    <th>聚合筆數</th>
                    <th>交集</th>
                    <th>狀態</th>
                  </tr>
                </thead>
                <tbody>
                  {reconData.sections.map((s) => {
                    const diff0 =
                      (s.sourceOnlyStudents || []).length === 0 &&
                      (s.aggregateOnlyStudents || []).length === 0 &&
                      s.sourceCount === s.aggregateCount;
                    return (
                      <React.Fragment key={s.key}>
                        <tr>
                          <td>
                            <div className="fw-medium">{s.label}</div>
                            <div className="text-muted text-break" style={{ fontSize: '0.75rem' }}>
                              {s.key}
                            </div>
                          </td>
                          <td>{s.sourceCount}</td>
                          <td>{s.aggregateCount}</td>
                          <td>{s.matchedCount}</td>
                          <td>
                            <span
                              className={`badge ${
                                s.status === 'ok'
                                  ? 'bg-success'
                                  : s.status === 'warning'
                                    ? 'bg-warning text-dark'
                                    : s.status === 'error'
                                      ? 'bg-danger'
                                      : 'bg-secondary'
                              }`}
                            >
                              {s.status}
                            </span>
                            {diff0 ? <div className="text-success mt-1">資料一致</div> : null}
                          </td>
                        </tr>
                        {!diff0 && (
                          <tr>
                            <td colSpan={5} className="bg-light">
                              <div className="row g-2">
                                <div className="col-md-6">
                                  <div className="text-muted">僅來源有（最多顯示 30）</div>
                                  <div className="font-monospace text-break" style={{ maxHeight: 120, overflow: 'auto' }}>
                                    {(s.sourceOnlyStudents || []).slice(0, 30).join(', ') || EMPTY}
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="text-muted">僅聚合有（最多顯示 30）</div>
                                  <div className="font-monospace text-break" style={{ maxHeight: 120, overflow: 'auto' }}>
                                    {(s.aggregateOnlyStudents || []).slice(0, 30).join(', ') || EMPTY}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">V2 指標比較（儀表摘要）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            以學期代碼並列<strong>舊版 V2 summary</strong>（<code>et_*</code> 路徑）與<strong>LJS v3 read model</strong>（<code>student_semester_profiles</code> +{' '}
            <code>exam_attempts</code>）。不變更英檢 V2 儀表讀源；僅供比對。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={compareLoading} onClick={loadEnglishTestSummaryCompare}>
            {compareLoading ? '載入中…' : '載入比較'}
          </button>
          {compareError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {compareError}
              {compareRequestId ? <div className="small mt-1">Request-ID：{compareRequestId}</div> : null}
            </div>
          )}
          {compareData && (
            <div className="mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted">整體狀態</span>
                <span
                  className={`badge ${
                    compareData.status === 'ok'
                      ? 'bg-success'
                      : compareData.status === 'warning'
                        ? 'bg-warning text-dark'
                        : 'bg-danger'
                  }`}
                >
                  {compareData.status}
                </span>
                {compareData.enableLearningJourneyV3ReadModel ? (
                  <span className="badge bg-info text-dark">ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true</span>
                ) : (
                  <span className="badge bg-secondary">v3 read flag 未啟用（預設）</span>
                )}
              </div>
              {isTrialSwitchHintRow(compareData) && compareData.status !== 'error' ? (
                <div className="alert alert-success py-2 mb-2">
                  主要指標差異為零或極小，可進入試切換評估（仍須營運確認後再改讀源）。
                </div>
              ) : null}
              {compareData.legacy && compareData.legacy.error ? (
                <div className="alert alert-warning py-2">V2 legacy 無法載入：{compareData.legacy.error}</div>
              ) : null}
              {compareData.diff && (
                <div className="mb-2">
                  <div className="fw-semibold mb-1">差異（v3 − legacy）</div>
                  <div className="font-monospace text-break">
                    名冊人數 {compareData.diff.rosterActiveStudentCount}；有效最佳分數人數 {compareData.diff.validBestScoreStudentCount}；達標人數{' '}
                    {compareData.diff.attainedStudentCount}；達成率 {compareData.diff.attainmentRate}
                  </div>
                </div>
              )}
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>指標</th>
                      <th>Legacy（V2）</th>
                      <th>v3（LJS）</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['rosterActiveStudentCount', 'validBestScoreStudentCount', 'attainedStudentCount', 'attainmentRate'].map((key) => (
                      <tr key={key}>
                        <td className="font-monospace">{key}</td>
                        <td>{compareData.legacy && !compareData.legacy.error ? compareData.legacy[key] : EMPTY}</td>
                        <td>{compareData.v3 ? compareData.v3[key] : EMPTY}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {compareData.v3 && compareData.v3.skills && compareData.legacy && compareData.legacy.skills && !compareData.legacy.error ? (
                <div className="table-responsive mt-2">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>技能（B2+ 人數／率）</th>
                        <th>Legacy</th>
                        <th>v3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['listening', 'reading', 'speaking', 'writing'].map((sk) => (
                        <tr key={sk}>
                          <td className="text-capitalize">{sk}</td>
                          <td>
                            {compareData.legacy.skills[sk]?.count ?? EMPTY}／{compareData.legacy.skills[sk]?.rate ?? EMPTY}
                          </td>
                          <td>
                            {compareData.v3.skills[sk]?.count ?? EMPTY}／{compareData.v3.skills[sk]?.rate ?? EMPTY}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">學生列表對照（V2 vs LJS v3）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            比對 <code>/api/admin/english-tests/…/students</code>（legacy 名冊）與 v3 read model（<code>student_semester_profiles</code> + <code>exam_attempts</code>）。不變更學生列表頁 UI。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={studCompareLoading} onClick={loadEnglishTestStudentsCompare}>
            {studCompareLoading ? '比較中…' : '比較 students'}
          </button>
          {studCompareError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {studCompareError}
              {studCompareRequestId ? <div className="small mt-1">Request-ID：{studCompareRequestId}</div> : null}
            </div>
          )}
          {studCompareData && (
            <div className="mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted">狀態</span>
                <span
                  className={`badge ${
                    studCompareData.status === 'ok' ? 'bg-success' : studCompareData.status === 'warning' ? 'bg-warning text-dark' : 'bg-danger'
                  }`}
                >
                  {studCompareData.status}
                </span>
                <span className="text-muted">legacyCount</span>
                <span className="fw-medium">{studCompareData.legacyCount}</span>
                <span className="text-muted">v3Count</span>
                <span className="fw-medium">{studCompareData.v3Count}</span>
                <span className="text-muted">diffCount</span>
                <span className="fw-medium">{studCompareData.diffCount}</span>
              </div>
              {isStudentsListTrialHint(studCompareData) ? (
                <div className="alert alert-success py-2 mb-2">學生列表可進入試切換（差異筆數與比例已低於門檻）。</div>
              ) : null}
              {studCompareData.sampleDiff && studCompareData.sampleDiff.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>學號</th>
                        <th>Legacy</th>
                        <th>v3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studCompareData.sampleDiff.map((row) => (
                        <tr key={row.studentId}>
                          <td className="font-monospace">{row.studentId}</td>
                          <td>
                            <pre className="small mb-0 text-break" style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(row.legacy, null, 2)}
                            </pre>
                          </td>
                          <td>
                            <pre className="small mb-0 text-break" style={{ maxWidth: 360, whiteSpace: 'pre-wrap' }}>
                              {JSON.stringify(row.v3, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted">無差異樣本（diffCount 為 0 或無資料）。</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">學生詳情對照（V2 vs LJS v3）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            比對 <code>/api/admin/english-tests/…/students/:studentId</code>（legacy）與 v3 read model（<code>exam_attempts</code> 等）。不變更學生詳情頁 UI 讀源；使用與上方相同的<strong>學期</strong>代碼。
          </p>
          <div className="row g-2 align-items-end mb-2">
            <div className="col-md-4">
              <label className="form-label small mb-0">學號（詳情比對）</label>
              <input
                className="form-control form-control-sm"
                value={detailCompareStudentInput}
                onChange={(e) => setDetailCompareStudentInput(e.target.value)}
                placeholder="例如：D11400001"
              />
            </div>
            <div className="col-md-3">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                disabled={detailCompareLoading}
                onClick={loadEnglishTestStudentDetailCompare}
              >
                {detailCompareLoading ? '比較中…' : '比較學生詳情'}
              </button>
            </div>
          </div>
          {detailCompareError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {detailCompareError}
              {detailCompareRequestId ? <div className="small mt-1">Request-ID：{detailCompareRequestId}</div> : null}
            </div>
          )}
          {detailCompareData && (
            <div className="mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted">狀態</span>
                <span
                  className={`badge ${
                    detailCompareData.status === 'ok'
                      ? 'bg-success'
                      : detailCompareData.status === 'warning'
                        ? 'bg-warning text-dark'
                        : 'bg-danger'
                  }`}
                >
                  {detailCompareData.status}
                </span>
              </div>
              {detailCompareData.status === 'ok' ? (
                <div className="alert alert-success py-2 mb-2">學生詳情可進入試切換（仍須營運確認後再改 admin 讀源）。</div>
              ) : null}
              {(detailCompareData.legacyError || detailCompareData.v3Error) && (
                <div className="alert alert-warning py-2 mb-2 small">
                  {detailCompareData.legacyError ? <div>Legacy：{detailCompareData.legacyError}</div> : null}
                  {detailCompareData.v3Error ? <div>v3：{detailCompareData.v3Error}</div> : null}
                </div>
              )}
              <div className="row g-2 mb-2">
                <div className="col-md-6">
                  <div className="fw-semibold mb-1">Legacy 摘要</div>
                  <div className="text-muted font-monospace text-break" style={{ fontSize: '0.75rem' }}>
                    attempts：{detailCompareData.legacy?.attempts?.length ?? 0}；activities：
                    {detailCompareData.legacy?.activities?.length ?? 0}；examRegistrations：
                    {detailCompareData.legacy?.examRegistrations?.length ?? 0}
                  </div>
                  <pre className="small mb-0 mt-1 text-break bg-light p-2 rounded" style={{ maxHeight: 160, overflow: 'auto' }}>
                    {detailCompareData.legacy
                      ? JSON.stringify(
                          {
                            roster: detailCompareData.legacy.roster,
                            bestSkills: detailCompareData.legacy.bestSkills,
                          },
                          null,
                          2
                        )
                      : EMPTY}
                  </pre>
                </div>
                <div className="col-md-6">
                  <div className="fw-semibold mb-1">v3 摘要</div>
                  <div className="text-muted font-monospace text-break" style={{ fontSize: '0.75rem' }}>
                    attempts：{detailCompareData.v3?.attempts?.length ?? 0}；activities：
                    {detailCompareData.v3?.activities?.length ?? 0}；examRegistrations：
                    {detailCompareData.v3?.examRegistrations?.length ?? 0}
                  </div>
                  <pre className="small mb-0 mt-1 text-break bg-light p-2 rounded" style={{ maxHeight: 160, overflow: 'auto' }}>
                    {detailCompareData.v3
                      ? JSON.stringify(
                          {
                            roster: detailCompareData.v3.roster,
                            bestSkills: detailCompareData.v3.bestSkills,
                            source: detailCompareData.v3.source,
                            dataQuality: detailCompareData.v3.dataQuality,
                          },
                          null,
                          2
                        )
                      : EMPTY}
                  </pre>
                </div>
              </div>
              {Array.isArray(detailCompareData.diff) && detailCompareData.diff.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>category</th>
                        <th>field</th>
                        <th>legacy</th>
                        <th>v3</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailCompareData.diff.map((row, idx) => (
                        <tr key={`${row.category}-${row.field}-${idx}`}>
                          <td className="font-monospace">{row.category}</td>
                          <td className="font-monospace">{row.field}</td>
                          <td className="text-break" style={{ maxWidth: 280 }}>
                            {typeof row.legacy === 'object' ? JSON.stringify(row.legacy) : String(row.legacy)}
                          </td>
                          <td className="text-break" style={{ maxWidth: 280 }}>
                            {typeof row.v3 === 'object' ? JSON.stringify(row.v3) : String(row.v3)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : detailCompareData.status !== 'error' ? (
                <div className="text-muted">diff 為空（兩邊可比欄位一致）。</div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">同步工具（LJS read model）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            使用上方<strong>學期</strong>代碼；先<strong>預覽（dry run）</strong>再<strong>正式同步</strong>。正式同步後會自動重新執行對帳。不刪除來源表資料。
          </p>
          <div className="mb-2">
            {SYNC_SECTION_OPTIONS.map((s) => (
              <div key={s.key} className="form-check form-check-inline">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`lj-sync-${s.key}`}
                  checked={!!syncSectionsSel[s.key]}
                  onChange={(e) =>
                    setSyncSectionsSel((prev) => ({
                      ...prev,
                      [s.key]: e.target.checked,
                    }))
                  }
                />
                <label className="form-check-label" htmlFor={`lj-sync-${s.key}`}>
                  {s.label}
                </label>
              </div>
            ))}
          </div>
          <div className="d-flex flex-wrap gap-2">
            <button type="button" className="btn btn-outline-secondary btn-sm" disabled={syncLoading} onClick={() => runLearningJourneySync(true)}>
              {syncLoading ? '執行中…' : '預覽（dry run）'}
            </button>
            <button type="button" className="btn btn-warning btn-sm" disabled={syncLoading} onClick={applySyncThenReconcile}>
              {syncLoading ? '執行中…' : '正式同步並對帳'}
            </button>
          </div>
          {syncError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {syncError}
              {syncRequestId ? <div className="small mt-1">Request-ID：{syncRequestId}</div> : null}
            </div>
          )}
          {syncResult && syncResult.results && (
            <div className="table-responsive mt-3">
              <table className="table table-sm table-bordered mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th>區塊</th>
                    <th>inserted</th>
                    <th>updated</th>
                    <th>skipped</th>
                    <th>errors</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(syncResult.results).map(([key, r]) => (
                    <tr key={key}>
                      <td className="font-monospace">{key}</td>
                      <td>{r.inserted}</td>
                      <td>{r.updated}</td>
                      <td>{r.skipped}</td>
                      <td className="text-break" style={{ maxWidth: 280 }}>
                        {Array.isArray(r.errors) && r.errors.length > 0 ? JSON.stringify(r.errors) : EMPTY}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-muted mt-1">dryRun：{syncResult.dryRun ? '是（未寫入）' : '否（已寫入）'}</div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger py-2">
          <div>{error}</div>
          {requestId ? <div className="small mt-1 text-break">Request-ID：{requestId}</div> : null}
        </div>
      )}
      {loading && <div className="alert alert-info py-2 mb-3">載入中…</div>}

      {!loading && searched && !profile && !error && (
        <div className="alert alert-secondary py-2">請按「載入」以查詢學生聚合資料。</div>
      )}

      {profile && (
        <>
          {noStudent && (
            <div className="alert alert-warning py-2 mb-3">
              <strong>查無學生：</strong>
              各來源皆無此學號之紀錄（請確認學號或是否已有名冊／報名／預約資料）。
            </div>
          )}

          {!noStudent && noExamHint && (
            <div className="alert alert-light border py-2 mb-3 small">
              此學號有其他紀錄，但目前<strong>無英檢／BESTEP／長期追蹤成績</strong>可顯示。
            </div>
          )}

          {!noStudent && noActivityHint && (
            <div className="alert alert-light border py-2 mb-3 small">
              此學號有英檢或學籍資料，但目前<strong>無活動預約／簽到／BESTEP 出席</strong>可顯示。
            </div>
          )}

          <div className="row g-3">
            {/* A. 學生基本資料 */}
            <div className="col-12">
              <div className="card">
                <div className="card-header py-2 fw-semibold">A. 學生基本資料</div>
                <div className="card-body small row g-2">
                  <div className="col-md-3">
                    <div className="text-muted">學號</div>
                    <div>{st.studentId || EMPTY}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-muted">姓名（et_student_master）</div>
                    <div>{st.etStudentMaster?.name || EMPTY}</div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-muted">系所／學院（主檔）</div>
                    <div>
                      {st.etStudentMaster?.dept || EMPTY} {st.etStudentMaster?.college ? `／${st.etStudentMaster.college}` : ''}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="text-muted">LJS studentPk</div>
                    <div>{st.ljsStudentPk != null ? st.ljsStudentPk : EMPTY}</div>
                  </div>
                  <div className="col-12 mt-2">
                    <Link className="btn btn-outline-primary btn-sm me-2" to={`/admin/english-test-tracking/students/${encodeURIComponent(st.studentId || '')}`}>
                      英檢 V2 學生頁
                    </Link>
                    <Link className="btn btn-outline-secondary btn-sm" to={`/admin/english-test-tracking/student-timeline/${encodeURIComponent(st.studentId || '')}`}>
                      Timeline 專頁
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* B. 英檢歷程 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header py-2 fw-semibold">B. 英檢歷程</div>
                <div className="card-body small">
                  {!hasExamData && !noStudent ? (
                    <p className="text-muted mb-0">尚無培力報名、et 測驗紀錄、BESTEP 成績或學期最佳彙整。</p>
                  ) : null}
                  {regs.length > 0 && (
                    <>
                      <div className="text-muted mb-1">培力報名（最近 {Math.min(5, regs.length)} 筆）</div>
                      <ul className="mb-2 ps-3">
                        {regs.slice(0, 5).map((r) => (
                          <li key={r.id}>
                            {r.semester || EMPTY} — {r.examType || EMPTY} — {r.status || EMPTY}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="text-muted">et_exam_attempts</div>
                  <div className="mb-2">{attempts.length} 筆</div>
                  <div className="text-muted">BESTEP 成績列（bestep_exam_scores）</div>
                  <div className="mb-2">{Number(flags.bestepScoresCount || 0)} 筆</div>
                  <div className="text-muted">BESTEP 出席列（bestep_attendance）</div>
                  <div className="mb-2">{Number(flags.bestepAttendanceCount || 0)} 筆</div>
                  <div className="text-muted">學期最佳（et_semester_student_best_skills）</div>
                  <div>{flags.hasBestSkills ? '有資料' : '無'}</div>
                </div>
              </div>
            </div>

            {/* C. 活動參與 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header py-2 fw-semibold">C. 活動參與</div>
                <div className="card-body small">
                  {!hasActivityData && !noStudent ? (
                    <p className="text-muted mb-0">尚無預約簽到、LJS 活動參與或 BESTEP 出席紀錄。</p>
                  ) : null}
                  <div className="mb-2">預約＋活動列共 {activities.length} 筆</div>
                  <ul className="ps-3 mb-0">
                    {activities.slice(0, 8).map((row, idx) => (
                      <li key={idx}>
                        {row.kind === 'reservation' && (
                          <>
                            預約：{row.event?.eventType || row.event?.name || '活動'} — {row.reservation?.checkinStatus || EMPTY}
                          </>
                        )}
                        {row.kind === 'activity_participation' && (
                          <>
                            LJS：{row.participation?.activityType} — {row.participation?.attendanceStatus}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* D. Timeline */}
            <div className="col-12">
              <div className="card">
                <div className="card-header py-2 fw-semibold">D. Timeline（最多顯示 40 筆）</div>
                <div className="card-body p-0 table-responsive">
                  {timeline.length === 0 ? (
                    <div className="p-3 text-muted small">尚無 timeline 事件。</div>
                  ) : (
                    <table className="table table-sm table-striped mb-0 small">
                      <thead>
                        <tr>
                          <th>日期</th>
                          <th>類型</th>
                          <th>標題</th>
                          <th>狀態</th>
                          <th>來源</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeline.slice(0, 40).map((ev) => (
                          <tr key={ev.id || `${ev.type}-${ev.date}`}>
                            <td className="text-nowrap">{ev.date || EMPTY}</td>
                            <td>{ev.type}</td>
                            <td>{ev.title}</td>
                            <td>{ev.status || EMPTY}</td>
                            <td>{ev.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {dq.length > 0 && (
              <div className="col-12">
                <div className="card border-secondary">
                  <div className="card-header py-2 bg-light small">資料品質（dataQuality）</div>
                  <div className="card-body small py-2">
                    <ul className="mb-0 ps-3">
                      {dq.map((q, i) => (
                        <li key={i}>
                          <span className="text-muted">[{q.severity}]</span> {q.code}: {q.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {dashboard && dashboard.semesters && dashboard.semesters[0] && (
        <div className="mt-4">
          <button type="button" className="btn btn-link btn-sm p-0 mb-1" onClick={() => setDebugOpen((o) => !o)}>
            {debugOpen ? '▼' : '▶'} Debug：學期 dashboard 原始 JSON
          </button>
          {debugOpen && (
            <div className="card">
              <div className="card-body small">
                <pre className="mb-0" style={{ whiteSpace: 'pre-wrap', maxHeight: 280, overflow: 'auto' }}>
                  {JSON.stringify(dashboard, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
