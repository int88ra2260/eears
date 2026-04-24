const path = require('path');
const fs = require('fs');
const {
  EtSemester,
  EtExamAttempt,
  EtExamAttemptScore,
  EtSemesterStudentBestSkill,
  EtEnrollmentSnapshot
} = require('../models');
const { importEnrollment } = require('../services/englishTestTracking/enrollmentImportService');
const { importExamAttempts, rollbackBatch } = require('../services/englishTestTracking/examAttemptImportService');
const { recomputeBestSkills } = require('../services/englishTestTracking/bestSkillRecomputeService');
const { getGradeSkillSummary, getGradeSkillDrilldown } = require('../services/englishTestTracking/reportService');
const config = require('../config/englishTestTracking');

const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/english-test-tracking');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `import-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) cb(null, true);
    else cb(new Error('只允許 .xlsx, .xls'), false);
  }
});

async function listSemesters(req, res) {
  try {
    const list = await EtSemester.findAll({ order: [['id', 'DESC']] });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function importEnrollmentHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳 Excel 檔案' });
    const semesterId = req.body.semesterId || req.body.semester;
    if (!semesterId) return res.status(400).json({ error: '請提供 semesterId' });
    const overwriteWithThisSheet = req.body.overwriteWithThisSheet === 'true' || req.body.overwriteWithThisSheet === true;
    const result = await importEnrollment(req.file.path, semesterId, { overwriteWithThisSheet });
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.json({ success: true, ...result });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}

async function importAttemptsHandler(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: '請上傳 Excel 檔案' });
    const semesterId = String(req.body.semesterId || '').trim();
    if (!semesterId) return res.status(400).json({ error: '請提供 semesterId' });
    const treatDuplicateAs = req.body.treatDuplicateAs || 'replace';
    const importName = String(req.body.importName || '').trim();
    if (!importName) return res.status(400).json({ error: '請提供匯入名稱' });
    if (importName.length > 120) return res.status(400).json({ error: '匯入名稱長度不可超過 120 字元' });
    const result = await importExamAttempts(req.file.path, {
      semesterId,
      source: 'manual_import',
      treatDuplicateAs,
      splitMultipleDates: req.body.splitMultipleDates !== 'false',
      importName,
      operatorId: req.user && req.user.id ? String(req.user.id) : null
    });
    try { fs.unlinkSync(req.file.path); } catch (_) {}
    res.json({ success: true, ...result });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
}

async function recomputeHandler(req, res) {
  try {
    const { semesterId, studentIds, fullRecompute } = req.body || {};
    if (!semesterId) return res.status(400).json({ error: '請提供 semesterId' });
    const result = await recomputeBestSkills(semesterId, {
      studentIds: Array.isArray(studentIds) ? studentIds : undefined,
      fullRecompute: fullRecompute === true
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function reportGradeSkillSummary(req, res) {
  try {
    const { semesterId } = req.params;
    const metric = req.query.metric || 'avg';
    const threshold = req.query.threshold || 'B2';
    const includeTotal = req.query.includeTotal !== 'false';
    const summary = await getGradeSkillSummary(semesterId, { metric, threshold, includeTotal });
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function reportDrilldown(req, res) {
  try {
    const { semesterId, grade, skill } = req.params;
    const list = await getGradeSkillDrilldown(semesterId, grade, skill);
    res.json({ semesterId, grade, skill, students: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getStudentAttempts(req, res) {
  try {
    const { studentId } = req.params;
    const attempts = await EtExamAttempt.findAll({
      where: { studentId, status: 'valid' },
      include: [{ model: EtExamAttemptScore, as: 'scores' }],
      order: [['testDate', 'DESC'], ['id', 'DESC']]
    });
    res.json({ studentId, attempts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getStudentBestSkills(req, res) {
  try {
    const { studentId } = req.params;
    const semesterId = req.query.semesterId || null;
    const where = { studentId };
    if (semesterId) where.semesterId = semesterId;
    const bestSkills = await EtSemesterStudentBestSkill.findAll({
      where,
      include: [{ model: EtExamAttempt, as: 'bestAttempt', attributes: ['id', 'testDate', 'testType'] }],
      order: [['semesterId', 'DESC'], ['skill']]
    });
    res.json({ studentId, bestSkills });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function rollbackBatchHandler(req, res) {
  try {
    const { importBatchId } = req.body || {};
    if (!importBatchId) return res.status(400).json({ error: '請提供 importBatchId' });
    const result = await rollbackBatch(importBatchId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = {
  listSemesters,
  importEnrollmentHandler,
  importAttemptsHandler,
  recomputeHandler,
  reportGradeSkillSummary,
  reportDrilldown,
  getStudentAttempts,
  getStudentBestSkills,
  rollbackBatchHandler,
  upload
};
