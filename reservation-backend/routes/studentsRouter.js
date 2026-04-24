const express = require('express');
const { authMiddleware, requirePermission, P } = require('../middlewares/auth');
const studentProfileService = require('../services/studentProfileService');

const router = express.Router();

// Phase 9：學生學習歷程（profile）
router.get('/students/:studentId/profile', authMiddleware, requirePermission(P.CAN_VIEW_ANALYTICS), async (req, res, next) => {
  try {
    const { studentId } = req.params;
    const { fromSemester, toSemester } = req.query;
    const data = await studentProfileService.getStudentProfile(studentId, { fromSemester, toSemester });
    res.json(data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

