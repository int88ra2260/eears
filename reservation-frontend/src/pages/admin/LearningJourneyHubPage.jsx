import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  getLearningJourneyProfile,
  getLearningJourneySemesterDashboard,
  getLearningJourneyReadiness,
  getLearningJourneyReadModelStatus,
  getLearningJourneyEnglishTestSummaryCompare,
  getLearningJourneyEnglishTestStudentsCompare,
  getLearningJourneyRiskStudents,
  getLearningJourneyDataFreshness,
} from '../../services/learningJourneyApi';
import {
  getSemesters,
  getSemesterSummary,
  getSemesterDepartmentStats,
  getSemesterCefrDistribution,
  getSemesterDataQuality,
  getSemesterImportHistories,
  getSemesterStudents,
  rebuildSemesterBestSkills,
} from '../../services/englishTestService';

const EMPTY = '—';
const HISTORY_KEY = 'english-test-v2-history';
const TAB_IDS = ['student', 'overview', 'students', 'diagnostics'];
const SKILL_LABELS = {
  listening: '聽力',
  reading: '閱讀',
  speaking: '口說',
  writing: '寫作',
};
const SKILL_KEYS = Object.keys(SKILL_LABELS);
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NO_DATA'];

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

function pickDefaultSemesterId(list, fallback = '114-1') {
  if (!Array.isArray(list) || list.length === 0) return fallback;
  const active = list.find((s) => s && s.isActive === true);
  return String((active || list[0]).id || (active || list[0]).code || fallback);
}

function fmtRate(value) {
  if (value == null) return EMPTY;
  const n = Number(value);
  if (!Number.isFinite(n)) return EMPTY;
  return `${(Math.max(0, Math.min(1, n)) * 100).toFixed(1)}%`;
}

function text(value) {
  if (value === null || value === undefined || value === '') return EMPTY;
  return String(value);
}

function formatDate(value) {
  if (!value) return EMPTY;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('zh-TW', { hour12: false });
}

function buildSkillMap(skillScores = []) {
  const map = { listening: null, reading: null, speaking: null, writing: null };
  skillScores.forEach((score) => {
    const key = String(score?.skill || '').toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, key)) {
      map[key] = score;
    }
  });
  return map;
}

function getAttemptSkillText(skillScore) {
  if (!skillScore) return EMPTY;
  const raw = skillScore.rawScore ?? skillScore.score ?? EMPTY;
  const cefr = skillScore.cefr || skillScore.cefrLevel || EMPTY;
  return `${raw} / ${cefr}`;
}

function cefrLevelLabel(level) {
  return level === 'NO_DATA' ? '無' : level;
}

function cefrLevelColor(level) {
  if (level === 'NO_DATA') return '#ced4da';
  if (level === 'A1') return '#9aa5b1';
  if (level === 'A2') return '#7b8a99';
  if (level === 'B1') return '#6c7cff';
  if (level === 'B2') return '#4fa3e8';
  if (level === 'C1') return '#38c8a8';
  if (level === 'C2') return '#f0b429';
  return '#7c6ff0';
}

function getReadableError(error, fallback) {
  const message = String(error?.message || fallback || '資料取得失敗，請稍後再試。');
  return message.replace(/（Request-ID:.*?）/g, '').trim();
}

function ErrorState({ message, requestId }) {
  return (
    <div className="alert alert-danger mb-0">
      <div className="fw-semibold mb-1">資料取得失敗</div>
      <div>{message || '系統暫時無法取得資料，請稍後再試或聯絡管理員。'}</div>
      {requestId ? <div className="small mt-1">錯誤識別碼：{requestId}</div> : null}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="card border-0 bg-light">
      <div className="card-body text-muted">{children}</div>
    </div>
  );
}

