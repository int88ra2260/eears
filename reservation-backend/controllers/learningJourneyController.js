'use strict';

const learningJourneyCore = require('../services/learningJourney/learningJourneyService');
const ljReadAggregate = require('../services/learningJourneyService');
const {
  getSemesterReconciliation,
  isValidSemesterId: isValidReconciliationSemesterId
} = require('../services/learningJourney/reconciliationService');
const { runSync, normalizeSections } = require('../services/learningJourney/syncService');
const {
  getEnglishTestSummaryV3,
  getEnglishTestSummaryCompare
} = require('../services/learningJourney/englishTestSummaryV3Service');
const {
  getEnglishTestStudentsV3,
  compareEnglishTestStudents
} = require('../services/learningJourney/englishTestStudentsV3Service');
const {
  getEnglishTestStudentDetailV3,
  compareEnglishTestStudentDetail
} = require('../services/learningJourney/englishTestStudentDetailV3Service');
const { getSemesterReadinessGate } = require('../services/learningJourney/readinessGateService');
const { isLearningJourneyV3ReadModelEnabled } = require('../services/learningJourney/learningJourneyFeatureFlags');
const { normalizeStudentId } = require('../services/learningJourney/utils/studentNormalization');

function envelope(req, data, warnings = [], debug = null) {
  return {
    success: true,
    data,
    meta: {
      traceId: req.requestId || '',
      generatedAt: new Date().toISOString(),
      ...(debug ? { debug } : {})
    },
    warnings
  };
}

