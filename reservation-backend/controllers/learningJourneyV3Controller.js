'use strict';

const { getSemesterB2Report, getSemesterBreakdownReport } = require('../services/learningJourney/b2ReportService');
const {
  getSemesterStudents,
  getStudentProfile,
  getStudentTrends
} = require('../services/learningJourney/learningJourneyV3ReadService');
const { importEnrollment } = require('../services/learningJourney/importEnrollmentService');
const { importExam } = require('../services/learningJourney/importExamService');
const {
  getUserLearningJourneyScope,
  isTeacher
} = require('../services/learningJourney/learningJourneyAccessService');

async function ensureStudentAccess(req, studentId, semesterId) {
  if (isTeacher(req.user) && !semesterId) {
    return { ok: false, status: 400, error: 'teacher 查詢學生歷程需提供 semesterId' };
  }
  const scope = await getUserLearningJourneyScope(req.user, semesterId);
  if (scope.scope !== 'teacher') return { ok: true, scope };
  const sid = String(studentId || '').trim().toUpperCase();
  const allowSet = new Set((scope.allowedStudentIds || []).map((x) => String(x || '').trim().toUpperCase()));
  if (!allowSet.has(sid)) {
    return { ok: false, status: 403, error: '你沒有權限查看此學生的學習歷程' };
  }
  return { ok: true, scope };
}

async function getB2Report(req, res) {
  const semesterId = String(req.params.id || '').trim();
  if (!semesterId) {
    return res.status(400).json({ success: false, error: 'semesterId 必填', requestId: req.requestId });
  }
  try {
    const scope = await getUserLearningJourneyScope(req.user, semesterId);
    const data = await getSemesterB2Report(semesterId, scope.scope === 'teacher' ? { allowedStudentIds: scope.allowedStudentIds } : {});
    return res.json({ success: true, data, warnings: [], requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

async function getStudents(req, res) {
  const semesterId = String(req.params.id || '').trim();
  if (!semesterId) {
    return res.status(400).json({ success: false, error: 'semesterId 必填', requestId: req.requestId });
  }
  try {
    const scope = await getUserLearningJourneyScope(req.user, semesterId);
    const { limit, offset } = req.query || {};
    const data = await getSemesterStudents(
      semesterId,
      scope.scope === 'teacher'
        ? { limit, offset, allowedStudentIds: scope.allowedStudentIds }
        : { limit, offset }
    );
    return res.json({ success: true, data, warnings: [], requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

async function getBreakdown(req, res) {
  const semesterId = String(req.params.id || '').trim();
  const groupBy = String((req.query && req.query.groupBy) || '').trim().toLowerCase();
  if (!semesterId) {
    return res.status(400).json({ success: false, error: 'semesterId 必填', requestId: req.requestId });
  }
  if (!['grade', 'department', 'cohort'].includes(groupBy)) {
    return res.status(400).json({ success: false, error: 'groupBy 必須為 grade/department/cohort', requestId: req.requestId });
  }
  try {
    const scope = await getUserLearningJourneyScope(req.user, semesterId);
    const data = await getSemesterBreakdownReport(
      semesterId,
      groupBy,
      scope.scope === 'teacher' ? { allowedStudentIds: scope.allowedStudentIds } : {}
    );
    return res.json({ success: true, data, warnings: [], requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

async function getStudent(req, res) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const semesterId = String((req.query && req.query.semesterId) || '').trim();
    const access = await ensureStudentAccess(req, studentId, semesterId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, error: access.error, requestId: req.requestId });
    }
    const data = await getStudentProfile(studentId, { semesterId });
    if (data.error) {
      return res.status(400).json({ success: false, error: data.error, requestId: req.requestId });
    }
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    return res.json({ success: true, data, warnings, requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

async function getStudentTrendsHandler(req, res) {
  try {
    const studentId = String(req.params.studentId || '').trim();
    const semesterId = String((req.query && req.query.semesterId) || '').trim();
    const access = await ensureStudentAccess(req, studentId, semesterId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, error: access.error, requestId: req.requestId });
    }
    const data = await getStudentTrends(studentId);
    if (data.error) {
      return res.status(400).json({ success: false, error: data.error, requestId: req.requestId });
    }
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    return res.json({ success: true, data, warnings, requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

async function postEnrollmentImport(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: '請上傳 Excel（.xlsx/.xls）', requestId: req.requestId });
    }
    const semesterId = String((req.body && req.body.semesterId) || req.query.semesterId || '').trim();
    const result = await importEnrollment(req.file.buffer, semesterId);
    if (!result.ok) {
      return res.status(400).json({ success: false, ...result, requestId: req.requestId });
    }
    return res.json({ success: true, data: result, requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

async function postExamImport(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, error: '請上傳 Excel（.xlsx/.xls）', requestId: req.requestId });
    }
    const result = await importExam(req.file.buffer);
    return res.json({ success: true, data: result, requestId: req.requestId });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message, requestId: req.requestId });
  }
}

module.exports = {
  getB2Report,
  getBreakdown,
  getStudents,
  getStudent,
  getStudentTrendsHandler,
  postEnrollmentImport,
  postExamImport
};