function LoadingState({ children = '正在載入學習歷程資料...' }) {
  return (
    <div className="card border-0 bg-light">
      <div className="card-body d-flex align-items-center gap-2 text-muted">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>{children}</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className="card h-100">
        <div className="card-body">
          <div className="text-muted small">{label}</div>
          <div className="h4 mb-0">{value ?? EMPTY}</div>
          {hint ? <div className="small text-muted mt-1">{hint}</div> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileSummary({ profile, studentInput, semesterInput }) {
  const student = profile?.student || {};
  const flags = student.aggregateFlags || {};
  const attempts = Array.isArray(profile?.examAttempts) ? profile.examAttempts : [];
  const ljsAttempts = Array.isArray(student?.ljsExamAttempts) ? student.ljsExamAttempts : [];
  const activities = Array.isArray(profile?.activities) ? profile.activities : [];
  const courses = Array.isArray(profile?.courses) ? profile.courses : [];
  const timeline = Array.isArray(profile?.timeline) ? profile.timeline : [];
  const dataQuality = Array.isArray(profile?.dataQuality) ? profile.dataQuality : [];
  const studentId = student.studentId || studentInput;
  const hasNoData = dataQuality.some((q) => q?.code === 'NO_STUDENT_AGGREGATE');
  const bestSkillsBySemester = profile?.bestSkills || {};
  const selectedBestSkills = Array.isArray(bestSkillsBySemester?.[semesterInput])
    ? bestSkillsBySemester[semesterInput]
    : Object.values(bestSkillsBySemester).find((rows) => Array.isArray(rows) && rows.length > 0) || [];
  const allAttempts = [
    ...attempts.map((row) => ({ ...row, displaySource: row.source || '英檢紀錄' })),
    ...ljsAttempts.map((row) => ({ ...row, displaySource: row.sourceType || row.source || '學習歷程紀錄' })),
  ];

  if (hasNoData) {
    return <EmptyState>查無此學生於該學期的學習歷程資料。</EmptyState>;
  }

  return (
    <div className="row g-3">
      <div className="col-12">
        <div className="card">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between gap-2">
              <div>
                <div className="text-muted small">學生</div>
                <div className="h5 mb-0">
                  {studentId || EMPTY}
                  {student.etStudentMaster?.name ? `　${student.etStudentMaster.name}` : ''}
                </div>
              </div>
              {studentId ? (
                <Link className="btn btn-outline-primary btn-sm align-self-start" to={`/admin/learning-journey/students/${encodeURIComponent(studentId)}`}>
                  開啟完整學生頁
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <KpiCard label="英檢與 BESTEP 紀錄" value={`${allAttempts.length + Number(flags.bestepScoresCount || 0)} 筆`} />
      <KpiCard label="活動參與" value={`${activities.length} 筆`} />
      <KpiCard label="修課紀錄" value={`${courses.length} 筆`} />
      <KpiCard label="風險提示" value={dataQuality.length ? `${dataQuality.length} 則` : '無'} />

      <div className="col-12">
        <div className="card">
          <div className="card-header py-2 fw-semibold">Best Skills</div>
          <div className="card-body small">
            {selectedBestSkills.length === 0 ? (
              <div className="text-muted">尚無此學生的四技最佳成績彙整。</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>學期</th>
                      <th>聽力</th>
                      <th>閱讀</th>
                      <th>口說</th>
                      <th>寫作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBestSkills.map((row, idx) => (
                      <tr key={row.id || `${row.semesterId}-${idx}`}>
                        <td>{text(row.semesterId || semesterInput)}</td>
                        <td>{text(row.bestListeningCefr)}</td>
                        <td>{text(row.bestReadingCefr)}</td>
                        <td>{text(row.bestSpeakingCefr)}</td>
                        <td>{text(row.bestWritingCefr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card-header py-2 fw-semibold">Attempts 與 CEFR 明細</div>
          <div className="card-body small">
            {allAttempts.length === 0 ? (
              <div className="text-muted">尚無英檢或 BESTEP attempts 明細。</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-bordered mb-0 align-middle">
                  <thead className="table-light">
                    <tr>
                      <th>日期</th>
                      <th>類型</th>
                      <th>聽力 raw / CEFR</th>
                      <th>閱讀 raw / CEFR</th>
                      <th>口說 raw / CEFR</th>
                      <th>寫作 raw / CEFR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allAttempts.slice(0, 20).map((attempt, idx) => {
                      const scoreMap = buildSkillMap(attempt.skillScores || attempt.scores || []);
                      return (
                        <tr key={attempt.id || `${attempt.examDate || attempt.testDate}-${idx}`}>
                          <td>{text(attempt.examDate || attempt.testDate || attempt.date)}</td>
                          <td>{text(attempt.examType || attempt.testType || attempt.sourceType || attempt.displaySource)}</td>
                          {SKILL_KEYS.map((skill) => (
                            <td key={skill}>{getAttemptSkillText(scoreMap[skill])}</td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card h-100">
          <div className="card-header py-2 fw-semibold">活動參與與風險狀態</div>
          <div className="card-body small">
            {activities.length === 0 ? <div className="text-muted">尚無活動參與或 BESTEP 出席紀錄。</div> : (
              <ul className="mb-0 ps-3">
                {activities.slice(0, 8).map((row, idx) => (
                  <li key={idx}>
                    {row.kind === 'reservation'
                      ? `預約：${row.event?.eventType || row.event?.name || '活動'} - ${row.reservation?.checkinStatus || EMPTY}`
                      : `${row.participation?.activityType || '活動'} - ${row.participation?.attendanceStatus || EMPTY}`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card h-100">
          <div className="card-header py-2 fw-semibold">資料摘要</div>
          <div className="card-body small">
            <div className="row g-2">
              <div className="col-6"><span className="text-muted">BESTEP 成績</span><div>{Number(flags.bestepScoresCount || 0)} 筆</div></div>
              <div className="col-6"><span className="text-muted">BESTEP 出席</span><div>{Number(flags.bestepAttendanceCount || 0)} 筆</div></div>
              <div className="col-6"><span className="text-muted">培力報名</span><div>{flags.hasExamRegistrations ? '有資料' : '尚無資料'}</div></div>
              <div className="col-6"><span className="text-muted">達標彙整</span><div>{flags.hasBestSkills ? '有資料' : '尚無資料'}</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card-header py-2 fw-semibold">近期歷程</div>
          <div className="card-body p-0">
            {timeline.length === 0 ? <div className="p-3 text-muted small">尚無歷程事件。</div> : (
              <div className="table-responsive">
                <table className="table table-sm table-striped mb-0 align-middle">
                  <thead className="table-light">
                    <tr><th>日期</th><th>類型</th><th>標題</th><th>狀態</th><th>來源</th></tr>
                  </thead>
                  <tbody>
                    {timeline.slice(0, 40).map((event) => (
                      <tr key={event.id || `${event.type}-${event.date}-${event.title}`}>
                        <td>{formatDate(event.date)}</td>
                        <td>{text(event.type)}</td>
                        <td>{text(event.title)}</td>
                        <td>{text(event.status)}</td>
                        <td>{text(event.source)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SemesterOverview({ dashboard, summary, departmentStats, cefrDistribution, quality, riskData, historyRecords }) {
  const semester = dashboard?.semesters?.[0] || {};
  const summaryData = summary || semester;
  const skills = summaryData.skills || semester.skills || dashboard?.skills || {};
  const riskItems = Array.isArray(riskData?.items) ? riskData.items : Array.isArray(riskData?.topStudents) ? riskData.topStudents : [];

  if (!dashboard && !summary && !riskData) {
    return <EmptyState>此區塊尚未取得資料，請點擊「查看學期總覽」。</EmptyState>;
  }

  const renderCefrBar = (skillStats = {}, total = 0) => {
    if (!total) return <div className="text-muted small">無名冊人數</div>;
    const segments = (cefrDistribution?.levels?.length ? cefrDistribution.levels : CEFR_LEVELS)
      .map((level) => {
        const count = Number(skillStats?.[level] || 0);
        const pct = total > 0 ? (count / total) * 100 : 0;
        return { level, count, pct };
      })
      .filter((row) => row.count > 0);

    if (segments.length === 0) {
      return <div className="text-muted small">尚無 CEFR 分布資料。</div>;
    }

    return (
      <div className="d-flex w-100 border rounded overflow-hidden bg-white" style={{ minHeight: 36 }}>
        {segments.map(({ level, count, pct }) => (
          <div
            key={level}
            title={`${cefrLevelLabel(level)}：${count} 人（${pct.toFixed(1)}%）`}
            style={{
              width: `${Math.max(pct, 6)}%`,
              minWidth: '2.25rem',
              background: cefrLevelColor(level),
              color: level === 'NO_DATA' ? '#495057' : '#fff',
              fontSize: 11,
              textAlign: 'center',
              padding: '4px 2px',
            }}
          >
            <div className="fw-semibold">{cefrLevelLabel(level)}</div>
            <div>{pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="row g-3">
      <KpiCard label="名冊人數" value={summaryData.rosterActiveCount ?? summaryData.rosterActiveStudentCount ?? 0} />
      <KpiCard label="有成績人數" value={summaryData.validBestScoreStudentCount ?? 0} />
      <KpiCard label="達標人數" value={summaryData.attainedStudentCount ?? 0} />
      <KpiCard label="達標率" value={fmtRate(summaryData.attainmentRate)} />

      <div className="col-lg-7">
        <div className="card h-100">
          <div className="card-header py-2 fw-semibold">CEFR 分布與達標率</div>
          <div className="card-body">
            {Object.keys(SKILL_LABELS).map((skill) => {
              const rate = Number(skills?.[skill]?.rate ?? skills?.[skill]?.attainmentRate ?? 0);
              return (
                <div className="mb-3" key={skill}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{SKILL_LABELS[skill]}</span>
                    <span>{fmtRate(rate)}</span>
                  </div>
                  <div className="progress" style={{ height: 10 }}>
                    <div className="progress-bar" style={{ width: `${Math.max(0, Math.min(rate * 100, 100))}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="col-lg-5">
        <div className="card h-100">
          <div className="card-header py-2 fw-semibold">風險學生</div>
          <div className="card-body small">
            {riskItems.length === 0 ? <div className="text-muted">目前無高風險學生清單。</div> : (
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle">
                  <thead><tr><th>學號</th><th>分數</th><th>原因</th><th>操作</th></tr></thead>
                  <tbody>
                    {riskItems.map((row) => (
                      <tr key={row.studentId}>
                        <td className="font-monospace">{row.studentId}</td>
                        <td>{row.riskScore ?? EMPTY}</td>
                        <td>{(row.reasons || []).map((r) => r.message || r).join('；') || EMPTY}</td>
                        <td>
                          <Link className="btn btn-sm btn-outline-primary" to={`/admin/learning-journey/students/${encodeURIComponent(row.studentId)}`}>
                            查看
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card-header py-2 fw-semibold">各系所統計</div>
          <div className="card-body p-0">
            {!Array.isArray(departmentStats?.items) || departmentStats.items.length === 0 ? (
              <div className="p-3 text-muted small">尚無系所統計資料。</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm table-striped mb-0 align-middle">
                  <thead className="table-light">
                    <tr><th>系所</th><th>本國生總數</th><th>有成績</th><th>建檔率</th><th>大一</th><th>大二</th><th>大三</th><th>大四</th></tr>
                  </thead>
                  <tbody>
                    {departmentStats.items.map((row) => (
                      <tr key={row.department || 'unknown'}>
                        <td>{row.department || EMPTY}</td>
                        <td>{row.total ?? 0}</td>
                        <td>{row.recorded ?? 0}</td>
                        <td>{fmtRate(row.recordRate)}</td>
                        {['1', '2', '3', '4'].map((grade) => {
                          const total = row.grades?.[grade]?.total || 0;
                          const recorded = row.grades?.[grade]?.recorded || 0;
                          return <td key={grade}>{total > 0 ? `${recorded}/${total}` : EMPTY}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12">
        <div className="card">
          <div className="card-header py-2 fw-semibold">完整 CEFR 分布</div>
          <div className="card-body">
            {!Array.isArray(cefrDistribution?.grades) || cefrDistribution.grades.length === 0 ? (
              <div className="text-muted small">尚無 CEFR 分布資料。</div>
            ) : (
              cefrDistribution.grades.map((gradeRow) => (
                <div key={gradeRow.grade} className="mb-3">
                  <div className="fw-semibold mb-2">年級 {gradeRow.grade}</div>
                  {SKILL_KEYS.map((skill) => (
                    <div key={skill} className="d-flex gap-2 align-items-center mb-2">
                      <div className="small" style={{ width: 72 }}>{SKILL_LABELS[skill]}</div>
                      <div className="flex-grow-1">{renderCefrBar(gradeRow.skills?.[skill] || {}, Number(gradeRow.total || 0))}</div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card h-100">
          <div className="card-header py-2 fw-semibold">資料品質摘要</div>
          <div className="card-body">
            {!quality ? (
              <div className="text-muted small">尚無資料品質摘要。</div>
            ) : (
              <div className="row g-2">
                <div className="col-6"><div className="text-muted small">名冊人數</div><div className="h5">{quality.kpis?.rosterStudentCount ?? 0}</div></div>
                <div className="col-6"><div className="text-muted small">無成績學生</div><div className="h5">{quality.kpis?.noScoreStudentCount ?? 0}</div></div>
                <div className="col-6"><div className="text-muted small">成績覆蓋率</div><div className="h5">{fmtRate(quality.rates?.scoreCoverageRate)}</div></div>
                <div className="col-6"><div className="text-muted small">名冊完整率</div><div className="h5">{fmtRate(quality.rates?.rosterCompletenessRate)}</div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-lg-6">
        <div className="card h-100">
          <div className="card-header py-2 fw-semibold">歷史快照摘要</div>
          <div className="card-body small">
            {!Array.isArray(historyRecords) || historyRecords.length === 0 ? (
              <div className="text-muted">尚無歷史快照。載入學期總覽後會保留最近指標快照於本機瀏覽器。</div>
            ) : (
              <div className="table-responsive">
                <table className="table table-sm mb-0 align-middle">
                  <thead className="table-light"><tr><th>時間</th><th>學期</th><th>名冊</th><th>達標率</th></tr></thead>
                  <tbody>
                    {historyRecords.slice(0, 5).map((record) => (
                      <tr key={record.id}>
                        <td>{formatDate(record.createdAt)}</td>
                        <td>{record.semesterId}</td>
                        <td>{record.summary?.rosterActiveStudentCount ?? record.summary?.rosterActiveCount ?? 0}</td>
                        <td>{fmtRate(record.summary?.attainmentRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentsTab({ state, filters, onFilterChange, onQuery, onPage }) {
  const navigate = useNavigate();
  const { loading, error, requestId, rows, pagination, semesterId, dataSource } = state;
  const pageSize = Number(pagination.limit || filters.limit || 50);
  const pageOffset = Number(pagination.offset || filters.offset || 0);

  return (
    <div>
      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-md-3">
              <label className="form-label small">關鍵字</label>
              <input className="form-control" value={filters.keyword} onChange={(e) => onFilterChange({ keyword: e.target.value })} placeholder="學號、姓名或系所" />
            </div>
            <div className="col-md-2">
              <label className="form-label small">年級</label>
              <input className="form-control" value={filters.grade} onChange={(e) => onFilterChange({ grade: e.target.value })} />
            </div>
            <div className="col-md-3">
              <label className="form-label small">系所</label>
              <input className="form-control" value={filters.department} onChange={(e) => onFilterChange({ department: e.target.value })} />
            </div>
            <div className="col-md-2">
              <label className="form-label small">達標</label>
              <select className="form-select" value={filters.attained} onChange={(e) => onFilterChange({ attained: e.target.value })}>
                <option value="">全部</option>
                <option value="true">是</option>
                <option value="false">否</option>
              </select>
            </div>
            <div className="col-md-2">
              <button type="button" className="btn btn-primary w-100" disabled={loading || !semesterId} onClick={() => onQuery({ offset: 0 })}>
                查詢學生名單
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? <LoadingState>正在載入學生名單...</LoadingState> : null}
      {error ? <ErrorState message={error} requestId={requestId} /> : null}
      {!loading && !error && rows.length === 0 ? <EmptyState>此區塊尚未串接完整資料，請先使用學生查詢或學期總覽。</EmptyState> : null}

      {!loading && rows.length > 0 ? (
        <>
          {dataSource ? (
            <div className="mb-2">
              <span className="badge bg-info text-dark">
                資料來源狀態：{String(dataSource).includes('learning_journey') ? '學習歷程資料' : '英檢資料'}
              </span>
            </div>
          ) : null}
          <div className="table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead className="table-light">
                <tr>
                  <th>學號</th><th>姓名</th><th>年級</th><th>系所</th>
                  <th>聽力</th><th>閱讀</th><th>口說</th><th>寫作</th><th>達標</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.studentId}
                    onClick={() => navigate(`/admin/learning-journey/students/${encodeURIComponent(row.studentId)}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="font-monospace">{row.studentId}</td>
                    <td>{row.studentName || EMPTY}</td>
                    <td>{row.grade || EMPTY}</td>
                    <td>{row.department || EMPTY}</td>
                    <td>{row.bestListeningCefr || EMPTY}</td>
                    <td>{row.bestReadingCefr || EMPTY}</td>
                    <td>{row.bestSpeakingCefr || EMPTY}</td>
                    <td>{row.bestWritingCefr || EMPTY}</td>
                    <td>{row.attained ? '是' : '否'}</td>
                    <td>
                      <Link
                        className="btn btn-sm btn-outline-primary"
                        to={`/admin/learning-journey/students/${encodeURIComponent(row.studentId)}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        查看
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-3">
            <div className="small text-muted">
              每頁 {pageSize} 筆；目前回傳 {pagination.returned || rows.length} 筆
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={loading || pageOffset <= 0} onClick={() => onPage(Math.max(0, pageOffset - pageSize))}>
                上一頁
              </button>
              <button type="button" className="btn btn-sm btn-outline-secondary" disabled={loading || Number(pagination.returned || 0) < pageSize} onClick={() => onPage(pageOffset + pageSize)}>
                下一頁
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function DiagnosticsPanel({
  canViewDiagnostics,
  diagnostics,
  importHistories,
  quality,
  rebuilding,
  rebuildResult,
  rebuildError,
  onRebuild,
  onLoadStatus,
  onLoadReadiness,
  onLoadSummaryCompare,
  onLoadStudentsCompare,
}) {
  if (!canViewDiagnostics) return null;

  return (
    <details className="card mt-3">
      <summary className="card-header py-2 fw-semibold" style={{ cursor: 'pointer' }}>
        系統診斷與資料來源檢查（進階）
      </summary>
      <div className="card-body small">
        {/* TODO: 若後續新增 developer role，將此區塊改為 developer-only。 */}
        <p className="text-muted">
          此區提供資料來源狀態、資料切換檢查與資料一致性比對；預設收合，僅供高權限維運使用。
        </p>
        <div className="alert alert-light border py-2">
          匯入作業請使用既有匯入頁：
          <Link className="ms-1" to="/admin/english-test/import">前往 BESTEP 資料匯入</Link>
        </div>
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-warning btn-sm" disabled={rebuilding} onClick={onRebuild}>
            {rebuilding ? '重新計算中...' : '重新計算最佳成績'}
          </button>
        </div>
        {rebuildError ? <ErrorState message={rebuildError} /> : null}
        {rebuildResult ? (
          <div className="alert alert-success py-2">
            重新計算完成
            {rebuildResult.studentsProcessed != null ? `，已處理 ${rebuildResult.studentsProcessed} 人` : ''}
            {rebuildResult.recomputed != null ? `，更新 ${rebuildResult.recomputed} 筆最佳成績` : ''}。
          </div>
        ) : null}

        <div className="row g-3 mb-3">
          <div className="col-lg-6">
            <div className="border rounded p-2 h-100">
              <div className="fw-semibold mb-2">匯入歷程</div>
              {!Array.isArray(importHistories) || importHistories.length === 0 ? (
                <div className="text-muted">尚無匯入歷程資料。</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm mb-0 align-middle">
                    <thead className="table-light"><tr><th>時間</th><th>名稱</th><th>匯入</th><th>新增達標</th></tr></thead>
                    <tbody>
                      {importHistories.slice(0, 10).map((row) => {
                        const newB2 = row.newB2BySkill || {};
                        return (
                          <tr key={row.id || row.importBatchId || row.importedAt}>
                            <td>{formatDate(row.importedAt)}</td>
                            <td>{row.importName || EMPTY}</td>
                            <td>{row.importedCount ?? 0}</td>
                            <td>{`${newB2.listening || 0}/${newB2.reading || 0}/${newB2.speaking || 0}/${newB2.writing || 0}`}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="col-lg-6">
            <div className="border rounded p-2 h-100">
              <div className="fw-semibold mb-2">資料品質</div>
              {!quality ? (
                <div className="text-muted">尚無資料品質資料，請先查看學期總覽。</div>
              ) : (
                <div className="row g-2">
                  <div className="col-6"><span className="text-muted">無成績學生</span><div className="fw-semibold">{quality.kpis?.noScoreStudentCount ?? 0}</div></div>
                  <div className="col-6"><span className="text-muted">孤兒 BestSkill</span><div className="fw-semibold">{quality.kpis?.orphanBestSkillCount ?? 0}</div></div>
                  <div className="col-6"><span className="text-muted">成績覆蓋率</span><div className="fw-semibold">{fmtRate(quality.rates?.scoreCoverageRate)}</div></div>
                  <div className="col-6"><span className="text-muted">名冊完整率</span><div className="fw-semibold">{fmtRate(quality.rates?.rosterCompletenessRate)}</div></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={diagnostics.status.loading} onClick={onLoadStatus}>
            讀取資料來源狀態
          </button>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={diagnostics.readiness.loading} onClick={onLoadReadiness}>
            執行資料切換檢查
          </button>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={diagnostics.summaryCompare.loading} onClick={onLoadSummaryCompare}>
            執行學期摘要一致性比對
          </button>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={diagnostics.studentsCompare.loading} onClick={onLoadStudentsCompare}>
            執行學生名單一致性比對
          </button>
        </div>

        {['status', 'readiness', 'summaryCompare', 'studentsCompare'].map((key) => {
          const item = diagnostics[key];
          return (
            <div className="border rounded p-2 mb-2" key={key}>
              <div className="fw-semibold mb-1">
                {{
                  status: '資料來源狀態',
                  readiness: '資料切換檢查',
                  summaryCompare: '學期摘要一致性比對',
                  studentsCompare: '學生名單一致性比對',
                }[key]}
              </div>
              {item.loading ? <div className="text-muted">檢查中...</div> : null}
              {item.error ? <ErrorState message={item.error} requestId={item.requestId} /> : null}
              {item.data ? (
                <pre className="bg-light rounded p-2 mb-0 text-break" style={{ maxHeight: 240, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(item.data, null, 2)}
                </pre>
              ) : !item.loading && !item.error ? (
                <div className="text-muted">尚未執行檢查。</div>
              ) : null}
            </div>
          );
        })}
      </div>
    </details>
  );
}

export default function LearningJourneyHubPage() {
  const token = localStorage.getItem('token') || '';
  const role = (localStorage.getItem('userRole') || '').toLowerCase();
  const tokenPayload = parseJwtPayload(token) || {};
  const teacherLevel = String(tokenPayload.teacherLevel || '').toLowerCase();
  const canViewDiagnostics = role === 'admin' || teacherLevel === 'executive' || teacherLevel === 'et_manager';
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TAB_IDS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'student';

  const [activeTab, setActiveTab] = useState(initialTab);
  const [studentInput, setStudentInput] = useState(searchParams.get('studentId') || '');
  const [semesterInput, setSemesterInput] = useState(searchParams.get('semesterId') || '114-1');
  const [semesters, setSemesters] = useState([]);
  const [profileState, setProfileState] = useState({ status: 'idle', data: null, error: '', requestId: '' });
  const [overviewState, setOverviewState] = useState({
    status: 'idle',
    dashboard: null,
    summary: null,
    departmentStats: null,
    cefrDistribution: null,
    quality: null,
    importHistories: [],
    risk: null,
    error: '',
    requestId: '',
  });
  const [historyRecords, setHistoryRecords] = useState([]);
  const [studentFilters, setStudentFilters] = useState({ keyword: '', grade: '', department: '', attained: '', limit: 50, offset: 0 });
  const [studentsState, setStudentsState] = useState({ loading: false, error: '', requestId: '', rows: [], pagination: {}, semesterId: semesterInput, dataSource: '' });
  const [rebuilding, setRebuilding] = useState(false);
  const [rebuildResult, setRebuildResult] = useState(null);
  const [rebuildError, setRebuildError] = useState('');
  const [diagnostics, setDiagnostics] = useState({
    status: { loading: false, data: null, error: '', requestId: '' },
    readiness: { loading: false, data: null, error: '', requestId: '' },
    summaryCompare: { loading: false, data: null, error: '', requestId: '' },
    studentsCompare: { loading: false, data: null, error: '', requestId: '' },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getSemesters(token);
        if (!mounted) return;
        setSemesters(Array.isArray(list) ? list : []);
        setSemesterInput((prev) => prev || pickDefaultSemesterId(list));
      } catch (_) {
        // 學期清單失敗時仍保留手動輸入。
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      setHistoryRecords(Array.isArray(parsed) ? parsed : []);
    } catch (_) {
      setHistoryRecords([]);
    }
  }, []);

  const syncQuery = useCallback((tab, extra = {}) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (semesterInput) next.set('semesterId', semesterInput);
    if (studentInput.trim()) next.set('studentId', studentInput.trim());
    Object.entries(extra).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next, { replace: true });
  }, [searchParams, semesterInput, studentInput, setSearchParams]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    syncQuery(tab);
  };

  const loadProfile = useCallback(async () => {
    const sid = studentInput.trim();
    if (!sid) {
      setProfileState({ status: 'error', data: null, error: '請先輸入學生學號。', requestId: '' });
      return;
    }
    setActiveTab('student');
    syncQuery('student');
    setProfileState({ status: 'loading', data: null, error: '', requestId: '' });
    try {
      const data = await getLearningJourneyProfile(token, sid);
      const dataQuality = Array.isArray(data?.dataQuality) ? data.dataQuality : [];
      const noStudent = dataQuality.some((q) => q?.code === 'NO_STUDENT_AGGREGATE');
      setProfileState({ status: noStudent ? 'empty' : 'success', data, error: '', requestId: '' });
    } catch (error) {
      setProfileState({ status: 'error', data: null, error: getReadableError(error, '學生學習歷程取得失敗。'), requestId: error.requestId || '' });
    }
  }, [studentInput, syncQuery, token]);

  const loadOverview = useCallback(async () => {
    const semesterId = semesterInput.trim();
    if (!semesterId) {
      setOverviewState({ status: 'error', dashboard: null, risk: null, error: '請先選擇或輸入學期。', requestId: '' });
      return;
    }
    setActiveTab('overview');
    syncQuery('overview');
    setOverviewState((prev) => ({ ...prev, status: 'loading', error: '', requestId: '' }));
    try {
      const [dashboard, summary, departmentStats, cefrDistribution, quality, importHistoryData, risk, freshness] = await Promise.all([
        getLearningJourneySemesterDashboard(token, semesterId).catch(() => null),
        getSemesterSummary(token, semesterId).catch(() => null),
        getSemesterDepartmentStats(token, semesterId).catch(() => null),
        getSemesterCefrDistribution(token, semesterId).catch(() => null),
        getSemesterDataQuality(token, semesterId).catch(() => null),
        getSemesterImportHistories(token, semesterId, { limit: 200 }).catch(() => null),
        getLearningJourneyRiskStudents(token, semesterId).catch(() => null),
        getLearningJourneyDataFreshness(token, semesterId).catch(() => null),
      ]);
      if (!dashboard && !summary && !departmentStats && !cefrDistribution && !quality && !risk) {
        setOverviewState((prev) => ({
          ...prev,
          status: 'error',
          error: '目前無法取得此學期總覽資料，請稍後再試或確認學期代碼。',
          requestId: '',
        }));
        return;
      }

      const importHistories = Array.isArray(importHistoryData?.items) ? importHistoryData.items : [];
      const snapshotSummary = summary || dashboard?.semesters?.[0] || null;
      if (snapshotSummary) {
        try {
          const fingerprint = [
            semesterId,
            snapshotSummary.rosterActiveStudentCount ?? snapshotSummary.rosterActiveCount,
            snapshotSummary.validBestScoreStudentCount,
            snapshotSummary.attainedStudentCount,
            snapshotSummary.attainmentRate,
          ].join('|');
          const existing = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
          const arr = Array.isArray(existing) ? existing : [];
          const next = arr[0]?.fingerprint === fingerprint
            ? arr
            : [{ id: `auto-${Date.now()}`, fingerprint, createdAt: new Date().toISOString(), semesterId, summary: snapshotSummary }, ...arr].slice(0, 50);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
          setHistoryRecords(next);
        } catch (_) {
          // 本機快照失敗不影響總覽查詢。
        }
      }

      setOverviewState({
        status: 'success',
        dashboard: dashboard ? { ...dashboard, freshness } : null,
        summary,
        departmentStats,
        cefrDistribution,
        quality,
        importHistories,
        risk,
        error: '',
        requestId: '',
      });
    } catch (error) {
      setOverviewState((prev) => ({ ...prev, status: 'error', error: getReadableError(error, '學期總覽取得失敗。'), requestId: error.requestId || '' }));
    }
  }, [semesterInput, syncQuery, token]);

  const loadStudents = useCallback(async (patch = {}) => {
    const semesterId = semesterInput.trim();
    if (!semesterId) {
      setStudentsState((prev) => ({ ...prev, error: '請先選擇或輸入學期。', requestId: '' }));
      return;
    }
    const filters = { ...studentFilters, ...patch };
    setActiveTab('students');
    syncQuery('students');
    setStudentsState((prev) => ({ ...prev, loading: true, error: '', requestId: '', semesterId }));
    try {
      const data = await getSemesterStudents(token, semesterId, filters);
      setStudentsState({
        loading: false,
        error: '',
        requestId: '',
        rows: Array.isArray(data?.items) ? data.items : [],
        pagination: data?.pagination || { limit: filters.limit, offset: filters.offset, returned: Array.isArray(data?.items) ? data.items.length : 0 },
        semesterId,
        dataSource: String(data?.source || ''),
      });
      setStudentFilters(filters);
    } catch (error) {
      setStudentsState({ loading: false, error: getReadableError(error, '學生名單取得失敗。'), requestId: error.requestId || '', rows: [], pagination: {}, semesterId, dataSource: '' });
    }
  }, [semesterInput, studentFilters, syncQuery, token]);

  const setDiagnosticState = (key, patch) => {
    setDiagnostics((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const loadDiagnostic = async (key, loader) => {
    setDiagnosticState(key, { loading: true, error: '', requestId: '' });
    try {
      const data = await loader();
      setDiagnosticState(key, { loading: false, data, error: '', requestId: '' });
    } catch (error) {
      setDiagnosticState(key, { loading: false, data: null, error: getReadableError(error, '檢查失敗。'), requestId: error.requestId || '' });
    }
  };

  const handleRebuildBestSkills = async () => {
    const semesterId = semesterInput.trim();
    if (!semesterId) {
      setRebuildError('請先選擇或輸入學期。');
      return;
    }
    const ok = window.confirm('將重新計算此學期所有學生的最佳成績快取，是否繼續？');
    if (!ok) return;
    setRebuilding(true);
    setRebuildError('');
    setRebuildResult(null);
    try {
      const result = await rebuildSemesterBestSkills(token, semesterId);
      setRebuildResult(result);
      await loadOverview();
    } catch (error) {
      setRebuildError(getReadableError(error, '重新計算最佳成績失敗。'));
    } finally {
      setRebuilding(false);
    }
  };

  const tabItems = useMemo(() => [
    { id: 'student', label: '學生查詢' },
    { id: 'overview', label: '學期總覽' },
    { id: 'students', label: '學生名單' },
    ...(canViewDiagnostics ? [{ id: 'diagnostics', label: '資料來源與診斷' }] : []),
  ], [canViewDiagnostics]);

  return (
    <div className="container-fluid py-3">
      <div className="mb-3">
        <h4 className="mb-1">英語學習歷程中心</h4>
        <p className="text-muted mb-0">
          整合 BESTEP、培力英檢、CEFR 與活動參與資料，查詢學生學習歷程與學期整體狀態。
        </p>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2 align-items-end">
            <div className="col-lg-4 col-md-6">
              <label className="form-label small mb-1">學號</label>
              <input
                className="form-control"
                value={studentInput}
                onChange={(e) => setStudentInput(e.target.value)}
                placeholder="例如：D11400001"
              />
            </div>
            <div className="col-lg-3 col-md-6">
              <label className="form-label small mb-1">學期</label>
              {semesters.length > 0 ? (
                <select className="form-select" value={semesterInput} onChange={(e) => setSemesterInput(e.target.value)}>
                  {semesters.map((semester) => (
                    <option key={semester.id || semester.code} value={semester.id || semester.code}>
                      {semester.name || semester.code || semester.id}
                    </option>
                  ))}
                </select>
              ) : (
                <input className="form-control" value={semesterInput} onChange={(e) => setSemesterInput(e.target.value)} placeholder="114-1" />
              )}
            </div>
            <div className="col-lg-3 col-md-6">
              <button type="button" className="btn btn-primary w-100" disabled={profileState.status === 'loading'} onClick={loadProfile}>
                查詢學生學習歷程
              </button>
            </div>
            <div className="col-lg-2 col-md-6">
              <button type="button" className="btn btn-outline-secondary w-100" disabled={overviewState.status === 'loading'} onClick={loadOverview}>
                查看學期總覽
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="fw-semibold mb-2">使用方式：</div>
          <ol className="mb-0">
            <li>輸入學生學號並選擇學期</li>
            <li>點擊「查詢學生學習歷程」</li>
            <li>查看該學生的 CEFR、BESTEP、活動參與與風險狀態</li>
          </ol>
        </div>
      </div>

      <ul className="nav nav-tabs mb-3">
        {tabItems.map((tab) => (
          <li className="nav-item" key={tab.id}>
            <button type="button" className={`nav-link ${activeTab === tab.id ? 'active' : ''}`} onClick={() => selectTab(tab.id)}>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {activeTab === 'student' ? (
        <>
          {profileState.status === 'idle' ? <EmptyState>尚未查詢資料，請輸入學號與學期後開始查詢。</EmptyState> : null}
          {profileState.status === 'loading' ? <LoadingState /> : null}
          {profileState.status === 'empty' ? <EmptyState>查無此學生於該學期的學習歷程資料。</EmptyState> : null}
          {profileState.status === 'error' ? <ErrorState message={profileState.error} requestId={profileState.requestId} /> : null}
          {profileState.status === 'success' ? <ProfileSummary profile={profileState.data} studentInput={studentInput} semesterInput={semesterInput} /> : null}
        </>
      ) : null}

      {activeTab === 'overview' ? (
        <>
          {overviewState.status === 'idle' ? <EmptyState>尚未取得學期總覽，請選擇學期後點擊「查看學期總覽」。</EmptyState> : null}
          {overviewState.status === 'loading' ? <LoadingState>正在載入學期總覽資料...</LoadingState> : null}
          {overviewState.status === 'error' ? <ErrorState message={overviewState.error} requestId={overviewState.requestId} /> : null}
          {overviewState.status === 'success' ? (
            <SemesterOverview
              dashboard={overviewState.dashboard}
              summary={overviewState.summary}
              departmentStats={overviewState.departmentStats}
              cefrDistribution={overviewState.cefrDistribution}
              quality={overviewState.quality}
              riskData={overviewState.risk}
              historyRecords={historyRecords}
            />
          ) : null}
        </>
      ) : null}

      {activeTab === 'students' ? (
        <StudentsTab
          state={studentsState}
          filters={studentFilters}
          onFilterChange={(patch) => setStudentFilters((prev) => ({ ...prev, ...patch }))}
          onQuery={(patch) => loadStudents(patch)}
          onPage={(offset) => loadStudents({ offset })}
        />
      ) : null}

      {activeTab === 'diagnostics' && canViewDiagnostics ? (
        <DiagnosticsPanel
          canViewDiagnostics={canViewDiagnostics}
          diagnostics={diagnostics}
          importHistories={overviewState.importHistories}
          quality={overviewState.quality}
          rebuilding={rebuilding}
          rebuildResult={rebuildResult}
          rebuildError={rebuildError}
          onRebuild={handleRebuildBestSkills}
          onLoadStatus={() => loadDiagnostic('status', () => getLearningJourneyReadModelStatus(token))}
          onLoadReadiness={() => loadDiagnostic('readiness', () => getLearningJourneyReadiness(token, semesterInput.trim()))}
          onLoadSummaryCompare={() => loadDiagnostic('summaryCompare', () => getLearningJourneyEnglishTestSummaryCompare(token, semesterInput.trim()))}
          onLoadStudentsCompare={() => loadDiagnostic('studentsCompare', () => getLearningJourneyEnglishTestStudentsCompare(token, semesterInput.trim()))}
        />
      ) : null}

      {activeTab !== 'diagnostics' ? (
        <DiagnosticsPanel
          canViewDiagnostics={canViewDiagnostics}
          diagnostics={diagnostics}
          importHistories={overviewState.importHistories}
          quality={overviewState.quality}
          rebuilding={rebuilding}
          rebuildResult={rebuildResult}
          rebuildError={rebuildError}
          onRebuild={handleRebuildBestSkills}
          onLoadStatus={() => loadDiagnostic('status', () => getLearningJourneyReadModelStatus(token))}
          onLoadReadiness={() => loadDiagnostic('readiness', () => getLearningJourneyReadiness(token, semesterInput.trim()))}
          onLoadSummaryCompare={() => loadDiagnostic('summaryCompare', () => getLearningJourneyEnglishTestSummaryCompare(token, semesterInput.trim()))}
          onLoadStudentsCompare={() => loadDiagnostic('studentsCompare', () => getLearningJourneyEnglishTestStudentsCompare(token, semesterInput.trim()))}
        />
      ) : null}
    </div>
  );
}
