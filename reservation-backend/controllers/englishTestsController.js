'use strict';

const { EtSemester } = require('../models');
const englishTestReportService = require('../services/englishTestTracking/englishTestReportService');
const semesterBestSkillService = require('../services/englishTestTracking/semesterBestSkillService');
const { isLearningJourneyV3ReadModelEnabled } = require('../services/learningJourney/learningJourneyFeatureFlags');
const { getEnglishTestSummaryV3 } = require('../services/learningJourney/englishTestSummaryV3Service');
const { getEnglishTestStudentsV3 } = require('../services/learningJourney/englishTestStudentsV3Service');
const { getEnglishTestStudentDetailV3 } = require('../services/learningJourney/englishTestStudentDetailV3Service');

function isValidSemesterId(input) {
  if (!input) return false;
  return /^[0-9]{2,4}-[0-9]{1,2}$/.test(String(input).trim());
}

async function listSemesters(req, res) {
  try {
    const semesters = await EtSemester.findAll({
      order: [['id', 'DESC']]
    });
    return res.json(semesters);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function createSemester(req, res) {
  try {
    const payload = req.body || {};
    const id = payload.id ? String(payload.id).trim() : (payload.code ? String(payload.code).trim() : '');

    if (!isValidSemesterId(id)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }

    const [semester, created] = await EtSemester.findOrCreate({
      where: { id },
      defaults: {
        id,
        code: payload.code ? String(payload.code).trim() : id,
        name: payload.name ? String(payload.name).trim() : id,
        startDate: payload.startDate || null,
        endDate: payload.endDate || null,
        isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true
      }
    });

    if (!created) {
      return res.status(400).json({ error: '學期已存在' });
    }

    return res.json({ success: true, semester });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function sendSemesterSummaryPayload(res, kpi, readModelKey, source) {
  const warnings = Array.isArray(kpi.warnings) ? [...kpi.warnings] : [];
  const { warnings: _drop, meta: _m, source: _s, ...rest } = kpi;
  return res.json({
    ...rest,
    source,
    meta: { debug: { readModel: readModelKey } },
    warnings
  });
}

const DRIFT_MSG =
  'Learning Journey v3 summary differs substantially from legacy; verify data sync and reconciliation before relying on KPI.';

async function getSemesterSummary(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }

    const options = { activeOnly: req.query.activeOnly !== 'false' };

    async function loadLegacySummary() {
      return englishTestReportService.getSemesterSummary(semesterId, options);
    }

    if (!isLearningJourneyV3ReadModelEnabled()) {
      const summary = await loadLegacySummary();
      return sendSemesterSummaryPayload(res, { ...summary, warnings: [] }, 'legacy_et_v2', 'legacy_et_v2');
    }

    let v3 = null;
    let v3Ok = false;
    try {
      v3 = await getEnglishTestSummaryV3(semesterId);
      v3Ok = v3 && !v3.error;
    } catch (_) {
      v3Ok = false;
    }

    if (!v3Ok) {
      const summary = await loadLegacySummary();
      return sendSemesterSummaryPayload(
        res,
        {
          ...summary,
          warnings: ['Learning Journey v3 summary failed; fallback to legacy']
        },
        'legacy_et_v2_fallback',
        'legacy_et_v2_fallback'
      );
    }

    const warnings = [];
    const dq = v3.dataQuality && v3.dataQuality.warnings;
    if (Array.isArray(dq)) {
      for (const w of dq) {
        if (w && w.message) warnings.push(w.message);
      }
    }

    let legacy = null;
    try {
      legacy = await loadLegacySummary();
    } catch (_) {
      legacy = null;
    }
    if (legacy) {
      const dRoster = Math.abs(v3.rosterActiveStudentCount - legacy.rosterActiveStudentCount);
      const dValid = Math.abs(v3.validBestScoreStudentCount - legacy.validBestScoreStudentCount);
      const dAtt = Math.abs(v3.attainedStudentCount - legacy.attainedStudentCount);
      const dRate = Math.abs(Number(v3.attainmentRate || 0) - Number(legacy.attainmentRate || 0));
      if (dRoster > 0 || dValid > 5 || dAtt > 5 || dRate > 0.03) {
        warnings.push(DRIFT_MSG);
      }
    }

    const { error: _e, dataQuality: _dq, source: _src, ...kpiFromV3 } = v3;
    return sendSemesterSummaryPayload(res, { ...kpiFromV3, warnings }, 'learning_journey_v3', 'learning_journey_v3');
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function sendSemesterStudentsPayload(res, body, readModelKey, source) {
  const warnings = Array.isArray(body.warnings) ? [...body.warnings] : [];
  const { warnings: _w, meta: _m, source: _s, ...rest } = body;
  return res.json({
    ...rest,
    source,
    meta: { debug: { readModel: readModelKey } },
    warnings
  });
}

function sendStudentDetailPayload(res, body, readModelKey, source) {
  const warnings = Array.isArray(body.warnings) ? [...body.warnings] : [];
  const { warnings: _w, meta: _m, source: _s, ...rest } = body;
  return res.json({
    ...rest,
    source,
    meta: { debug: { readModel: readModelKey } },
    warnings
  });
}

async function getSemesterStudents(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }

    const opts = {
      keyword: req.query.keyword,
      grade: req.query.grade,
      department: req.query.department,
      attained: req.query.attained,
      limit: req.query.limit,
      offset: req.query.offset
    };

    if (!isLearningJourneyV3ReadModelEnabled()) {
      const result = await englishTestReportService.getSemesterStudents(semesterId, opts);
      return sendSemesterStudentsPayload(res, { ...result, warnings: [] }, 'legacy_et_v2', 'legacy_et_v2');
    }

    let v3 = null;
    let v3Ok = false;
    try {
      v3 = await getEnglishTestStudentsV3(semesterId, opts);
      v3Ok = v3 && !v3.error;
    } catch (_) {
      v3Ok = false;
    }

    if (!v3Ok) {
      const result = await englishTestReportService.getSemesterStudents(semesterId, opts);
      return sendSemesterStudentsPayload(
        res,
        {
          ...result,
          warnings: ['Learning Journey v3 students list failed; fallback to legacy']
        },
        'legacy_et_v2_fallback',
        'legacy_et_v2_fallback'
      );
    }

    const warnings = [];
    if (v3.dataQuality && Array.isArray(v3.dataQuality.warnings)) {
      for (const w of v3.dataQuality.warnings) {
        if (w && w.message) warnings.push(w.message);
      }
    }
    const { error: _e, dataQuality: _dq, source: _src, ...rest } = v3;
    return sendSemesterStudentsPayload(res, { ...rest, warnings }, 'learning_journey_v3', 'learning_journey_v3');
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSemesterDepartmentStats(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }
    const result = await englishTestReportService.getSemesterDepartmentStats(semesterId, {
      activeOnly: req.query.activeOnly !== 'false'
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSemesterCefrDistribution(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }
    const result = await englishTestReportService.getSemesterCefrDistribution(semesterId, {
      activeOnly: req.query.activeOnly !== 'false'
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSemesterDataQuality(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }
    const result = await englishTestReportService.getSemesterDataQuality(semesterId, {
      activeOnly: req.query.activeOnly !== 'false'
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getSemesterImportHistories(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }
    const result = await englishTestReportService.getSemesterImportHistories(semesterId, {
      limit: req.query.limit
    });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function getStudentDetail(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    const studentId = req.params.studentId ? String(req.params.studentId).trim() : '';

    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }
    if (!studentId) {
      return res.status(400).json({ error: 'studentId 為必填' });
    }

    function isEmptyDetail(d) {
      return !d || (!d.roster && !d.bestSkills && (!d.attempts || d.attempts.length === 0));
    }

    if (!isLearningJourneyV3ReadModelEnabled()) {
      const detail = await englishTestReportService.getStudentDetail(semesterId, studentId);
      if (isEmptyDetail(detail)) {
        return res.status(404).json({ error: '查無資料' });
      }
      return sendStudentDetailPayload(res, { ...detail, warnings: [] }, 'legacy_et_v2', 'legacy_et_v2');
    }

    let v3 = null;
    let v3Ok = false;
    try {
      v3 = await getEnglishTestStudentDetailV3(semesterId, studentId);
      v3Ok = v3 && !v3.error;
    } catch (_) {
      v3Ok = false;
    }

    if (!v3Ok) {
      try {
        const detail = await englishTestReportService.getStudentDetail(semesterId, studentId);
        if (isEmptyDetail(detail)) {
          return res.status(404).json({ error: '查無資料' });
        }
        return sendStudentDetailPayload(res, {
          ...detail,
          warnings: ['Learning Journey v3 student detail failed; fallback to legacy']
        }, 'legacy_et_v2_fallback', 'legacy_et_v2_fallback');
      } catch (error) {
        const status = error && error.status ? error.status : 500;
        return res.status(status).json({ error: error.message });
      }
    }

    const warnings = [];
    if (v3.dataQuality && Array.isArray(v3.dataQuality.warnings)) {
      for (const w of v3.dataQuality.warnings) {
        if (w && w.message) warnings.push(w.message);
      }
    }
    const { error: _e, dataQuality: _dq, source: _src, ...rest } = v3;
    return sendStudentDetailPayload(res, { ...rest, warnings }, 'learning_journey_v3', 'learning_journey_v3');
  } catch (error) {
    const status = error && error.status ? error.status : 500;
    return res.status(status).json({ error: error.message });
  }
}

async function rebuildSemesterBestSkills(req, res) {
  try {
    const semesterId = req.params.id ? String(req.params.id).trim() : '';
    if (!isValidSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確' });
    }

    const result = await semesterBestSkillService.rebuildSemesterBestSkills(semesterId, {
      activeOnly: req.body && req.body.activeOnly !== undefined ? !!req.body.activeOnly : true
    });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  listSemesters,
  createSemester,
  getSemesterSummary,
  getSemesterStudents,
  getSemesterDepartmentStats,
  getSemesterCefrDistribution,
  getSemesterDataQuality,
  getSemesterImportHistories,
  getStudentDetail,
  rebuildSemesterBestSkills
};
