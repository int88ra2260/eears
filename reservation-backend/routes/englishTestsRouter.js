'use strict';

const express = require('express');
const { authMiddleware, adminOrExecutiveMiddleware } = require('../middlewares/auth');
const controller = require('../controllers/englishTestsController');

const router = express.Router();

router.use(authMiddleware, adminOrExecutiveMiddleware);

router.get('/semesters', controller.listSemesters);
router.post('/semesters', controller.createSemester);
router.get('/semesters/:id/summary', controller.getSemesterSummary);
router.get('/semesters/:id/students', controller.getSemesterStudents);
router.get('/semesters/:id/departments', controller.getSemesterDepartmentStats);
router.get('/semesters/:id/cefr-distribution', controller.getSemesterCefrDistribution);
router.get('/semesters/:id/data-quality', controller.getSemesterDataQuality);
router.get('/semesters/:id/import-histories', controller.getSemesterImportHistories);
router.get('/semesters/:id/students/:studentId', controller.getStudentDetail);
router.post('/semesters/:id/rebuild', controller.rebuildSemesterBestSkills);

module.exports = router;
