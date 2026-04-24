// controllers/analyticsController.js — 薄層：僅轉呼叫 service
const studentProfileService = require('../services/studentProfileService');
const classEvaluationService = require('../services/classEvaluationService');
const analyticsService = require('../services/analyticsService');
const teacherEvaluationService = require('../services/teacherEvaluationService');
const riskDetectionService = require('../services/riskDetectionService');
const trendAnalysisService = require('../services/trendAnalysisService');

async function getStudentProfile(req, res, next) {
  try {
    const { studentId } = req.params;
    const { fromSemester, toSemester } = req.query;
    const data = await studentProfileService.getStudentProfile(studentId, {
      fromSemester,
      toSemester
    });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getClassEvaluation(req, res, next) {
  try {
    const { classId } = req.params;
    const { semester } = req.query;
    if (!semester) {
      return res.status(400).json({ error: '請提供 query: semester' });
    }
    const data = await classEvaluationService.getClassEvaluation(
      parseInt(classId, 10),
      String(semester).trim()
    );
    res.json(data);
  } catch (err) {
    if (err.message === '找不到班級' || err.message === '不支援的學期') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getOverview(req, res, next) {
  try {
    const { semester, kind } = req.query;
    if (!semester) {
      return res.status(400).json({ error: '請提供 query: semester' });
    }

    const kindStr = kind ? String(kind).trim().toLowerCase() : '';
    const semesterStr = String(semester).trim();

    // Phase 8：reservation analytics（以 query: kind=reservation 切換，不影響既有報表 API）
    const data =
      kindStr === 'reservation'
        ? await analyticsService.getReservationOverview(semesterStr)
        : await analyticsService.getAdminOverview(semesterStr);
    res.json(data);
  } catch (err) {
    if (err.message === '不支援的學期') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getTeacherDashboard(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { semester } = req.query;
    if (!semester) {
      return res.status(400).json({ error: '請提供 query: semester' });
    }

    const data = await teacherEvaluationService.getTeacherDashboard(
      parseInt(teacherId, 10),
      String(semester).trim()
    );
    res.json(data);
  } catch (err) {
    if (err.message === '不支援的學期' || err.message === 'semester is required' || err.message === 'teacherId is required') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getRisk(req, res, next) {
  try {
    const { semester } = req.query;
    if (!semester) {
      return res.status(400).json({ error: '請提供 query: semester' });
    }

    // Phase 2 MVP：回傳該學期「高風險學生」列表（由 Service 統一處理 studentId 清洗與計算）
    const risks = await riskDetectionService.getHighRisksForSemester(String(semester).trim(), {
      participationThreshold: 2
    });

    res.json({
      semester: String(semester).trim(),
      risks
    });
  } catch (err) {
    if (err.message === '不支援的學期') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getStudentTrends(req, res, next) {
  try {
    const { studentId, fromSemester, toSemester, semester, kind } = req.query;
    const kindStr = kind ? String(kind).trim().toLowerCase() : '';

    // Phase 8：reservation activity trends（以 query: kind=reservation 串接）
    if (kindStr === 'reservation') {
      if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
      const data = await analyticsService.getReservationActivityTrends(String(semester).trim());
      return res.json({ activityTrend: data });
    }

    if (!studentId) return res.status(400).json({ error: '請提供 query: studentId' });
    const data = await trendAnalysisService.getStudentTrends(
      String(studentId).trim(),
      fromSemester ? String(fromSemester).trim() : null,
      toSemester ? String(toSemester).trim() : null
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getClassTrends(req, res, next) {
  try {
    const { classId } = req.params;
    const { fromSemester, toSemester } = req.query;
    const data = await trendAnalysisService.getClassTrends(
      parseInt(classId, 10),
      fromSemester ? String(fromSemester).trim() : null,
      toSemester ? String(toSemester).trim() : null
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getOverviewTrends(req, res, next) {
  try {
    const { fromSemester, toSemester } = req.query;
    const data = await trendAnalysisService.getOverviewTrends(
      fromSemester ? String(fromSemester).trim() : null,
      toSemester ? String(toSemester).trim() : null
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function predictRisk(req, res, next) {
  try {
    const { studentId } = req.params;
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
    const data = await riskDetectionService.predictStudentRisk(String(studentId).trim(), String(semester).trim());
    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getReservationClasses(req, res, next) {
  try {
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
    const rankings = await analyticsService.getReservationClassRankings(String(semester).trim(), {
      limit: req.query.limit ? Number(req.query.limit) : 10,
    });
    res.json({ rankings });
  } catch (err) {
    if (err.message === '不支援的學期') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

async function getReservationEvents(req, res, next) {
  try {
    const { semester } = req.query;
    if (!semester) return res.status(400).json({ error: '請提供 query: semester' });
    const attendance = await analyticsService.getReservationEventsAttendanceTrend(String(semester).trim());
    res.json({ attendanceTrend: attendance });
  } catch (err) {
    if (err.message === '不支援的學期') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
}

module.exports = {
  getStudentProfile,
  getClassEvaluation,
  getOverview,
  getTeacherDashboard,
  getRisk,
  getStudentTrends,
  getClassTrends,
  getOverviewTrends,
  predictRisk,
  // Phase 8：reservation analytics
  getReservationClasses,
  getReservationEvents,
};
