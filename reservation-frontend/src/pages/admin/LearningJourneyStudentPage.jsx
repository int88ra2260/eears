import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getLearningJourneyProfile,
  getLearningJourneyStudentConsistency,
  getLearningJourneyStudentReport,
  getLearningJourneyStudentReportHtml,
} from '../../services/learningJourneyApi';

const EMPTY = '—';

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

function skillText(skillScore) {
  if (!skillScore) return EMPTY;
  return `${text(skillScore.rawScore ?? skillScore.score)} / ${text(skillScore.cefr || skillScore.cefrLevel)}`;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildRiskHints(profile) {
  const flags = profile?.student?.aggregateFlags || {};
  const dataQuality = Array.isArray(profile?.dataQuality) ? profile.dataQuality : [];
  const hints = [];

  if (!flags.hasExamRegistrations) hints.push({ level: 'warning', message: '尚無 BESTEP / 培力英檢報名紀錄。' });
  if (!flags.hasEtExamAttempts && !flags.hasBestepScores) hints.push({ level: 'warning', message: '尚無 BESTEP 或其他英檢成績紀錄。' });
  if (!flags.hasReservations && !flags.hasActivityParticipations && !flags.hasBestepAttendance) hints.push({ level: 'info', message: '尚無活動參與或 BESTEP 出席紀錄。' });
  if (!flags.hasCourseEnrollments) hints.push({ level: 'info', message: '尚無修課紀錄。' });

  for (const q of dataQuality) {
    if (q?.severity === 'error') hints.push({ level: 'danger', message: q.message || q.code });
    if (q?.severity === 'warning') hints.push({ level: 'warning', message: q.message || q.code });
  }

  return hints;
}

function Section({ title, children, actions = null }) {
  return (
    <div className="card h-100">
      <div className="card-header py-2 d-flex justify-content-between align-items-center">
        <span className="fw-semibold">{title}</span>
        {actions}
      </div>
      <div className="card-body small">{children}</div>
    </div>
  );
}

function EmptyState({ children = '尚無資料。' }) {
  return <div className="text-muted">{children}</div>;
}

export default function LearningJourneyStudentPage() {
  const { studentId } = useParams();
  const token = localStorage.getItem('token') || '';
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState('');
  const [consistency, setConsistency] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!studentId) return;
      setLoading(true);
      setError('');
      setRequestId('');
      try {
        const [data, consistencyData] = await Promise.all([
          getLearningJourneyProfile(token, studentId),
          getLearningJourneyStudentConsistency(token, studentId).catch(() => null),
        ]);
        if (!cancelled) {
          setProfile(data);
          setConsistency(consistencyData);
        }
      } catch (e) {
        if (!cancelled) {
          setProfile(null);
          setError(e.message || '載入學生學習歷程失敗');
          setRequestId(e.requestId || '');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [studentId, token]);

  const student = profile?.student || {};
  const flags = student.aggregateFlags || {};
  const registrations = Array.isArray(profile?.examRegistrations) ? profile.examRegistrations : [];
  const attempts = Array.isArray(profile?.examAttempts) ? profile.examAttempts : [];
  const ljsAttempts = Array.isArray(student?.ljsExamAttempts) ? student.ljsExamAttempts : [];
  const activities = Array.isArray(profile?.activities) ? profile.activities : [];
  const courses = Array.isArray(profile?.courses) ? profile.courses : [];
  const timeline = Array.isArray(profile?.timeline) ? profile.timeline : [];
  const dataQuality = Array.isArray(profile?.dataQuality) ? profile.dataQuality : [];
  const bestSkillsBySemester = profile?.bestSkills || {};
  const bestSkillRows = Object.values(bestSkillsBySemester).flatMap((rows) => (Array.isArray(rows) ? rows : []));
  const riskHints = useMemo(() => buildRiskHints(profile), [profile]);
  const bestepEvents = timeline.filter((ev) => ['bestep_exam_scores', 'bestep_attendance'].includes(ev.source));
  const otherExamAttempts = [
    ...attempts.map((row) => ({ source: 'et_exam_attempts', ...row })),
    ...ljsAttempts
      .filter((row) => row && row.sourceType !== 'BESTEP')
      .map((row) => ({ source: 'exam_attempts', ...row })),
  ];

  const exportReport = async () => {
    if (!profile) return;
    setReportLoading(true);
    try {
      const report = await getLearningJourneyStudentReport(token, student.studentId || studentId);
      downloadJson(`learning-journey-${student.studentId || studentId}.json`, report);
    } catch (_) {
      downloadJson(`learning-journey-${student.studentId || studentId}.json`, {
        generatedAt: new Date().toISOString(),
        student: { studentId: student.studentId || studentId },
        sections: { activities, bestep: { registrations, events: bestepEvents }, externalExams: otherExamAttempts, courses, timeline, dataQuality },
        consistency,
        sourceProfile: profile,
      });
    } finally {
      setReportLoading(false);
    }
  };

  const openHtmlReport = async () => {
    if (!profile) return;
    setReportLoading(true);
    try {
      const html = await getLearningJourneyStudentReportHtml(token, student.studentId || studentId);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      setError(e.message || '後端 HTML 報告產生失敗');
      setRequestId(e.requestId || '');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div className="container-fluid py-3">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h4 className="mb-1">學生學習歷程</h4>
          <div className="text-muted small">正式頁面：活動、BESTEP、其他英檢、修課、timeline、風險與資料品質。</div>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Link className="btn btn-outline-secondary btn-sm" to="/admin/learning-journey">
            返回學習歷程中心
          </Link>
          <button type="button" className="btn btn-outline-primary btn-sm" disabled={!profile || reportLoading} onClick={openHtmlReport}>
            後端 HTML 報告
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" disabled={!profile} onClick={() => window.print()}>
            列印本頁 / 另存 PDF
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={!profile || reportLoading} onClick={exportReport}>
            下載 JSON 報告
          </button>
        </div>
      </div>

      {loading ? <div className="alert alert-info py-2">載入中…</div> : null}
      {error ? (
        <div className="alert alert-danger py-2">
          {error}
          {requestId ? <div className="small mt-1">Request-ID：{requestId}</div> : null}
        </div>
      ) : null}
      {!loading && !error && !profile ? <div className="alert alert-secondary py-2">尚無資料。</div> : null}

      {profile ? (
        <div className="row g-3">
          <div className="col-12">
            <Section title="基本資料">
              <div className="row g-2">
                <div className="col-md-3"><div className="text-muted">學號</div><div className="fw-semibold">{text(student.studentId || studentId)}</div></div>
                <div className="col-md-3"><div className="text-muted">姓名</div><div>{text(student.etStudentMaster?.name || student.etStudentMaster?.studentName)}</div></div>
                <div className="col-md-3"><div className="text-muted">LJS Student PK</div><div>{text(student.ljsStudentPk)}</div></div>
                <div className="col-md-3"><div className="text-muted">資料來源狀態</div><div>{flags.hasLjsStudent ? '已建立 LJS 主檔' : '尚無 LJS 主檔'}</div></div>
              </div>
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="風險提示">
              {riskHints.length === 0 ? <div className="alert alert-success py-2 mb-0">目前未偵測到明顯風險提示。</div> : (
                <div className="d-flex flex-column gap-2">
                  {riskHints.map((hint, idx) => (
                    <div key={`${hint.level}-${idx}`} className={`alert alert-${hint.level} py-2 mb-0`}>
                      {hint.message}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="跨來源一致性檢查">
              {!consistency ? <EmptyState>尚無一致性檢查結果。</EmptyState> : (
                <>
                  <div className={`alert py-2 ${consistency.status === 'ok' ? 'alert-success' : 'alert-warning'}`}>
                    整體狀態：{text(consistency.status)}
                  </div>
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0 align-middle">
                      <thead className="table-light">
                        <tr><th>區塊</th><th>狀態</th><th>資料筆數</th><th>Timeline</th></tr>
                      </thead>
                      <tbody>
                        {(consistency.sections || []).map((section) => (
                          <tr key={section.key}>
                            <td>{section.label}</td>
                            <td>{section.status}</td>
                            <td>{section.recordCount}</td>
                            <td>{section.timelineCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {Array.isArray(consistency.warnings) && consistency.warnings.length > 0 ? (
                    <ul className="mt-2 mb-0 ps-3 text-warning">
                      {consistency.warnings.map((w, idx) => <li key={idx}>{w}</li>)}
                    </ul>
                  ) : null}
                </>
              )}
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="達標與彙整狀態">
              <div className="row g-2">
                <div className="col-6"><div className="text-muted">BESTEP/英檢報名</div><div>{flags.hasExamRegistrations ? '有' : '無'}</div></div>
                <div className="col-6"><div className="text-muted">BESTEP 成績</div><div>{flags.hasBestepScores ? '有' : '無'}</div></div>
                <div className="col-6"><div className="text-muted">活動參與</div><div>{flags.hasReservations || flags.hasActivityParticipations ? '有' : '無'}</div></div>
                <div className="col-6"><div className="text-muted">修課紀錄</div><div>{flags.hasCourseEnrollments ? `${flags.courseEnrollmentCount || courses.length} 筆` : '無'}</div></div>
              </div>
            </Section>
          </div>

          <div className="col-12">
            <Section title="Best Skills">
              {bestSkillRows.length === 0 ? <EmptyState>尚無四技最佳成績彙整。</EmptyState> : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr><th>學期</th><th>聽力</th><th>閱讀</th><th>口說</th><th>寫作</th></tr>
                    </thead>
                    <tbody>
                      {bestSkillRows.map((row, idx) => (
                        <tr key={row.id || `${row.semesterId}-${idx}`}>
                          <td>{text(row.semesterId)}</td>
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
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="活動參與">
              {activities.length === 0 ? <EmptyState /> : (
                <ul className="ps-3 mb-0">
                  {activities.slice(0, 12).map((row, idx) => (
                    <li key={idx}>
                      {row.kind === 'reservation'
                        ? `預約：${row.event?.eventType || row.event?.name || EMPTY} - ${row.reservation?.checkinStatus || EMPTY}`
                        : `LJS：${row.participation?.activityType || EMPTY} - ${row.participation?.attendanceStatus || EMPTY}`}
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="BESTEP 報名與成績">
              {registrations.length === 0 && bestepEvents.length === 0 ? <EmptyState /> : (
                <>
                  <div className="fw-semibold mb-1">報名</div>
                  {registrations.length === 0 ? <EmptyState>尚無報名資料。</EmptyState> : (
                    <ul className="ps-3">
                      {registrations.slice(0, 8).map((reg) => (
                        <li key={reg.id}>{text(reg.semester)}：{text(reg.examType)} - {text(reg.status)}</li>
                      ))}
                    </ul>
                  )}
                  <div className="fw-semibold mb-1">BESTEP 成績 / 出席</div>
                  {bestepEvents.length === 0 ? <EmptyState>尚無 BESTEP 成績或出席事件。</EmptyState> : (
                    <ul className="ps-3 mb-0">
                      {bestepEvents.slice(0, 8).map((ev) => (
                        <li key={ev.id}>{formatDate(ev.date)}：{text(ev.title)} - {text(ev.status)}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="其他英檢">
              {otherExamAttempts.length === 0 ? <EmptyState /> : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr><th>日期</th><th>類型/來源</th><th>聽力 raw / CEFR</th><th>閱讀 raw / CEFR</th><th>口說 raw / CEFR</th><th>寫作 raw / CEFR</th><th>狀態</th></tr>
                    </thead>
                    <tbody>
                      {otherExamAttempts.slice(0, 20).map((attempt, idx) => {
                        const scores = buildSkillMap(attempt.skillScores || attempt.scores || []);
                        return (
                          <tr key={attempt.id || idx}>
                            <td>{text(attempt.testDate || attempt.examDate)}</td>
                            <td>{text(attempt.testType || attempt.examType || attempt.sourceType || attempt.source)}</td>
                            <td>{skillText(scores.listening)}</td>
                            <td>{skillText(scores.reading)}</td>
                            <td>{skillText(scores.speaking)}</td>
                            <td>{skillText(scores.writing)}</td>
                            <td>{text(attempt.status)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>

          <div className="col-lg-6">
            <Section title="修課紀錄">
              {courses.length === 0 ? <EmptyState /> : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr><th>學期</th><th>課號</th><th>課名</th><th>狀態</th></tr>
                    </thead>
                    <tbody>
                      {courses.slice(0, 12).map((row, idx) => {
                        const course = row.course || {};
                        return (
                          <tr key={row.id || row.enrollmentId || idx}>
                            <td>{text(row.semesterId || course.semesterId)}</td>
                            <td>{text(course.courseCode)}</td>
                            <td>{text(course.courseName)}</td>
                            <td>{text(row.passStatus || row.enrollmentStatus)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>

          <div className="col-12">
            <Section title="Timeline">
              {timeline.length === 0 ? <EmptyState /> : (
                <div className="table-responsive">
                  <table className="table table-sm table-striped mb-0 align-middle">
                    <thead className="table-light">
                      <tr><th>日期</th><th>類型</th><th>標題</th><th>狀態</th><th>來源</th></tr>
                    </thead>
                    <tbody>
                      {timeline.slice(0, 80).map((ev) => (
                        <tr key={ev.id || `${ev.type}-${ev.date}`}>
                          <td className="text-nowrap">{formatDate(ev.date)}</td>
                          <td>{ev.type === 'course_record' ? <span className="badge bg-info text-dark">修課紀錄</span> : text(ev.type)}</td>
                          <td>
                            {text(ev.title)}
                            {ev.type === 'course_record' && ev.payload ? (
                              <div className="text-muted">{text(ev.payload.courseCode)}；{text(ev.payload.departmentName)}；學分 {text(ev.payload.credits)}</div>
                            ) : null}
                          </td>
                          <td>{text(ev.status)}</td>
                          <td>{text(ev.source)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>

          <div className="col-12">
            <Section title="Data Quality">
              {dataQuality.length === 0 ? <div className="alert alert-success py-2 mb-0">目前沒有資料品質提示。</div> : (
                <div className="table-responsive">
                  <table className="table table-sm table-bordered mb-0 align-middle">
                    <thead className="table-light">
                      <tr><th>severity</th><th>code</th><th>message</th></tr>
                    </thead>
                    <tbody>
                      {dataQuality.map((q, idx) => (
                        <tr key={`${q.code}-${idx}`}>
                          <td>{text(q.severity)}</td>
                          <td className="font-monospace">{text(q.code)}</td>
                          <td>{text(q.message)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
