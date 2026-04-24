// controllers/reportController.js
const reportService = require('../services/reportService');

function resolveFormat(req) {
  const format = String(req.query.format || 'pdf').toLowerCase();
  if (format === 'xlsx' || format === 'excel') return 'xlsx';
  return 'pdf';
}

async function sendReportBuffer(res, filenameBase, format, buffer) {
  if (format === 'xlsx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.xlsx"`);
  } else {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filenameBase}.pdf"`);
  }
  res.send(buffer);
}

async function getClassReport(req, res, next) {
  try {
    const classId = parseInt(req.params.classId, 10);
    const semester = String(req.query.semester || '').trim();
    if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
    const fromSemester = req.query.fromSemester ? String(req.query.fromSemester).trim() : semester;
    const toSemester = req.query.toSemester ? String(req.query.toSemester).trim() : semester;
    const format = resolveFormat(req);

    const data = await reportService.buildClassReportData(classId, semester, fromSemester, toSemester);
    const buffer = format === 'xlsx'
      ? await reportService.generateExcelReport(data)
      : await reportService.generatePdfReport(data);

    await sendReportBuffer(res, `class-report-${classId}-${semester}`, format, buffer);
  } catch (err) {
    if (String(err.message || '').includes('PDF engine not installed')) {
      return res.status(501).json({ error: 'PDF 引擎尚未安裝，請改用 format=xlsx 或安裝 pdfkit' });
    }
    next(err);
  }
}

async function getTeacherReport(req, res, next) {
  try {
    const teacherId = parseInt(req.params.teacherId, 10);
    const semester = String(req.query.semester || '').trim();
    if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
    const fromSemester = req.query.fromSemester ? String(req.query.fromSemester).trim() : semester;
    const toSemester = req.query.toSemester ? String(req.query.toSemester).trim() : semester;
    const format = resolveFormat(req);

    const data = await reportService.buildTeacherReportData(teacherId, semester, fromSemester, toSemester);
    const buffer = format === 'xlsx'
      ? await reportService.generateExcelReport(data)
      : await reportService.generatePdfReport(data);

    await sendReportBuffer(res, `teacher-report-${teacherId}-${semester}`, format, buffer);
  } catch (err) {
    if (String(err.message || '').includes('PDF engine not installed')) {
      return res.status(501).json({ error: 'PDF 引擎尚未安裝，請改用 format=xlsx 或安裝 pdfkit' });
    }
    next(err);
  }
}

async function getOverviewReport(req, res, next) {
  try {
    const semester = String(req.query.semester || '').trim();
    if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
    const fromSemester = req.query.fromSemester ? String(req.query.fromSemester).trim() : semester;
    const toSemester = req.query.toSemester ? String(req.query.toSemester).trim() : semester;
    const format = resolveFormat(req);

    const data = await reportService.buildOverviewReportData(semester, fromSemester, toSemester);
    const buffer = format === 'xlsx'
      ? await reportService.generateExcelReport(data)
      : await reportService.generatePdfReport(data);

    await sendReportBuffer(res, `overview-report-${semester}`, format, buffer);
  } catch (err) {
    if (String(err.message || '').includes('PDF engine not installed')) {
      return res.status(501).json({ error: 'PDF 引擎尚未安裝，請改用 format=xlsx 或安裝 pdfkit' });
    }
    next(err);
  }
}

module.exports = {
  getClassReport,
  getTeacherReport,
  getOverviewReport
};

