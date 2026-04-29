'use strict';

const express = require('express');
const path = require('path');
const multer = require('multer');
const { authMiddleware, adminOrTeacherMiddleware } = require('../middlewares/auth');
const controller = require('../controllers/learningJourneyV3Controller');

const router = express.Router();

const excelUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) return cb(null, true);
    return cb(new Error('只允許上傳 Excel 檔案 (.xlsx, .xls)'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

router.use(authMiddleware);
router.use(adminOrTeacherMiddleware);

router.get('/semesters/:id/b2-report', controller.getB2Report);
router.get('/semesters/:id/breakdown', controller.getBreakdown);
router.get('/semesters/:id/students', controller.getStudents);
router.get('/students/:studentId/profile', controller.getStudent);
router.get('/students/:studentId/trends', controller.getStudentTrendsHandler);
router.get('/students/:studentId', controller.getStudent);

router.post('/import/enrollment', excelUpload.single('file'), controller.postEnrollmentImport);
router.post('/import/exam', excelUpload.single('file'), controller.postExamImport);

module.exports = router;
