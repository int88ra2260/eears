// services/reportService.js
// Phase 3：自動報表（PDF / Excel）

const ExcelJS = require('exceljs');
const classEvaluationService = require('./classEvaluationService');
const teacherEvaluationService = require('./teacherEvaluationService');
const analyticsService = require('./analyticsService');
const trendAnalysisService = require('./trendAnalysisService');
const scoringService = require('./scoringService');
const riskDetectionService = require('./riskDetectionService');

function tryRequirePdfKit() {
  try {
    return require('pdfkit');
  } catch (e) {
    return null;
  }
}

async function buildClassReportData(classId, semester, fromSemester, toSemester) {
  const classEval = await classEvaluationService.getClassEvaluation(classId, semester);
  const trends = await trendAnalysisService.getClassTrends(classId, fromSemester || semester, toSemester || semester);
  const score = await scoringService.getClassTeachingScore(classId, semester);
  const studentIds = (classEval.bestepOverview?.students || []).map((s) => s.studentId).filter(Boolean);
  const highRisks = await riskDetectionService.getRisksForStudents(studentIds, semester, { onlyHigh: true });

  return {
    scope: 'class',
    classId: Number(classId),
    semester,
    className: classEval.className,
    summary: classEval,
    trends,
    score,
    highRisks
  };
}

async function buildTeacherReportData(teacherId, semester, fromSemester, toSemester) {
  const dashboard = await teacherEvaluationService.getTeacherDashboard(teacherId, semester);
  const trendsOverview = await trendAnalysisService.getOverviewTrends(fromSemester || semester, toSemester || semester);
  return {
    scope: 'teacher',
    teacherId: Number(teacherId),
    semester,
    dashboard,
    trendsOverview
  };
}

async function buildOverviewReportData(semester, fromSemester, toSemester) {
  const overview = await analyticsService.getAdminOverview(semester);
  const trends = await trendAnalysisService.getOverviewTrends(fromSemester || semester, toSemester || semester);
  return {
    scope: 'overview',
    semester,
    overview,
    trends
  };
}

async function generateExcelReport(data) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');

  ws.columns = [
    { header: 'Key', key: 'key', width: 32 },
    { header: 'Value', key: 'value', width: 80 }
  ];
  ws.addRow({ key: 'scope', value: data.scope });

  if (data.scope === 'class') {
    ws.addRow({ key: 'classId', value: data.classId });
    ws.addRow({ key: 'className', value: data.className || '' });
    ws.addRow({ key: 'semester', value: data.semester });
    ws.addRow({ key: 'participationRate', value: data.summary.participation?.participationRate });
    ws.addRow({ key: 'bestepPassRate', value: data.summary.bestep?.bestepPassRate });
    ws.addRow({ key: 'exemptionApprovedRate', value: data.summary.bestep?.exemptionApprovedRate });
    ws.addRow({ key: 'surveyCompletionRate', value: data.summary.survey?.estimatedCompletionRate });
    ws.addRow({ key: 'violationRate', value: data.summary.violations?.violationRate });
    ws.addRow({ key: 'teachingScore', value: `${data.score.score} (${data.score.level})` });
    ws.addRow({ key: 'highRiskCount', value: data.highRisks.length });
  } else if (data.scope === 'teacher') {
    ws.addRow({ key: 'teacherId', value: data.teacherId });
    ws.addRow({ key: 'semester', value: data.semester });
    ws.addRow({ key: 'totalClasses', value: data.dashboard.summary?.totalClasses });
    ws.addRow({ key: 'avgParticipationRate', value: data.dashboard.summary?.avgParticipationRate });
    ws.addRow({ key: 'avgPassRate', value: data.dashboard.summary?.avgPassRate });
    ws.addRow({ key: 'totalRiskStudents', value: data.dashboard.summary?.totalRiskStudents });
  } else {
    ws.addRow({ key: 'semester', value: data.semester });
    ws.addRow({ key: 'totalStudents', value: data.overview.totalStudents });
    ws.addRow({ key: 'participationRate', value: data.overview.participationRate });
    ws.addRow({ key: 'bestepPassRate', value: data.overview.bestepPassRate });
    ws.addRow({ key: 'highRiskStudentCount', value: data.overview.highRiskStudentCount });
    ws.addRow({ key: 'teacherImpactGrowth', value: data.trends.decisionKpis?.teacherImpact?.growth });
  }

  ws.addRow({ key: 'trendSemesters', value: (data.trends?.semesters || data.trendsOverview?.semesters || []).join(', ') });

  return wb.xlsx.writeBuffer();
}

async function generatePdfReport(data) {
  const PDFDocument = tryRequirePdfKit();
  if (!PDFDocument) {
    throw new Error('PDF engine not installed (pdfkit)');
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).text('EEARS Decision Support Report');
    doc.moveDown();
    doc.fontSize(11).text(`Scope: ${data.scope}`);

    if (data.scope === 'class') {
      doc.text(`Class: ${data.className || data.classId}`);
      doc.text(`Semester: ${data.semester}`);
      doc.text(`ParticipationRate: ${data.summary.participation?.participationRate}`);
      doc.text(`BestepPassRate: ${data.summary.bestep?.bestepPassRate}`);
      doc.text(`ExemptionApprovedRate: ${data.summary.bestep?.exemptionApprovedRate}`);
      doc.text(`TeachingScore: ${data.score.score} (${data.score.level})`);
      doc.text(`HighRiskStudents: ${data.highRisks.length}`);
    } else if (data.scope === 'teacher') {
      doc.text(`TeacherId: ${data.teacherId}`);
      doc.text(`Semester: ${data.semester}`);
      doc.text(`TotalClasses: ${data.dashboard.summary?.totalClasses}`);
      doc.text(`AvgParticipationRate: ${data.dashboard.summary?.avgParticipationRate}`);
      doc.text(`AvgPassRate: ${data.dashboard.summary?.avgPassRate}`);
      doc.text(`TotalRiskStudents: ${data.dashboard.summary?.totalRiskStudents}`);
    } else {
      doc.text(`Semester: ${data.semester}`);
      doc.text(`TotalStudents: ${data.overview.totalStudents}`);
      doc.text(`ParticipationRate: ${data.overview.participationRate}`);
      doc.text(`BestepPassRate: ${data.overview.bestepPassRate}`);
      doc.text(`HighRiskStudentCount: ${data.overview.highRiskStudentCount}`);
      doc.text(`TeacherImpactGrowth: ${data.trends.decisionKpis?.teacherImpact?.growth}`);
    }

    doc.moveDown();
    const semesters = data.trends?.semesters || data.trendsOverview?.semesters || [];
    doc.text(`Trend Semesters: ${semesters.join(', ')}`);
    doc.end();
  });
}

module.exports = {
  buildClassReportData,
  buildTeacherReportData,
  buildOverviewReportData,
  generateExcelReport,
  generatePdfReport
};

