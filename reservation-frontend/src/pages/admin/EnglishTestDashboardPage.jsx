import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import useToast from '../../components/ui/useToast';
import { useConfirmContext } from '../../components/ui/ToastProvider';
import {
  getSemesters,
  getSemesterSummary,
  getSemesterDepartmentStats,
  getSemesterCefrDistribution,
  getSemesterDataQuality,
  getSemesterImportHistories,
  rebuildSemesterBestSkills,
} from '../../services/englishTestService';

const SKILL_KEYS = ['listening', 'reading', 'speaking', 'writing'];
const EMPTY = '—';
const HISTORY_KEY = 'english-test-v2-history';

function fmtRate(value) {
  if (value == null) return EMPTY;
  const n = Number(value);
  if (!Number.isFinite(n)) return EMPTY;
  const clamped = Math.min(1, Math.max(0, n));
  return `${(clamped * 100).toFixed(1)}%`;
}

function pickDefaultSemesterId(list) {
  if (!Array.isArray(list) || list.length === 0) return '';
  const active = list.find((s) => s && s.isActive === true);
  return String((active || list[0]).id || '');
}

export default function EnglishTestDashboardPage() {
  const [semesters, setSemesters] = useState([]);
  const [semesterId, setSemesterId] = useState('');
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [departmentStats, setDepartmentStats] = useState(null);
  const [cefrDistribution, setCefrDistribution] = useState(null);
  const [quality, setQuality] = useState(null);
  const [importHistories, setImportHistories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [error, setError] = useState('');
  const [historyRecords, setHistoryRecords] = useState([]);
  const [cefrViewMode, setCefrViewMode] = useState('enhanced');
  const lastAutoHistoryFingerprintRef = useRef(null);
  const toast = useToast();
  const confirmApi = useConfirmContext();
  const token = localStorage.getItem('token') || '';

  const selectedSemester = useMemo(
    () => semesters.find((s) => String(s.id) === String(semesterId)),
    [semesters, semesterId]
  );

  const loadSummary = useCallback(async (sid) => {
    if (!sid) return;
    setLoading(true);
    setError('');
    try {
      const [summaryData, deptData, cefrData, qualityData, importHistoryData] = await Promise.all([
        getSemesterSummary(token, sid),
        getSemesterDepartmentStats(token, sid),
        getSemesterCefrDistribution(token, sid),
        getSemesterDataQuality(token, sid),
        getSemesterImportHistories(token, sid, { limit: 200 })
      ]);
      setSummary(summaryData);
      setDepartmentStats(deptData);
      setCefrDistribution(cefrData);
      setQuality(qualityData);
      setImportHistories(Array.isArray(importHistoryData?.items) ? importHistoryData.items : []);
    } catch (e) {
      setError(e.message || '載入摘要失敗');
      setSummary(null);
      setDepartmentStats(null);
      setCefrDistribution(null);
      setQuality(null);
      setImportHistories([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistoryRecords(Array.isArray(parsed) ? parsed : []);
    } catch (_) {
      setHistoryRecords([]);
    }
  }, []);

  /** 資料載入完成後自動寫入一筆快照（指標變更才新增，避免洗版） */
  useEffect(() => {
    if (!summary || !semesterId) return;
    const fingerprint = [
      semesterId,
      summary.rosterActiveStudentCount,
      summary.validBestScoreStudentCount,
      summary.attainedStudentCount,
      quality?.rates?.scoreCoverageRate,
      quality?.rates?.rosterCompletenessRate,
    ].join('|');

    if (lastAutoHistoryFingerprintRef.current === fingerprint) return;

    try {
      const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      const arr = Array.isArray(existing) ? existing : [];
      const head = arr[0];
      const legacyDup =
        head &&
        head.semesterId === semesterId &&
        head.summary?.rosterActiveStudentCount === summary.rosterActiveStudentCount &&
        head.summary?.validBestScoreStudentCount === summary.validBestScoreStudentCount &&
        head.summary?.attainedStudentCount === summary.attainedStudentCount;
      if (head?.fingerprint === fingerprint || legacyDup) {
        lastAutoHistoryFingerprintRef.current = fingerprint;
        return;
      }

      const record = {
        id: `auto-${Date.now()}`,
        fingerprint,
        createdAt: new Date().toISOString(),
        semesterId,
        summary,
        departmentTop5: (departmentStats?.items || []).slice(0, 5),
        quality: quality || null,
        source: 'auto',
      };
      const next = [record, ...arr.filter((r) => r && r.fingerprint !== fingerprint)].slice(0, 50);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      setHistoryRecords(next);
      lastAutoHistoryFingerprintRef.current = fingerprint;
    } catch (_) {
      /* ignore */
    }
  }, [summary, semesterId, departmentStats, quality]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const list = await getSemesters(token);
        if (!mounted) return;
        setSemesters(Array.isArray(list) ? list : []);
        if (Array.isArray(list) && list.length > 0) {
          const firstId = pickDefaultSemesterId(list);
          setSemesterId(firstId);
          await loadSummary(firstId);
        }
      } catch (e) {
        if (mounted) setError(e.message || '載入學期失敗');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, loadSummary]);

  const onRebuild = async () => {
    if (!semesterId) return;
    const shouldContinue = confirmApi
      ? await confirmApi.confirm({
        title: '重新計算最佳成績',
        description: '將重新計算此學期所有學生的最佳成績快取，是否繼續？',
        confirmText: '開始重算',
        cancelText: '取消',
        variant: 'danger',
      })
      : window.confirm('將重新計算此學期所有學生的最佳成績快取，是否繼續？');
    if (!shouldContinue) return;

    setRebuilding(true);
    setError('');
    try {
      await rebuildSemesterBestSkills(token, semesterId);
      await loadSummary(semesterId);
      toast.success('重算完成，摘要已更新');
    } catch (e) {
      setError(e.message || '重新計算失敗');
      toast.error(e.message || '重新計算失敗');
    } finally {
      setRebuilding(false);
    }
  };

  const saveHistoryRecord = () => {
    if (!summary || !semesterId) return;
    const fingerprint = [
      semesterId,
      summary.rosterActiveStudentCount,
      summary.validBestScoreStudentCount,
      summary.attainedStudentCount,
      quality?.rates?.scoreCoverageRate,
      quality?.rates?.rosterCompletenessRate,
      'manual',
    ].join('|');
    const record = {
      id: `${Date.now()}`,
      fingerprint,
      createdAt: new Date().toISOString(),
      semesterId,
      summary,
      departmentTop5: (departmentStats?.items || []).slice(0, 5),
      quality: quality || null,
      source: 'manual',
    };
    const next = [record, ...historyRecords.filter((r) => r && r.fingerprint !== fingerprint)].slice(0, 50);
    setHistoryRecords(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    lastAutoHistoryFingerprintRef.current = fingerprint;
    toast.success('已儲存歷史追蹤快照');
  };

  const removeHistoryRecord = (id) => {
    const next = historyRecords.filter((r) => r.id !== id);
    setHistoryRecords(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  };

  const cefrLevelColor = (lv) => {
    if (lv === 'NO_DATA') return '#ced4da';
    if (lv === 'A1') return '#9aa5b1';
    if (lv === 'A2') return '#7b8a99';
    if (lv === 'B1') return '#6c7cff';
    if (lv === 'B2') return '#4fa3e8';
    if (lv === 'C1') return '#38c8a8';
    if (lv === 'C2') return '#f0b429';
    return '#7c6ff0';
  };

  /**
   * 色塊寬度：混合「實際占比」與「非零段均等配額」並設下限，避免極小比例難以辨識；加總後正規化為 100%。
   * 標籤上仍顯示實際人數占比（actualPct）。
   */
  const buildCefrBarSegments = (levels, skillStats, total) => {
    const label = (lv) => (lv === 'NO_DATA' ? '無' : lv);
    const raw = levels
      .map((lv) => {
        const count = Number(skillStats?.[lv] || 0);
        const actualPct = total > 0 ? (count / total) * 100 : 0;
        return { lv, count, actualPct, label: label(lv) };
      })
      .filter((x) => x.count > 0);
    if (raw.length === 0) return [];
    const k = raw.length;
    const equalShare = 100 / k;
    const MIN_BLEND = 5;
    const weights = raw.map(({ actualPct }) => {
      const boosted = Math.max(actualPct, MIN_BLEND);
      return 0.42 * equalShare + 0.58 * boosted;
    });
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;
    return raw.map((row, i) => ({
      ...row,
      visualPct: (weights[i] / sumW) * 100,
    }));
  };

  const buildCefrActualSegments = (levels, skillStats, total) => {
    const label = (lv) => (lv === 'NO_DATA' ? '無' : lv);
    return levels
      .map((lv) => {
        const count = Number(skillStats?.[lv] || 0);
        const actualPct = total > 0 ? (count / total) * 100 : 0;
        return { lv, count, actualPct, label: label(lv) };
      })
      .filter((x) => x.count > 0);
  };

  const renderCefrBar = (skillStats, total) => {
    const levels = cefrDistribution?.levels?.length
      ? cefrDistribution.levels
      : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NO_DATA'];
    if (!total) {
      return <div className="text-muted small">無名冊人數</div>;
    }
    const segments = buildCefrBarSegments(levels, skillStats, total);
    if (segments.length === 0) {
      return <div className="text-muted small">無 CEFR 資料（請先執行「重新計算最佳成績」）</div>;
    }
    return (
      <div
        className="d-flex w-100 align-items-stretch border rounded overflow-hidden bg-white"
        style={{ minHeight: 44 }}
      >
        {segments.map(({ lv, count, actualPct, visualPct, label: lvLabel }) => {
          const isNoData = lv === 'NO_DATA';
          const pctText = `${actualPct.toFixed(1)}%`;
          return (
            <div
              key={lv}
              title={`${lvLabel}：${count} 人（實際占比 ${pctText}）`}
              style={{
                width: `${visualPct}%`,
                minWidth: '2.25rem',
                background: cefrLevelColor(lv),
                color: isNoData ? '#495057' : '#fff',
                fontSize: 11,
                lineHeight: 1.15,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 2px',
                textAlign: 'center',
                wordBreak: 'break-word',
              }}
            >
              <span className="fw-semibold" style={{ fontSize: 12 }}>{lvLabel}</span>
              <span className="opacity-90" style={{ fontSize: 10 }}>{pctText}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCefrBarLegacy = (skillStats, total) => {
    const levels = cefrDistribution?.levels?.length
      ? cefrDistribution.levels
      : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NO_DATA'];
    if (!total) {
      return <div className="text-muted small">無名冊人數</div>;
    }
    const segments = buildCefrActualSegments(levels, skillStats, total);
    if (segments.length === 0) {
      return <div className="text-muted small">無 CEFR 資料（請先執行「重新計算最佳成績」）</div>;
    }

    const tinyThreshold = 8;
    const minGapPct = 7.5;
    let cumulative = 0;
    const positioned = segments.map((seg) => {
      const centerPct = cumulative + seg.actualPct / 2;
      cumulative += seg.actualPct;
      return { ...seg, centerPct, isTiny: seg.actualPct < tinyThreshold };
    });
    const tinySegments = positioned.filter((s) => s.isTiny).sort((a, b) => a.centerPct - b.centerPct);
    const laneLast = [1, 1];
    const tinyLeaders = tinySegments.map((seg) => {
      const preferred = seg.centerPct;
      const lane0Ok = preferred - laneLast[0] >= minGapPct;
      const lane1Ok = preferred - laneLast[1] >= minGapPct;
      let lane = 0;
      if (!lane0Ok && lane1Ok) lane = 1;
      else if (!lane0Ok && !lane1Ok) lane = laneLast[0] <= laneLast[1] ? 0 : 1;
      else lane = laneLast[0] <= laneLast[1] ? 0 : 1;

      const leftPct = Math.max(2, Math.min(98, Math.max(preferred, laneLast[lane] + minGapPct)));
      laneLast[lane] = leftPct;
      return {
        ...seg,
        lane,
        anchorPct: preferred,
        leftPct,
      };
    });

    return (
      <div className="w-100">
        <div className="d-flex w-100 border rounded overflow-hidden bg-white" style={{ height: 28 }}>
          {positioned.map(({ lv, count, actualPct, label: lvLabel, isTiny }) => {
            const isNoData = lv === 'NO_DATA';
            const pctText = `${actualPct.toFixed(1)}%`;
            return (
              <div
                key={lv}
                title={`${lvLabel}：${count} 人（實際占比 ${pctText}）`}
                style={{
                  width: `${actualPct}%`,
                  background: cefrLevelColor(lv),
                  color: isNoData ? '#495057' : '#fff',
                  fontSize: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  padding: '0 2px',
                }}
              >
                {!isTiny ? `${lvLabel} ${pctText}` : ''}
              </div>
            );
          })}
        </div>
        <div className="position-relative mt-1" style={{ height: 46 }}>
          {tinyLeaders.map(({ lv, label: lvLabel, actualPct, anchorPct, leftPct, lane }) => {
            const guideY = lane === 0 ? 10 : 26;
            const labelTop = lane === 0 ? 12 : 28;
            return (
              <React.Fragment key={`${lv}-leader`}>
                <div
                  className="position-absolute"
                  style={{
                    left: `${anchorPct}%`,
                    top: 0,
                    width: 1,
                    height: guideY,
                    background: '#6c757d',
                    transform: 'translateX(-50%)',
                  }}
                />
                <div
                  className="position-absolute"
                  style={{
                    left: `${Math.min(anchorPct, leftPct)}%`,
                    top: guideY,
                    width: `${Math.max(Math.abs(leftPct - anchorPct), 0.6)}%`,
                    height: 1,
                    background: '#6c757d',
                  }}
                />
                <div
                  className="position-absolute"
                  style={{
                    left: `${leftPct}%`,
                    transform: 'translateX(-50%)',
                    top: labelTop,
                    width: 'max-content',
                    textAlign: 'center',
                    color: '#495057',
                    fontSize: 10,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {`${lvLabel} ${actualPct.toFixed(1)}%`}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  const gradeLabel = (grade) => {
    const g = String(grade || '').trim();
    if (g === '1') return '大一';
    if (g === '2') return '大二';
    if (g === '3') return '大三';
    if (g === '4') return '大四';
    return g || '未填年級';
  };

  const b2Dashboard = useMemo(() => {
    const grades = Array.isArray(cefrDistribution?.grades) ? cefrDistribution.grades : [];
    const b2Levels = ['B2', 'C1', 'C2'];

    const calcSkillCount = (skillStats = {}) => b2Levels.reduce((sum, lv) => sum + Number(skillStats?.[lv] || 0), 0);
    const toRate = (count, total) => (total > 0 ? Number((count / total).toFixed(4)) : 0);

    const gradeRows = grades
      .map((row) => {
        const total = Number(row?.total || 0);
        const skills = {};
        SKILL_KEYS.forEach((skill) => {
          const count = calcSkillCount(row?.skills?.[skill] || {});
          skills[skill] = { count, rate: toRate(count, total) };
        });
        return { grade: String(row?.grade || ''), total, skills };
      })
      .filter((row) => ['1', '2', '3', '4'].includes(row.grade));

    const byGrade = new Map(gradeRows.map((row) => [row.grade, row]));

    const buildGroup = (gradeIds, label) => {
      const selected = gradeIds.map((id) => byGrade.get(String(id))).filter(Boolean);
      const total = selected.reduce((sum, row) => sum + row.total, 0);
      const skills = {};
      SKILL_KEYS.forEach((skill) => {
        const count = selected.reduce((sum, row) => sum + Number(row.skills?.[skill]?.count || 0), 0);
        skills[skill] = { count, rate: toRate(count, total) };
      });
      return { label, gradeIds, total, skills };
    };

    return {
      gradeRows,
      groupA: buildGroup(['1', '2', '3'], '大一至大三'),
      groupB: buildGroup(['2', '3', '4'], '大二至大四'),
    };
  }, [cefrDistribution]);

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-1">英檢長期追蹤 V2</h4>
          <div className="text-muted small">Dashboard</div>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-primary" to={`/admin/english-test-v2/students?semesterId=${encodeURIComponent(semesterId || '')}`}>
            學生列表
          </Link>
          <button className="btn btn-primary" onClick={onRebuild} disabled={!semesterId || rebuilding}>
            {rebuilding ? '重新計算中...' : '重新計算最佳成績'}
          </button>
          <button className="btn btn-outline-secondary" onClick={saveHistoryRecord} disabled={!summary}>
            儲存追蹤快照
          </button>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <label htmlFor="semester-select" className="form-label">學期</label>
          <select
            id="semester-select"
            className="form-select"
            value={semesterId}
            onChange={(e) => {
              const next = e.target.value;
              setSemesterId(next);
              loadSummary(next);
            }}
          >
            {!semesters.length && <option value="">尚無學期資料</option>}
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name || s.code || s.id}
              </option>
            ))}
          </select>
          {selectedSemester && (
            <div className="small text-muted mt-2">
              目前學期：{selectedSemester.name || selectedSemester.code || selectedSemester.id}
            </div>
          )}
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">載入中...</div>}
      {!loading && !error && semesters.length === 0 && <div className="alert alert-secondary">尚無學期資料</div>}
      {!loading && !error && semesters.length > 0 && !summary && <div className="alert alert-secondary">尚無摘要資料</div>}

      {!loading && summary && (
        <>
          <ul className="nav nav-pills mb-3">
            <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'summary' ? 'active' : ''}`} onClick={() => setActiveTab('summary')}>統計總覽</button></li>
            <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'department' ? 'active' : ''}`} onClick={() => setActiveTab('department')}>各系所統計總表</button></li>
            <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'cefr' ? 'active' : ''}`} onClick={() => setActiveTab('cefr')}>CEFR 分布圖</button></li>
            <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'importGrowth' ? 'active' : ''}`} onClick={() => setActiveTab('importGrowth')}>匯入歷程成長</button></li>
            <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'quality' ? 'active' : ''}`} onClick={() => setActiveTab('quality')}>資料品質儀表板</button></li>
            <li className="nav-item"><button type="button" className={`nav-link ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>歷史追蹤儲存</button></li>
          </ul>

          {activeTab === 'summary' && (
            <>
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span
              className={`badge ${summary.source === 'learning_journey_v3' ? 'bg-primary' : 'bg-secondary'}`}
            >
              {summary.source === 'learning_journey_v3' ? '資料來源：Learning Journey v3' : '資料來源：英檢 V2'}
            </span>
          </div>
          {Array.isArray(summary.warnings) && summary.warnings.length > 0 ? (
            <div className="alert alert-warning py-2 small mb-2">{summary.warnings.join(' ')}</div>
          ) : null}
          <div className="row g-3 mb-3">
            <div className="col-md-3"><div className="card"><div className="card-body"><div className="text-muted small">名冊人數</div><div className="h4 mb-0">{summary.rosterActiveStudentCount ?? 0}</div></div></div></div>
            <div className="col-md-3"><div className="card"><div className="card-body"><div className="text-muted small">有成績人數</div><div className="h4 mb-0">{summary.validBestScoreStudentCount ?? 0}</div></div></div></div>
            <div className="col-md-3"><div className="card"><div className="card-body"><div className="text-muted small">達標人數</div><div className="h4 mb-0">{summary.attainedStudentCount ?? 0}</div></div></div></div>
            <div className="col-md-3"><div className="card"><div className="card-body"><div className="text-muted small">達標率</div><div className="h4 mb-0">{fmtRate(summary.attainmentRate)}</div></div></div></div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-3">大一至大三 B2（含）以上達標率</h6>
              <div className="row g-3">
                {SKILL_KEYS.map((skill) => (
                  <div className="col-md-3" key={`a-${skill}`}>
                    <div className="card border-primary-subtle h-100">
                      <div className="card-body">
                        <div className="text-capitalize text-primary fw-semibold">{skill}</div>
                        <div className="h4 mt-2 mb-1">{fmtRate(b2Dashboard.groupA.skills?.[skill]?.rate)}</div>
                        <div className="text-muted small">
                          {b2Dashboard.groupA.skills?.[skill]?.count ?? 0} / {b2Dashboard.groupA.total ?? 0} 人
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <h6 className="mb-3">大二至大四 B2（含）以上達標率</h6>
              <div className="row g-3">
                {SKILL_KEYS.map((skill) => (
                  <div className="col-md-3" key={`b-${skill}`}>
                    <div className="card border-warning-subtle h-100">
                      <div className="card-body">
                        <div className="text-capitalize text-warning-emphasis fw-semibold">{skill}</div>
                        <div className="h4 mt-2 mb-1">{fmtRate(b2Dashboard.groupB.skills?.[skill]?.rate)}</div>
                        <div className="text-muted small">
                          {b2Dashboard.groupB.skills?.[skill]?.count ?? 0} / {b2Dashboard.groupB.total ?? 0} 人
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6 className="mb-2">各年級四項技能達標 B2（含）以上人數與比例</h6>
              <div className="text-muted small mb-3">
                比例分母為該年級（或彙總區間）本國生總數；B2（含）以上包含 B2 / C1 / C2。
              </div>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>年級</th>
                      <th>本國生總數</th>
                      <th>聽力 ≥ B2</th>
                      <th>閱讀 ≥ B2</th>
                      <th>口說 ≥ B2</th>
                      <th>寫作 ≥ B2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b2Dashboard.gradeRows.map((row) => (
                      <tr key={`grade-${row.grade}`}>
                        <td>{gradeLabel(row.grade)}</td>
                        <td>{row.total} 人</td>
                        {SKILL_KEYS.map((skill) => (
                          <td key={`${row.grade}-${skill}`}>
                            <div>{row.skills?.[skill]?.count ?? 0} 人</div>
                            <div className="small text-muted">{fmtRate(row.skills?.[skill]?.rate)}</div>
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="table-primary">
                      <td>{b2Dashboard.groupA.label} 總計</td>
                      <td>{b2Dashboard.groupA.total} 人</td>
                      {SKILL_KEYS.map((skill) => (
                        <td key={`sum-a-${skill}`}>
                          <div>{b2Dashboard.groupA.skills?.[skill]?.count ?? 0} 人</div>
                          <div className="small">{fmtRate(b2Dashboard.groupA.skills?.[skill]?.rate)}</div>
                        </td>
                      ))}
                    </tr>
                    <tr className="table-warning">
                      <td>{b2Dashboard.groupB.label} 總計</td>
                      <td>{b2Dashboard.groupB.total} 人</td>
                      {SKILL_KEYS.map((skill) => (
                        <td key={`sum-b-${skill}`}>
                          <div>{b2Dashboard.groupB.skills?.[skill]?.count ?? 0} 人</div>
                          <div className="small">{fmtRate(b2Dashboard.groupB.skills?.[skill]?.rate)}</div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </>
          )}

          {activeTab === 'department' && (
            <div className="card">
              <div className="card-body">
                <h6 className="mb-3">各系所建檔比例</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-striped">
                    <thead><tr><th>系所</th><th>本國生總數</th><th>有成績</th><th>建檔率</th><th>大一</th><th>大二</th><th>大三</th><th>大四</th></tr></thead>
                    <tbody>
                      {(departmentStats?.items || []).map((row) => (
                        <tr key={row.department}>
                          <td>{row.department || EMPTY}</td>
                          <td>{row.total}</td>
                          <td>{row.recorded}</td>
                          <td>{fmtRate(row.recordRate)}</td>
                          {['1', '2', '3', '4'].map((g) => {
                            const gt = row.grades?.[g]?.total || 0;
                            const gr = row.grades?.[g]?.recorded || 0;
                            return <td key={g}>{gt > 0 ? `${gr}/${gt}` : EMPTY}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cefr' && (
            <div className="card">
              <div className="card-body">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
                  <h6 className="mb-0">各年級 × 技能 CEFR 分布</h6>
                  <div className="btn-group btn-group-sm" role="group" aria-label="CEFR 視圖切換">
                    <button
                      type="button"
                      className={`btn ${cefrViewMode === 'enhanced' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setCefrViewMode('enhanced')}
                    >
                      新版（易讀）
                    </button>
                    <button
                      type="button"
                      className={`btn ${cefrViewMode === 'legacy' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setCefrViewMode('legacy')}
                    >
                      舊版（真實比例）
                    </button>
                  </div>
                </div>
                <p className="text-muted small mb-2">
                  以最佳成績快取之四技能 CEFR 統計；僅有 rank、無字串時會由 rank 反查。灰色「無」為尚無對應 CEFR 之名冊人數。
                </p>
                <p className="text-muted small mb-3">
                  {cefrViewMode === 'enhanced'
                    ? <>色塊內<strong>百分比為實際人數占比</strong>；色塊寬度經適度放大（與均等配額混合）以利辨識，與占比數值不必完全一致。</>
                    : <>舊版使用<strong>真實比例寬度</strong>；若色塊過小，會在下方以拉線標示等級與實際占比。</>}
                </p>
                {(cefrDistribution?.grades || []).length === 0 && (
                  <div className="text-muted">尚無年級資料可統計</div>
                )}
                {(cefrDistribution?.grades || []).map((gradeRow) => (
                  <div key={gradeRow.grade} className="mb-3">
                    <div className="fw-semibold mb-2">年級 {gradeRow.grade}</div>
                    {SKILL_KEYS.map((skill) => {
                      const skillStats = gradeRow.skills?.[skill] || {};
                      return (
                        <div
                          key={skill}
                          className={`d-flex gap-2 mb-2 ${cefrViewMode === 'legacy' ? 'align-items-start' : 'align-items-center'}`}
                        >
                          <div
                            style={{ width: 90, paddingTop: cefrViewMode === 'legacy' ? 4 : 0 }}
                            className="text-capitalize small"
                          >
                            {skill}
                          </div>
                          <div className="flex-grow-1">
                            {cefrViewMode === 'enhanced'
                              ? renderCefrBar(skillStats, gradeRow.total)
                              : renderCefrBarLegacy(skillStats, gradeRow.total)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'importGrowth' && (
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">匯入歷程成長追蹤</h6>
                <p className="text-muted small mb-3">
                  以每次「成績匯入」作為節點，記錄匯入前後四技能 B2（含）以上比例變化與新增達標人數（各技能分開統計）。
                </p>
                {importHistories.length === 0 && (
                  <div className="text-muted">尚無匯入歷程資料（請先執行成績匯入，並填寫匯入名稱）。</div>
                )}
                {importHistories.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>時間</th>
                          <th>匯入名稱</th>
                          <th>匯入筆數</th>
                          <th>新增達標（聽/讀/說/寫）</th>
                          <th>比例變化（聽/讀/說/寫）</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importHistories.map((row) => {
                          const newB2 = row.newB2BySkill || {};
                          const delta = row.deltaStats?.skills || {};
                          const fmtDelta = (v) => {
                            const n = Number(v || 0);
                            const sign = n > 0 ? '+' : '';
                            return `${sign}${(n * 100).toFixed(1)}%`;
                          };
                          return (
                            <tr key={row.id || row.importBatchId}>
                              <td>{row.importedAt ? new Date(row.importedAt).toLocaleString() : EMPTY}</td>
                              <td>{row.importName || EMPTY}</td>
                              <td>{row.importedCount ?? 0}（略過 {row.skippedCount ?? 0}）</td>
                              <td>{`${newB2.listening || 0} / ${newB2.reading || 0} / ${newB2.speaking || 0} / ${newB2.writing || 0}`}</td>
                              <td>{`${fmtDelta(delta.listening?.rate)} / ${fmtDelta(delta.reading?.rate)} / ${fmtDelta(delta.speaking?.rate)} / ${fmtDelta(delta.writing?.rate)}`}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'quality' && (
            <div className="row g-3">
              <div className="col-md-4"><div className="card"><div className="card-body"><div className="text-muted small">名冊人數</div><div className="h5 mb-0">{quality?.kpis?.rosterStudentCount ?? 0}</div></div></div></div>
              <div className="col-md-4"><div className="card"><div className="card-body"><div className="text-muted small">無成績學生</div><div className="h5 mb-0">{quality?.kpis?.noScoreStudentCount ?? 0}</div></div></div></div>
              <div className="col-md-4"><div className="card"><div className="card-body"><div className="text-muted small">孤兒 BestSkill</div><div className="h5 mb-0">{quality?.kpis?.orphanBestSkillCount ?? 0}</div></div></div></div>
              <div className="col-md-6"><div className="card"><div className="card-body"><div className="text-muted small">成績覆蓋率</div><div className="h5 mb-0">{fmtRate(quality?.rates?.scoreCoverageRate)}</div><div className="small text-muted mt-1">（有名冊且具最佳成績或曾匯入 attempts）</div></div></div></div>
              <div className="col-md-6"><div className="card"><div className="card-body"><div className="text-muted small">名冊完整率（三欄位）</div><div className="h5 mb-0">{fmtRate(quality?.rates?.rosterCompletenessRate)}</div><div className="small text-muted mt-1">姓名／系所／年級 已填欄位 ÷ 總欄位；姓名與系所會以學籍主檔補齊後再計算</div></div></div></div>
              <div className="col-md-4"><div className="card"><div className="card-body"><div className="text-muted small">姓名填寫率</div><div className="h5 mb-0">{fmtRate(quality?.rates?.nameFillRate)}</div></div></div></div>
              <div className="col-md-4"><div className="card"><div className="card-body"><div className="text-muted small">系所填寫率</div><div className="h5 mb-0">{fmtRate(quality?.rates?.departmentFillRate)}</div></div></div></div>
              <div className="col-md-4"><div className="card"><div className="card-body"><div className="text-muted small">年級填寫率</div><div className="h5 mb-0">{fmtRate(quality?.rates?.gradeFillRate)}</div></div></div></div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">歷史快照（本機瀏覽器）</h6>
                <p className="text-muted small mb-3">每次儀表板成功載入摘要時會自動儲存一筆（指標變更才新增）；亦可手動按「儲存追蹤快照」。</p>
                {historyRecords.length === 0 && <div className="text-muted">尚無歷史快照（請確認已選學期且摘要載入成功）</div>}
                {historyRecords.length > 0 && (
                  <div className="table-responsive">
                    <table className="table table-sm">
                      <thead><tr><th>時間</th><th>來源</th><th>學期</th><th>名冊</th><th>有成績</th><th>達標</th><th>達標率</th><th>操作</th></tr></thead>
                      <tbody>
                        {historyRecords.map((r) => (
                          <tr key={r.id}>
                            <td>{new Date(r.createdAt).toLocaleString()}</td>
                            <td>{r.source === 'manual' ? '手動' : '自動'}</td>
                            <td>{r.semesterId}</td>
                            <td>{r.summary?.rosterActiveStudentCount ?? 0}</td>
                            <td>{r.summary?.validBestScoreStudentCount ?? 0}</td>
                            <td>{r.summary?.attainedStudentCount ?? 0}</td>
                            <td>{fmtRate(r.summary?.attainmentRate)}</td>
                            <td><button className="btn btn-sm btn-outline-danger" onClick={() => removeHistoryRecord(r.id)}>刪除</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

