import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getLearningJourneyProfile,
  getLearningJourneySemesterDashboard,
  getLearningJourneyReconciliation,
  getLearningJourneyReadiness,
  getLearningJourneyReadModelStatus,
  getLearningJourneyDataFreshness,
  getLearningJourneyGovernanceOverview,
  getLearningJourneyEnglishTestSummaryV3,
  getLearningJourneyEnglishTestSummaryCompare,
  getLearningJourneyEnglishTestStudentsCompare,
  getLearningJourneyEnglishTestStudentDetailCompare,
  getLearningJourneyRiskStudents,
  postLearningJourneySync,
  postLearningJourneyCourseImportDryRun,
  postLearningJourneyCourseImportApply,
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

export default function LearningJourneyHubPage() {
  const token = localStorage.getItem('token') || '';
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  const tokenPayload = parseJwtPayload(token) || {};
  const teacherLevel = String(tokenPayload.teacherLevel || '').toLowerCase();
  const isSuperAdmin = role === 'admin';
  const isAdminPlus = isSuperAdmin || (role === 'teacher' && (teacherLevel === 'executive' || teacherLevel === 'et_manager'));
  const [operationMode, setOperationMode] = useState(isSuperAdmin ? 'advanced' : 'operation');
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
  const [courseImportFile, setCourseImportFile] = useState(null);
  const [courseImportDryRun, setCourseImportDryRun] = useState(null);
  const [courseImportApply, setCourseImportApply] = useState(null);
  const [courseImportLoading, setCourseImportLoading] = useState(false);
  const [courseImportError, setCourseImportError] = useState('');
  const [courseImportRequestId, setCourseImportRequestId] = useState('');
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
  const [readModelStatusData, setReadModelStatusData] = useState(null);
  const [readModelStatusLoading, setReadModelStatusLoading] = useState(false);
  const [readModelStatusError, setReadModelStatusError] = useState('');
  const [readModelStatusRequestId, setReadModelStatusRequestId] = useState('');
  const [freshnessData, setFreshnessData] = useState(null);
  const [freshnessLoading, setFreshnessLoading] = useState(false);
  const [freshnessError, setFreshnessError] = useState('');
  const [freshnessRequestId, setFreshnessRequestId] = useState('');
  const [governanceData, setGovernanceData] = useState(null);
  const [governanceLoading, setGovernanceLoading] = useState(false);
  const [governanceError, setGovernanceError] = useState('');
  const [governanceRequestId, setGovernanceRequestId] = useState('');
  const [formalSummary, setFormalSummary] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [formalLoading, setFormalLoading] = useState(false);
  const [formalError, setFormalError] = useState('');

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

  const runCourseImportDryRun = useCallback(async () => {
    if (!courseImportFile) {
      setCourseImportError('請先選擇修課紀錄 Excel 檔');
      setCourseImportRequestId('');
      return;
    }
    setCourseImportLoading(true);
    setCourseImportError('');
    setCourseImportRequestId('');
    setCourseImportApply(null);
    try {
      const data = await postLearningJourneyCourseImportDryRun(token, courseImportFile);
      setCourseImportDryRun(data);
    } catch (e) {
      setCourseImportDryRun(null);
      setCourseImportError(e.message || '修課 dry run 失敗');
      setCourseImportRequestId(e.requestId || '');
    } finally {
      setCourseImportLoading(false);
    }
  }, [courseImportFile, token]);

  const runCourseImportApply = useCallback(async () => {
    if (!courseImportFile) {
      setCourseImportError('請先選擇修課紀錄 Excel 檔');
      setCourseImportRequestId('');
      return;
    }
    if (!courseImportDryRun) {
      setCourseImportError('請先執行 dry run，確認結果後再 apply');
      setCourseImportRequestId('');
      return;
    }
    const hasBlockingIssues =
      Number(courseImportDryRun.invalidRows || 0) > 0 || Number(courseImportDryRun.duplicateRows || 0) > 0;
    if (hasBlockingIssues) {
      setCourseImportError('dry run 顯示仍有錯誤或重複列，請修正檔案後再 apply');
      setCourseImportRequestId('');
      return;
    }
    const ok = window.confirm('確定要正式寫入修課紀錄？此操作會建立或更新 courses / course_enrollments。');
    if (!ok) return;
    setCourseImportLoading(true);
    setCourseImportError('');
    setCourseImportRequestId('');
    try {
      const data = await postLearningJourneyCourseImportApply(token, courseImportFile);
      setCourseImportApply(data);
    } catch (e) {
      setCourseImportApply(null);
      setCourseImportError(e.message || '修課 apply 失敗');
      setCourseImportRequestId(e.requestId || '');
    } finally {
      setCourseImportLoading(false);
    }
  }, [courseImportDryRun, courseImportFile, token]);

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

  const loadReadModelStatus = useCallback(async () => {
    setReadModelStatusLoading(true);
    setReadModelStatusError('');
    setReadModelStatusRequestId('');
    try {
      const data = await getLearningJourneyReadModelStatus(token);
      setReadModelStatusData(data);
    } catch (e) {
      setReadModelStatusData(null);
      setReadModelStatusError(e.message || '載入 read model 狀態失敗');
      setReadModelStatusRequestId(e.requestId || '');
    } finally {
      setReadModelStatusLoading(false);
    }
  }, [token]);

  const loadDataFreshness = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setFreshnessError('請輸入學期代碼');
      setFreshnessRequestId('');
      return;
    }
    setFreshnessLoading(true);
    setFreshnessError('');
    setFreshnessRequestId('');
    try {
      const data = await getLearningJourneyDataFreshness(token, sem);
      setFreshnessData(data);
    } catch (e) {
      setFreshnessData(null);
      setFreshnessError(e.message || '資料新鮮度檢查失敗');
      setFreshnessRequestId(e.requestId || '');
    } finally {
      setFreshnessLoading(false);
    }
  }, [semesterInput, token]);

  const loadGovernanceOverview = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setGovernanceError('請輸入學期代碼');
      setGovernanceRequestId('');
      return;
    }
    setGovernanceLoading(true);
    setGovernanceError('');
    setGovernanceRequestId('');
    try {
      const data = await getLearningJourneyGovernanceOverview(token, sem);
      setGovernanceData(data);
      if (data.freshness && Array.isArray(data.freshness.sections)) setFreshnessData(data.freshness);
      if (data.risk) setRiskData({ ...(data.risk || {}), items: data.risk.topStudents || [] });
    } catch (e) {
      setGovernanceData(null);
      setGovernanceError(e.message || '治理摘要載入失敗');
      setGovernanceRequestId(e.requestId || '');
    } finally {
      setGovernanceLoading(false);
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

  const loadFormalDashboard = useCallback(async () => {
    const sem = semesterInput.trim();
    if (!sem) {
      setFormalError('請輸入學期代碼');
      return;
    }
    setFormalLoading(true);
    setFormalError('');
    try {
      const [summaryV3, risk, freshness] = await Promise.all([
        getLearningJourneyEnglishTestSummaryV3(token, sem),
        getLearningJourneyRiskStudents(token, sem),
        getLearningJourneyDataFreshness(token, sem).catch(() => null)
      ]);
      setFormalSummary(summaryV3);
      setRiskData(risk);
      if (freshness && Array.isArray(freshness.sections)) setFreshnessData(freshness);
    } catch (e) {
      setFormalSummary(null);
      setRiskData(null);
      setFormalError(e.message || '正式儀表板載入失敗');
    } finally {
      setFormalLoading(false);
    }
  }, [semesterInput, token]);

  const st = profile?.student || {};
  const flags = st.aggregateFlags || {};
  const timeline = Array.isArray(profile?.timeline) ? profile.timeline : [];
  const attempts = Array.isArray(profile?.examAttempts) ? profile.examAttempts : [];
  const activities = Array.isArray(profile?.activities) ? profile.activities : [];
  const courses = Array.isArray(profile?.courses) ? profile.courses : [];
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
  const hasCourseData = flags.hasCourseEnrollments || courses.length > 0;

  return (
    <div className="container-fluid py-3">
      <h4 className="mb-2">英語學習歷程中心</h4>
      <p className="text-muted small mb-3">
        唯讀聚合（v3）：資料來自 et_*、培力報名、BESTEP、預約與 LJS。審核與匯入請仍使用既有後台功能。
      </p>
      <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
        <span className="text-muted small">目前模式</span>
        <span className={`badge ${operationMode === 'operation' ? 'bg-primary' : 'bg-secondary'}`}>
          {operationMode === 'operation' ? '營運模式（Operation Mode）' : '管理模式（Advanced）'}
        </span>
        {isAdminPlus ? (
          <div className="btn-group btn-group-sm">
            <button
              type="button"
              className={`btn ${operationMode === 'operation' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setOperationMode('operation')}
            >
              營運模式
            </button>
            <button
              type="button"
              className={`btn ${operationMode === 'advanced' ? 'btn-secondary' : 'btn-outline-secondary'}`}
              onClick={() => setOperationMode('advanced')}
            >
              管理模式
            </button>
          </div>
        ) : (
          <span className="text-muted small">（非管理員預設僅顯示營運模式）</span>
        )}
      </div>

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
        <div className="col-md-1">
          <button type="button" className="btn btn-outline-primary btn-sm w-100" disabled={formalLoading} onClick={loadFormalDashboard}>
            正式版
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">Learning Journey Dashboard（正式版）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            以 Learning Journey v3 作為主視角，提供 KPI、CEFR 分布與風險學生清單（保留 rollback 與 compare 能力）。
          </p>
          {formalError ? <div className="alert alert-danger py-2">{formalError}</div> : null}
          {Array.isArray(freshnessData?.sections) &&
          freshnessData.sections.some((s) => s.status === 'stale') ? (
            <div className="alert alert-danger py-2 mb-2">資料可能過舊，請聯絡管理員。</div>
          ) : null}
          {formalLoading ? <div className="alert alert-info py-2">載入中…</div> : null}
          {!formalLoading && formalSummary && (
            <>
              <div className="row g-2 mb-2">
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">達標率</div>
                    <div className="fs-5 fw-semibold">{((Number(formalSummary.attainmentRate || 0) * 100).toFixed(1))}%</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">英檢報名率</div>
                    <div className="fs-5 fw-semibold">
                      {formalSummary.rosterActiveStudentCount
                        ? `${((Number((dashboard?.semesters?.[0]?.englishRegistrationCount || 0) / Math.max(Number(formalSummary.rosterActiveStudentCount || 1), 1)) * 100).toFixed(1))}%`
                        : EMPTY}
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">活動參與率</div>
                    <div className="fs-5 fw-semibold">
                      {riskData?.metrics?.rosterCount
                        ? `${(((Number(riskData.metrics.rosterCount || 0) - Number(riskData.metrics.riskCount || 0)) / Math.max(Number(riskData.metrics.rosterCount || 1), 1) * 100).toFixed(1))}%`
                        : EMPTY}
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">CEFR B2+（達標人數）</div>
                    <div className="fs-5 fw-semibold">{formalSummary.attainedStudentCount ?? 0}</div>
                  </div>
                </div>
              </div>
              <div className="card border-0 bg-light mb-2">
                <div className="card-body py-2">
                  <div className="fw-semibold mb-1">CEFR 分布（B2+ 比例）</div>
                  {['listening', 'reading', 'speaking', 'writing'].map((sk) => {
                    const rate = Number(formalSummary.skills?.[sk]?.rate || 0);
                    return (
                      <div key={sk} className="mb-1">
                        <div className="d-flex justify-content-between">
                          <span className="text-capitalize">{sk}</span>
                          <span>{(rate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="progress" style={{ height: 8 }}>
                          <div className="progress-bar" role="progressbar" style={{ width: `${Math.max(0, Math.min(rate * 100, 100))}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {!formalLoading && riskData && (
            <div className="mt-2">
              <div className="fw-semibold mb-1">
                Risk Students（高風險前 10）{' '}
                <Link to="/admin/english-test-tracking/risk" className="small">
                  查看風險頁
                </Link>
              </div>
              {Array.isArray(riskData.items) && riskData.items.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>學號</th>
                        <th>風險分數</th>
                        <th>原因</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riskData.items.slice(0, 10).map((r) => (
                        <tr key={r.studentId}>
                          <td className="font-monospace">{r.studentId}</td>
                          <td>{r.riskScore}</td>
                          <td>{(r.reasons || []).map((x) => x.message).join('；')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-muted">目前無高風險學生清單。</div>
              )}
            </div>
          )}
        </div>
      </div>

      {operationMode === 'advanced' && (
      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">P4/P5 上線治理總覽（每日維運入口）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            彙整學期/系級總覽、風險學生、資料新鮮度、對帳狀態、同步批次、匯入歷程與錯誤治理。上線前用於 go/no-go 判斷，上線後作為每日維運第一個檢查面板。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={governanceLoading} onClick={loadGovernanceOverview}>
            {governanceLoading ? '載入中…' : '載入每日治理總覽'}
          </button>
          {governanceError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {governanceError}
              {governanceRequestId ? <div className="small mt-1">Request-ID：{governanceRequestId}</div> : null}
            </div>
          )}
          {governanceData && (
            <div className="mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted">整體狀態</span>
                <span
                  className={`badge ${
                    governanceData.status === 'ok'
                      ? 'bg-success'
                      : governanceData.status === 'warning' || governanceData.status === 'stale' || governanceData.status === 'empty'
                        ? 'bg-warning text-dark'
                        : 'bg-danger'
                  }`}
                >
                  {governanceData.status}
                </span>
                <span className="text-muted">產生時間：{governanceData.generatedAt || EMPTY}</span>
              </div>
              {Array.isArray(governanceData.recommendations) && governanceData.recommendations.length > 0 ? (
                <div className="alert alert-info py-2">
                  <div className="fw-semibold mb-1">上線建議</div>
                  <ul className="mb-0 ps-3">
                    {governanceData.recommendations.map((r, idx) => <li key={idx}>{r}</li>)}
                  </ul>
                </div>
              ) : null}

              <div className="row g-2 mb-2">
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">名冊人數</div>
                    <div className="fs-5 fw-semibold">{governanceData.dashboard?.semesters?.[0]?.rosterActiveCount ?? 0}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">風險學生</div>
                    <div className="fs-5 fw-semibold">{governanceData.risk?.metrics?.riskCount ?? 0}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">修課紀錄</div>
                    <div className="fs-5 fw-semibold">{governanceData.imports?.courseImport?.courseEnrollmentCount ?? 0}</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="border rounded p-2 h-100">
                    <div className="text-muted">Quarantine</div>
                    <div className="fs-5 fw-semibold">{governanceData.imports?.quarantineCount ?? 0}</div>
                  </div>
                </div>
              </div>

              <div className="row g-2 mb-3">
                <div className="col-lg-3 col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="fw-semibold mb-1">Canonical Coverage</div>
                    <div className="mb-1">
                      <span className={`badge ${
                        governanceData.canonicalReady?.canonicalReady
                          ? 'bg-success'
                          : governanceData.canonicalReady?.canonicalRequired
                            ? 'bg-danger'
                            : 'bg-secondary'
                      }`}>
                        {governanceData.canonicalReady?.canonicalRequired
                          ? `Required from ${governanceData.canonicalReady?.requiredFromSemester || ''}`
                          : 'Not required'}
                      </span>
                    </div>
                    <div className="fs-5 fw-semibold">
                      {Math.round((governanceData.canonicalCoverage?.coverageRate || 0) * 100)}%
                    </div>
                    <div className="text-muted">
                      {(governanceData.canonicalCoverage?.coveredCount ?? 0)} / {(governanceData.canonicalCoverage?.totalCount ?? 0)} sections covered
                    </div>
                    {Array.isArray(governanceData.canonicalCoverage?.canonicalMissingSections) &&
                    governanceData.canonicalCoverage.canonicalMissingSections.length > 0 ? (
                      <div className="text-warning mt-1">
                        缺口：{governanceData.canonicalCoverage.canonicalMissingSections.join('、')}
                      </div>
                    ) : (
                      <div className="text-success mt-1">Canonical 區塊目前可判讀。</div>
                    )}
                    {Array.isArray(governanceData.canonicalReady?.blockingReasons) &&
                    governanceData.canonicalReady.blockingReasons.length > 0 ? (
                      <div className="text-danger mt-1">
                        Ready 缺口：{governanceData.canonicalReady.blockingReasons.slice(0, 3).join('、')}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="fw-semibold mb-1">Fallback / Legacy</div>
                    <div className="fs-5 fw-semibold">{governanceData.fallbackUsage?.fallbackUsageCount ?? 0}</div>
                    <div className="text-muted">近期 fallback 使用次數</div>
                    {governanceData.legacyApiUsageWarning ? (
                      <div className="text-warning mt-1">{governanceData.legacyApiUsageWarning}</div>
                    ) : (
                      <div className="text-success mt-1">目前未偵測到近期 fallback。</div>
                    )}
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="fw-semibold mb-1">Job Runs</div>
                    {governanceData.jobs?.enabled ? (
                      <div>
                        <div className="fs-5 fw-semibold">{(governanceData.jobs?.recent || []).length}</div>
                        <div className="text-muted">最近任務紀錄</div>
                        <div className="mt-1">
                          最新：{governanceData.jobs?.recent?.[0]?.status || '尚無紀錄'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted">
                        {governanceData.jobs?.message || '尚未啟用自動化任務紀錄。'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="border rounded p-2 h-100">
                    <div className="fw-semibold mb-1">Stale / Empty Sections</div>
                    {Array.isArray(governanceData.freshness?.sections) ? (
                      <div>
                        <div className="fs-5 fw-semibold">
                          {governanceData.freshness.sections.filter((s) => ['stale', 'empty', 'unknown'].includes(s.status)).length}
                        </div>
                        <div className="text-muted">
                          {governanceData.freshness.sections
                            .filter((s) => ['stale', 'empty', 'unknown'].includes(s.status))
                            .map((s) => s.key)
                            .join('、') || '全部 fresh'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted">尚無 freshness 資料。</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded p-2 mb-3">
                <div className="fw-semibold mb-1">Recent Job Runs</div>
                {governanceData.jobs?.enabled ? (
                  Array.isArray(governanceData.jobs?.recent) && governanceData.jobs.recent.length > 0 ? (
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered mb-0">
                        <thead className="table-light">
                          <tr><th>Job</th><th>狀態</th><th>觸發</th><th>耗時</th><th>開始時間</th><th>Request-ID</th></tr>
                        </thead>
                        <tbody>
                          {governanceData.jobs.recent.slice(0, 8).map((job) => (
                            <tr key={job.id}>
                              <td>{job.jobName}</td>
                              <td>
                                <span className={`badge ${
                                  job.status === 'success'
                                    ? 'bg-success'
                                    : job.status === 'running'
                                      ? 'bg-info text-dark'
                                      : job.status === 'skipped'
                                        ? 'bg-secondary'
                                        : 'bg-danger'
                                }`}>
                                  {job.status}
                                </span>
                              </td>
                              <td>{job.triggeredBy || EMPTY}</td>
                              <td>{job.durationMs != null ? `${job.durationMs} ms` : EMPTY}</td>
                              <td>{job.startedAt || EMPTY}</td>
                              <td className="font-monospace">{job.requestId || EMPTY}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-muted">{governanceData.jobs?.message || '尚無此學期 job run 紀錄。'}</div>
                  )
                ) : (
                  <div className="alert alert-warning py-2 mb-0">
                    {governanceData.jobs?.message || 'job_runs 尚未啟用或 migration 尚未執行。'}
                  </div>
                )}
              </div>

              <div className="row g-3">
                <div className="col-lg-6">
                  <div className="fw-semibold mb-1">系級/年級總覽（前 12）</div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr><th>系所</th><th>年級</th><th>人數</th></tr>
                      </thead>
                      <tbody>
                        {(governanceData.classOverview || []).slice(0, 12).map((row, idx) => (
                          <tr key={`${row.department}-${row.grade}-${idx}`}>
                            <td>{row.department}</td>
                            <td>{row.grade}</td>
                            <td>{row.studentCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="fw-semibold mb-1">高風險學生（前 10）</div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr><th>學號</th><th>分數</th><th>原因</th></tr>
                      </thead>
                      <tbody>
                        {(governanceData.risk?.topStudents || []).slice(0, 10).map((row) => (
                          <tr key={row.studentId}>
                            <td className="font-monospace">{row.studentId}</td>
                            <td>{row.riskScore}</td>
                            <td>{(row.reasons || []).map((x) => x.message).join('；') || EMPTY}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="fw-semibold mb-1">對帳狀態</div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr><th>區塊</th><th>source</th><th>aggregate</th><th>status</th></tr>
                      </thead>
                      <tbody>
                        {(governanceData.reconciliation?.sections || []).map((s) => (
                          <tr key={s.key}>
                            <td>{s.key}</td>
                            <td>{s.sourceCount}</td>
                            <td>{s.aggregateCount}</td>
                            <td>{s.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="col-lg-6">
                  <div className="fw-semibold mb-1">最近同步/匯入治理</div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr><th>批次/匯入</th><th>狀態</th><th>錯誤</th><th>時間</th></tr>
                      </thead>
                      <tbody>
                        {(governanceData.imports?.migrationBatches || []).slice(0, 5).map((b) => (
                          <tr key={`batch-${b.id}`}>
                            <td>{b.batchKey || b.migrationName}</td>
                            <td>{b.status}</td>
                            <td>{b.errorCount}</td>
                            <td>{b.startedAt || EMPTY}</td>
                          </tr>
                        ))}
                        {(governanceData.imports?.etAttemptImports || []).slice(0, 5).map((r) => (
                          <tr key={`et-${r.id}`}>
                            <td>{r.importName}</td>
                            <td>imported</td>
                            <td>{r.errorCount}</td>
                            <td>{r.importedAt || EMPTY}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {operationMode === 'advanced' && (
      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">目前 Read Model 狀態</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            用於確認 V2 API 目前讀源（legacy 或 learning journey v3），以及 fallback 保護是否啟用。此區塊僅觀測，不會改動 flag。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={readModelStatusLoading} onClick={loadReadModelStatus}>
            {readModelStatusLoading ? '載入中…' : '讀取 read model 狀態'}
          </button>
          {readModelStatusError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {readModelStatusError}
              {readModelStatusRequestId ? <div className="small mt-1">Request-ID：{readModelStatusRequestId}</div> : null}
            </div>
          )}
          {readModelStatusData && (
            <div className="mt-3">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="text-muted">Flag</span>
                <span className={`badge ${readModelStatusData.enableLearningJourneyV3ReadModel ? 'bg-success' : 'bg-secondary'}`}>
                  ENABLE_LEARNING_JOURNEY_V3_READ_MODEL={String(!!readModelStatusData.enableLearningJourneyV3ReadModel)}
                </span>
                <span className="text-muted">目前讀源</span>
                <span className="badge bg-info text-dark">{readModelStatusData.currentReadModel || EMPTY}</span>
                <span className="text-muted">fallback</span>
                <span className={`badge ${readModelStatusData.fallbackEnabled ? 'bg-success' : 'bg-danger'}`}>
                  {readModelStatusData.fallbackEnabled ? 'enabled' : 'disabled'}
                </span>
              </div>
              {Array.isArray(readModelStatusData.warnings) && readModelStatusData.warnings.length > 0 ? (
                <div className="alert alert-warning py-2 mb-2">
                  {readModelStatusData.warnings.join('；')}
                </div>
              ) : null}
              {Array.isArray(readModelStatusData.affectedApis) && readModelStatusData.affectedApis.length > 0 ? (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>受影響 API</th>
                      </tr>
                    </thead>
                    <tbody>
                      {readModelStatusData.affectedApis.map((api) => (
                        <tr key={api}>
                          <td className="font-monospace">{api}</td>
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
      )}

      {operationMode === 'advanced' && (
      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">資料新鮮度（Data Freshness）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            檢查 canonical 表於指定學期的資料量與最近更新時間。若狀態為 <code>empty</code> 或 <code>stale</code>，建議先執行 sync/reconciliation。
          </p>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={freshnessLoading} onClick={loadDataFreshness}>
            {freshnessLoading ? '檢查中…' : '執行資料新鮮度檢查'}
          </button>
          {freshnessError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {freshnessError}
              {freshnessRequestId ? <div className="small mt-1">Request-ID：{freshnessRequestId}</div> : null}
            </div>
          )}
          {freshnessData && Array.isArray(freshnessData.sections) && (
            <div className="mt-3">
              {(freshnessData.sections.some((s) => s.status === 'stale' || s.status === 'empty') || false) ? (
                <div className="alert alert-warning py-2 mb-2">
                  偵測到 stale/empty 區塊，建議先執行 sync 或 reconciliation，再判讀 v3 讀源結果。
                </div>
              ) : null}
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>section</th>
                      <th>recordCount</th>
                      <th>lastUpdatedAt</th>
                      <th>status</th>
                      <th>message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {freshnessData.sections.map((s) => (
                      <tr key={s.key}>
                        <td className="font-monospace">{s.key}</td>
                        <td>{s.recordCount}</td>
                        <td>{s.lastUpdatedAt || EMPTY}</td>
                        <td>
                          <span
                            className={`badge ${
                              s.status === 'fresh'
                                ? 'bg-success'
                                : s.status === 'stale'
                                  ? 'bg-warning text-dark'
                                  : s.status === 'empty'
                                    ? 'bg-secondary'
                                    : 'bg-danger'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td>{s.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {operationMode === 'advanced' && (
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
      )}

      {operationMode === 'advanced' && (
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
      )}

      {operationMode === 'advanced' && (
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
      )}

      {operationMode === 'advanced' && (
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
      )}

      {operationMode === 'advanced' && (
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
      )}

      {operationMode === 'advanced' && (
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
            <button
              type="button"
              className="btn btn-warning btn-sm"
              disabled={syncLoading}
              onClick={() => {
                const ok = window.confirm('此操作會同步資料，請確認是否已完成匯入。是否繼續？');
                if (!ok) return;
                applySyncThenReconcile();
              }}
            >
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
      )}

      {operationMode === 'advanced' && (
      <div className="card mb-3">
        <div className="card-header py-2 fw-semibold">修課紀錄匯入（courses / course_enrollments）</div>
        <div className="card-body small">
          <p className="text-muted mb-2">
            上傳修課 Excel，欄位可使用：學期、課號、課名、學號、姓名、開課單位、授課教師、學分、修課狀態、成績、通過狀態、學習成果。請先 dry run，確認無錯誤與重複列後再 apply。
          </p>
          <div className="row g-2 align-items-end">
            <div className="col-md-6">
              <label className="form-label small mb-1">修課紀錄 Excel</label>
              <input
                className="form-control form-control-sm"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                  setCourseImportFile(file);
                  setCourseImportDryRun(null);
                  setCourseImportApply(null);
                  setCourseImportError('');
                  setCourseImportRequestId('');
                }}
              />
            </div>
            <div className="col-md-6 d-flex flex-wrap gap-2">
              <button type="button" className="btn btn-outline-secondary btn-sm" disabled={courseImportLoading || !courseImportFile} onClick={runCourseImportDryRun}>
                {courseImportLoading ? '處理中…' : 'Dry run 預覽'}
              </button>
              <button
                type="button"
                className="btn btn-warning btn-sm"
                disabled={courseImportLoading || !courseImportFile || !courseImportDryRun}
                onClick={runCourseImportApply}
              >
                {courseImportLoading ? '處理中…' : 'Apply 寫入'}
              </button>
              {courseImportFile ? <span className="text-muted align-self-center">{courseImportFile.name}</span> : null}
            </div>
          </div>
          {courseImportError && (
            <div className="alert alert-danger py-2 mt-2 mb-0">
              {courseImportError}
              {courseImportRequestId ? <div className="small mt-1">Request-ID：{courseImportRequestId}</div> : null}
            </div>
          )}
          {courseImportDryRun && (
            <div className="mt-3">
              <div className="fw-semibold mb-1">Dry run 結果</div>
              <div className="row g-2 mb-2">
                {[
                  ['有效列', courseImportDryRun.validRows],
                  ['錯誤列', courseImportDryRun.invalidRows],
                  ['重複列', courseImportDryRun.duplicateRows],
                  ['新課程', courseImportDryRun.wouldCreateCourses],
                  ['更新課程', courseImportDryRun.wouldUpdateCourses],
                  ['新修課', courseImportDryRun.wouldCreateEnrollments],
                  ['更新修課', courseImportDryRun.wouldUpdateEnrollments],
                  ['未知學生', courseImportDryRun.unknownStudents],
                ].map(([label, value]) => (
                  <div key={label} className="col-6 col-md-3">
                    <div className="border rounded p-2 h-100">
                      <div className="text-muted">{label}</div>
                      <div className="fw-semibold">{value ?? 0}</div>
                    </div>
                  </div>
                ))}
              </div>
              {Number(courseImportDryRun.invalidRows || 0) > 0 || Number(courseImportDryRun.duplicateRows || 0) > 0 ? (
                <div className="alert alert-warning py-2">
                  dry run 尚有錯誤或重複列，後端會拒絕 apply。請先修正檔案後重新預覽。
                </div>
              ) : (
                <div className="alert alert-success py-2">dry run 未發現阻擋性錯誤，可由 super admin apply。</div>
              )}
              {Array.isArray(courseImportDryRun.samples?.invalidRows) && courseImportDryRun.samples.invalidRows.length > 0 ? (
                <details className="mb-2">
                  <summary className="text-muted" style={{ cursor: 'pointer' }}>錯誤列樣本</summary>
                  <pre className="small bg-light p-2 rounded mt-1 mb-0 text-break" style={{ maxHeight: 180, overflow: 'auto' }}>
                    {JSON.stringify(courseImportDryRun.samples.invalidRows, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          )}
          {courseImportApply && (
            <div className="alert alert-success py-2 mt-3 mb-0">
              已寫入：新增課程 {courseImportApply.createdCourses || 0}、更新課程 {courseImportApply.updatedCourses || 0}、新增修課{' '}
              {courseImportApply.createdEnrollments || 0}、更新修課 {courseImportApply.updatedEnrollments || 0}、新增 outcomes{' '}
              {courseImportApply.createdOutcomeMappings || 0}。
            </div>
          )}
        </div>
      </div>
      )}

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
                <div className="card-header py-2 d-flex justify-content-between align-items-center">
                  <span className="fw-semibold">A. 學生基本資料</span>
                  <Link
                    className="btn btn-outline-primary btn-sm"
                    to={`/admin/learning-journey/students/${encodeURIComponent(st.studentId || studentInput || '')}`}
                  >
                    開啟正式學習歷程頁
                  </Link>
                </div>
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

            {/* D. 修課紀錄 */}
            <div className="col-md-6">
              <div className="card h-100">
                <div className="card-header py-2 fw-semibold">D. 修課紀錄</div>
                <div className="card-body small">
                  {!hasCourseData && !noStudent ? (
                    <p className="text-muted mb-0">尚無修課紀錄。</p>
                  ) : null}
                  {hasCourseData ? <div className="mb-2">修課列共 {courses.length} 筆</div> : null}
                  <ul className="ps-3 mb-0">
                    {courses.slice(0, 8).map((row, idx) => {
                      const course = row.course || {};
                      return (
                        <li key={row.id || row.enrollmentId || idx}>
                          {row.semesterId || course.semesterId || EMPTY}：{course.courseCode || EMPTY} {course.courseName || EMPTY}
                          {row.passStatus ? `（${row.passStatus}）` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>

            {/* E. Timeline */}
            <div className="col-12">
              <div className="card">
                <div className="card-header py-2 fw-semibold">E. Timeline（最多顯示 40 筆）</div>
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
                            <td>
                              {ev.type === 'course_record' ? (
                                <span className="badge bg-info text-dark">修課紀錄</span>
                              ) : (
                                ev.type
                              )}
                            </td>
                            <td>
                              {ev.title}
                              {ev.type === 'course_record' && ev.payload ? (
                                <div className="text-muted">
                                  {ev.payload.courseCode || EMPTY}；{ev.payload.departmentName || EMPTY}；學分 {ev.payload.credits || EMPTY}
                                </div>
                              ) : null}
                            </td>
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
