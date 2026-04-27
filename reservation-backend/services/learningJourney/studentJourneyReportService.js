'use strict';

const ljReadAggregate = require('../learningJourneyService');
const { normalizeStudentId } = require('./utils/studentNormalization');

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function text(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function escapeHtml(value) {
  return text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function buildConsistencyChecks(profile) {
  const flags = (profile.student && profile.student.aggregateFlags) || {};
  const timeline = toArray(profile.timeline);
  const registrations = toArray(profile.examRegistrations);
  const attempts = toArray(profile.examAttempts);
  const ljsAttempts = toArray(profile.student && profile.student.ljsExamAttempts);
  const activities = toArray(profile.activities);
  const courses = toArray(profile.courses);
  const dataQuality = toArray(profile.dataQuality);

  const timelineByType = new Set(timeline.map((ev) => ev && ev.type).filter(Boolean));
  const bestepEvents = timeline.filter((ev) => ['bestep_exam_scores', 'bestep_attendance'].includes(ev && ev.source));
  const externalAttempts = [
    ...attempts,
    ...ljsAttempts.filter((row) => row && row.sourceType !== 'BESTEP')
  ];

  const sections = [
    {
      key: 'activities',
      label: '活動參與',
      recordCount: activities.length,
      timelineCount: timeline.filter((ev) => String(ev.type || '').startsWith('activity_')).length,
      displayable: activities.length > 0 || flags.hasReservations || flags.hasActivityParticipations || flags.hasBestepAttendance
    },
    {
      key: 'bestep',
      label: 'BESTEP 報名與成績',
      recordCount: registrations.length + bestepEvents.length,
      timelineCount: bestepEvents.length,
      displayable: registrations.length > 0 || bestepEvents.length > 0 || flags.hasBestepScores || flags.hasBestepAttendance
    },
    {
      key: 'external_exams',
      label: '其他英檢',
      recordCount: externalAttempts.length,
      timelineCount: timeline.filter((ev) => ev.type === 'exam_attempt').length,
      displayable: externalAttempts.length > 0 || flags.hasEtExamAttempts
    },
    {
      key: 'courses',
      label: '修課紀錄',
      recordCount: courses.length,
      timelineCount: timeline.filter((ev) => ev.type === 'course_record').length,
      displayable: courses.length > 0 || flags.hasCourseEnrollments
    }
  ].map((section) => ({
    ...section,
    status: section.displayable ? 'ok' : 'empty',
    message: section.displayable ? '此區塊可於同一學生頁顯示。' : '此區塊目前無可顯示資料。'
  }));

  const warnings = [];
  if (courses.length > 0 && !timelineByType.has('course_record')) {
    warnings.push('修課紀錄存在，但 timeline 缺少 course_record。');
  }
  if ((flags.hasReservations || flags.hasActivityParticipations) && !sections.find((s) => s.key === 'activities').timelineCount) {
    warnings.push('活動資料存在，但 timeline 缺少活動事件。');
  }
  for (const q of dataQuality) {
    if (q && (q.severity === 'warning' || q.severity === 'error')) {
      warnings.push(`${q.code || 'DATA_QUALITY'}: ${q.message || ''}`.trim());
    }
  }

  return {
    status: warnings.length ? 'warning' : 'ok',
    sections,
    warnings
  };
}

function buildStudentJourneyReport(profile, studentId) {
  const student = profile.student || {};
  const flags = student.aggregateFlags || {};
  const timeline = toArray(profile.timeline);
  const registrations = toArray(profile.examRegistrations);
  const attempts = toArray(profile.examAttempts);
  const ljsAttempts = toArray(student.ljsExamAttempts);
  const activities = toArray(profile.activities);
  const courses = toArray(profile.courses);
  const dataQuality = toArray(profile.dataQuality);
  const bestepEvents = timeline.filter((ev) => ['bestep_exam_scores', 'bestep_attendance'].includes(ev && ev.source));
  const externalExams = [
    ...attempts.map((row) => ({ source: 'et_exam_attempts', ...row })),
    ...ljsAttempts.filter((row) => row && row.sourceType !== 'BESTEP').map((row) => ({ source: 'exam_attempts', ...row }))
  ];

  return {
    generatedAt: new Date().toISOString(),
    student: {
      studentId: student.studentId || studentId,
      name: student.etStudentMaster && (student.etStudentMaster.name || student.etStudentMaster.studentName),
      ljsStudentPk: student.ljsStudentPk || null,
      aggregateFlags: flags
    },
    summary: {
      activityCount: activities.length,
      bestepRegistrationCount: registrations.length,
      bestepEventCount: bestepEvents.length,
      externalExamCount: externalExams.length,
      courseCount: courses.length,
      timelineCount: timeline.length,
      dataQualityCount: dataQuality.length
    },
    sections: {
      activities,
      bestep: {
        registrations,
        events: bestepEvents
      },
      externalExams,
      courses,
      timeline,
      dataQuality
    },
    consistency: buildConsistencyChecks(profile),
    sourceProfile: profile
  };
}

function renderRows(rows, columns) {
  if (!rows.length) return '<p class="muted">尚無資料。</p>';
  const head = columns.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = rows.map((row) => {
    const cells = columns.map((c) => `<td>${escapeHtml(c.get(row))}</td>`).join('');
    return `<tr>${cells}</tr>`;
  }).join('');
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderStudentJourneyHtml(report) {
  const studentId = report.student.studentId;
  const name = report.student.name || '';
  const summary = report.summary;
  const s = report.sections;
  const consistency = report.consistency;
  const courseRows = s.courses.map((row) => ({ ...row, course: row.course || {} }));

  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>學生學習歷程報告 - ${escapeHtml(studentId)}</title>
  <style>
    body { font-family: Arial, "Microsoft JhengHei", sans-serif; color: #1f2937; margin: 24px; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    h2 { font-size: 18px; margin-top: 24px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
    .muted { color: #6b7280; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin: 16px 0; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; }
    .num { font-size: 20px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    .warning { color: #92400e; }
    @media print { body { margin: 12mm; } .no-print { display: none; } }
  </style>
</head>
<body>
  <button class="no-print" onclick="window.print()">列印 / 另存 PDF</button>
  <h1>學生學習歷程報告</h1>
  <div class="muted">學號：${escapeHtml(studentId)}　姓名：${escapeHtml(name)}　產生時間：${escapeHtml(formatDate(report.generatedAt))}</div>

  <div class="grid">
    <div class="card"><div class="muted">活動參與</div><div class="num">${summary.activityCount}</div></div>
    <div class="card"><div class="muted">BESTEP 報名/事件</div><div class="num">${summary.bestepRegistrationCount + summary.bestepEventCount}</div></div>
    <div class="card"><div class="muted">其他英檢</div><div class="num">${summary.externalExamCount}</div></div>
    <div class="card"><div class="muted">修課紀錄</div><div class="num">${summary.courseCount}</div></div>
  </div>

  <h2>跨來源一致性檢查</h2>
  <p class="${consistency.status === 'ok' ? '' : 'warning'}">整體狀態：${escapeHtml(consistency.status)}</p>
  ${renderRows(consistency.sections, [
    { label: '區塊', get: (r) => r.label },
    { label: '狀態', get: (r) => r.status },
    { label: '資料筆數', get: (r) => r.recordCount },
    { label: 'Timeline 筆數', get: (r) => r.timelineCount },
    { label: '說明', get: (r) => r.message }
  ])}
  ${consistency.warnings.length ? `<ul>${consistency.warnings.map((w) => `<li class="warning">${escapeHtml(w)}</li>`).join('')}</ul>` : ''}

  <h2>活動參與</h2>
  ${renderRows(s.activities, [
    { label: '類型', get: (r) => r.kind },
    { label: '活動', get: (r) => r.event ? (r.event.eventType || r.event.name) : (r.participation && r.participation.activityType) },
    { label: '狀態', get: (r) => r.reservation ? r.reservation.checkinStatus : (r.participation && r.participation.attendanceStatus) }
  ])}

  <h2>BESTEP 報名與成績/出席</h2>
  ${renderRows(s.bestep.registrations, [
    { label: '學期', get: (r) => r.semester },
    { label: '考試類型', get: (r) => r.examType },
    { label: '狀態', get: (r) => r.status }
  ])}
  ${renderRows(s.bestep.events, [
    { label: '日期', get: (r) => formatDate(r.date) },
    { label: '事件', get: (r) => r.title },
    { label: '狀態', get: (r) => r.status }
  ])}

  <h2>其他英檢</h2>
  ${renderRows(s.externalExams, [
    { label: '日期', get: (r) => r.testDate || r.examDate },
    { label: '類型/來源', get: (r) => r.testType || r.examType || r.sourceType || r.source },
    { label: '狀態', get: (r) => r.status }
  ])}

  <h2>修課紀錄</h2>
  ${renderRows(courseRows, [
    { label: '學期', get: (r) => r.semesterId || r.course.semesterId },
    { label: '課號', get: (r) => r.course.courseCode },
    { label: '課名', get: (r) => r.course.courseName },
    { label: '狀態', get: (r) => r.passStatus || r.enrollmentStatus }
  ])}

  <h2>Timeline</h2>
  ${renderRows(s.timeline.slice(0, 120), [
    { label: '日期', get: (r) => formatDate(r.date) },
    { label: '類型', get: (r) => r.type },
    { label: '標題', get: (r) => r.title },
    { label: '狀態', get: (r) => r.status },
    { label: '來源', get: (r) => r.source }
  ])}

  <h2>Data Quality</h2>
  ${renderRows(s.dataQuality, [
    { label: 'severity', get: (r) => r.severity },
    { label: 'code', get: (r) => r.code },
    { label: 'message', get: (r) => r.message }
  ])}
</body>
</html>`;
}

async function getStudentJourneyReport(studentIdRaw) {
  const studentId = normalizeStudentId(studentIdRaw);
  if (!studentId) return { error: 'studentId 為必填' };
  const profile = await ljReadAggregate.getAggregatedStudentReadModel(studentId);
  return buildStudentJourneyReport(profile, studentId);
}

module.exports = {
  buildConsistencyChecks,
  buildStudentJourneyReport,
  getStudentJourneyReport,
  renderStudentJourneyHtml
};