async function getStudentProfile(req, res) {
  try {
    const studentId = normalizeStudentId(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ error: 'studentId 為必填', requestId: req.requestId });
    }

    const result = await ljReadAggregate.getAggregatedStudentReadModel(studentId);
    const warnMessages = (result.dataQuality || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);

    return res.json(envelope(req, result, warnMessages, {
      mode: 'aggregate_read_model'
    }));
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getStudentTimeline(req, res) {
  try {
    const studentId = normalizeStudentId(req.params.studentId);
    if (!studentId) {
      return res.status(400).json({ error: 'studentId 為必填', requestId: req.requestId });
    }
    const result = await ljReadAggregate.getAggregatedStudentReadModel(studentId);
    const warnMessages = (result.dataQuality || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);
    return res.json(envelope(req, result, warnMessages, { mode: 'aggregate_read_model' }));
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getSemesterMetrics(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }

    const result = await learningJourneyCore.getSemesterMetrics(semesterId, {
      scope: req.query.scope || 'school',
      classId: req.query.classId,
      department: req.query.department,
      includeTrend: req.query.includeTrend === 'true'
    });
    return res.json(envelope(req, result, []));
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getReconciliation(req, res) {
  try {
    const semesterId = req.query.semesterId ? String(req.query.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    if (!isValidReconciliationSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確（須如 114-2）', requestId: req.requestId });
    }
    const data = await getSemesterReconciliation(semesterId);
    return res.json(envelope(req, data, [], { mode: 'reconciliation' }));
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getReadinessHandler(req, res) {
  try {
    const semesterId = req.query.semesterId ? String(req.query.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    if (!isValidReconciliationSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確（須如 114-2）', requestId: req.requestId });
    }
    const data = await getSemesterReadinessGate(semesterId);
    const warnMessages = [];
    if (data.status === 'not_ready' || data.status === 'error') {
      for (const c of data.checks || []) {
        if (c && c.status === 'warning') warnMessages.push(`${c.label}: ${c.message}`);
        if (c && c.status === 'error') warnMessages.push(`${c.label}: ${c.message}`);
      }
    }
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'readiness_gate',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getSemesterDashboard(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    const result = await ljReadAggregate.getAggregatedSemesterDashboard(semesterId);
    const warnMessages = (result.dataQuality || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);
    return res.json(envelope(req, result, warnMessages, { mode: 'aggregate_read_model' }));
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getEnglishTestSummaryV3Handler(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    const data = await getEnglishTestSummaryV3(semesterId);
    if (data.error) {
      return res.status(400).json({ error: data.error, requestId: req.requestId });
    }
    const warnMessages = ((data.dataQuality && data.dataQuality.warnings) || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'english_test_summary_v3',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getEnglishTestSummaryCompareHandler(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    const data = await getEnglishTestSummaryCompare(semesterId);
    const warnMessages = ((data.v3 && data.v3.dataQuality && data.v3.dataQuality.warnings) || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'english_test_summary_compare',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getEnglishTestStudentsV3ListHandler(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    if (!isValidReconciliationSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確', requestId: req.requestId });
    }
    const data = await getEnglishTestStudentsV3(semesterId, {
      keyword: req.query.keyword,
      grade: req.query.grade,
      department: req.query.department,
      attained: req.query.attained,
      limit: req.query.limit,
      offset: req.query.offset
    });
    if (data.error) {
      return res.status(400).json({ error: data.error, requestId: req.requestId });
    }
    const warnMessages = ((data.dataQuality && data.dataQuality.warnings) || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'english_test_students_v3',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getEnglishTestStudentsCompareHandler(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    if (!isValidReconciliationSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確', requestId: req.requestId });
    }
    const data = await compareEnglishTestStudents(semesterId);
    const warnMessages = [];
    if (data.status === 'error') {
      if (data.legacyError) warnMessages.push(`legacy: ${data.legacyError}`);
      if (data.v3Error) warnMessages.push(`v3: ${data.v3Error}`);
    }
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'english_test_students_compare',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getEnglishTestStudentDetailV3Handler(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    const studentId = normalizeStudentId(req.params.studentId);
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    if (!studentId) {
      return res.status(400).json({ error: 'studentId 為必填', requestId: req.requestId });
    }
    const data = await getEnglishTestStudentDetailV3(semesterId, studentId);
    if (data.error === 'NO_STUDENT') {
      return res.status(404).json({ error: '查無 LJS 學生', requestId: req.requestId });
    }
    if (data.error === 'semesterId 格式不正確' || data.error === 'studentId 為必填') {
      return res.status(400).json({ error: data.error, requestId: req.requestId });
    }
    if (data.error) {
      return res.status(400).json({ error: data.error, requestId: req.requestId });
    }
    const warnMessages = ((data.dataQuality && data.dataQuality.warnings) || [])
      .filter((w) => w && w.severity === 'warning')
      .map((w) => w.message);
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'english_test_student_detail_v3',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function getEnglishTestStudentDetailCompareHandler(req, res) {
  try {
    const semesterId = req.params.semesterId ? String(req.params.semesterId).trim() : '';
    const studentId = normalizeStudentId(req.params.studentId);
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    if (!studentId) {
      return res.status(400).json({ error: 'studentId 為必填', requestId: req.requestId });
    }
    if (!isValidReconciliationSemesterId(semesterId)) {
      return res.status(400).json({ error: 'semesterId 格式不正確', requestId: req.requestId });
    }
    const data = await compareEnglishTestStudentDetail(semesterId, studentId);
    const warnMessages = [];
    if (data.status === 'error') {
      if (data.legacyError) warnMessages.push(`legacy: ${data.legacyError}`);
      if (data.v3Error) warnMessages.push(`v3: ${data.v3Error}`);
    }
    return res.json(
      envelope(req, data, warnMessages, {
        mode: 'english_test_student_detail_compare',
        enableLearningJourneyV3ReadModel: isLearningJourneyV3ReadModelEnabled()
      })
    );
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function postSync(req, res) {
  try {
    const body = req.body || {};
    const semesterId = String(body.semesterId || '').trim();
    const sections = body.sections;
    const dryRun = body.dryRun !== false;
    if (!semesterId) {
      return res.status(400).json({ error: 'semesterId 為必填', requestId: req.requestId });
    }
    const normalized = normalizeSections(sections);
    if (!normalized.length) {
      return res.status(400).json({ error: 'sections 無效或為空', requestId: req.requestId });
    }
    const data = await runSync({ semesterId, sections: normalized, dryRun });
    if (data.error) {
      return res.status(400).json({ error: data.error, requestId: req.requestId });
    }
    return res.json(envelope(req, data, [], { mode: 'learning_journey_sync' }));
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

async function rebuildCache(req, res) {
  try {
    const semesterId = req.body && req.body.semesterId ? String(req.body.semesterId).trim() : (req.query.semesterId || '').trim();
    const studentId = req.body && req.body.studentId ? normalizeStudentId(req.body.studentId) : normalizeStudentId(req.query.studentId);

    if (semesterId && studentId) {
      const profile = await learningJourneyCore.getStudentProfile(studentId, { semesterId });
      if (!profile || !profile.student || !profile.student.studentPk) {
        return res.status(404).json({ error: '查無可重建學生', requestId: req.requestId });
      }
      const rebuilt = await learningJourneyCore.rebuildStudentSemesterProfile(profile.student.studentPk, semesterId);
      return res.json(envelope(req, { mode: 'single', rebuilt: !!rebuilt }, []));
    }

    if (semesterId) {
      const rebuilt = await learningJourneyCore.rebuildSemesterProfilesBySemester(semesterId);
      return res.json(envelope(req, { mode: 'semester', ...rebuilt }, []));
    }

    return res.status(400).json({ error: 'semesterId 或 (semesterId + studentId) 為必填', requestId: req.requestId });
  } catch (error) {
    return res.status(500).json({ error: error.message, requestId: req.requestId });
  }
}

module.exports = {
  getStudentProfile,
  getStudentTimeline,
  getSemesterMetrics,
  getSemesterDashboard,
  getReconciliation,
  getReadinessHandler,
  getEnglishTestSummaryV3Handler,
  getEnglishTestSummaryCompareHandler,
  getEnglishTestStudentsV3ListHandler,
  getEnglishTestStudentsCompareHandler,
  getEnglishTestStudentDetailV3Handler,
  getEnglishTestStudentDetailCompareHandler,
  postSync,
  rebuildCache
};
