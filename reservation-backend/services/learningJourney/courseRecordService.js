'use strict';

const XLSX = require('xlsx');
const { Op } = require('sequelize');
const {
  sequelize,
  Course,
  CourseEnrollment,
  CourseOutcomeMapping,
  Student
} = require('../../models');
const { normalizeStudentId } = require('./utils/studentNormalization');

const HEADER_ALIASES = {
  semesterId: ['semesterId', 'semester_id', 'semester', '學期'],
  courseCode: ['courseCode', 'course_code', 'code', '課號', '課程代碼', '課程代號'],
  courseName: ['courseName', 'course_name', 'name', '課名', '課程名稱'],
  departmentCode: ['departmentCode', 'department_code', '開課單位代碼', '系所代碼'],
  departmentName: ['departmentName', 'department_name', 'department', '開課單位', '系所', '系所名稱'],
  instructorName: ['instructorName', 'instructor_name', 'teacher', '授課教師', '教師'],
  credits: ['credits', 'credit', '學分'],
  courseType: ['courseType', 'course_type', '課程類型', '類別'],
  studentId: ['studentId', 'student_id', '學號'],
  studentName: ['studentName', 'student_name', '姓名', '學生姓名'],
  enrollmentStatus: ['enrollmentStatus', 'enrollment_status', '修課狀態', '狀態'],
  finalScore: ['finalScore', 'final_score', 'score', '成績', '總成績'],
  passStatus: ['passStatus', 'pass_status', '通過狀態', '是否通過'],
  outcomes: ['outcomes', 'outcomeKeys', 'course_outcomes', '學習成果', '對應能力']
};

function clean(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function pick(row, key) {
  for (const alias of HEADER_ALIASES[key] || []) {
    if (Object.prototype.hasOwnProperty.call(row, alias)) return row[alias];
  }
  return '';
}

function parseNumber(value) {
  const raw = clean(value);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function normalizeEnrollmentStatus(value) {
  const raw = clean(value).toLowerCase();
  if (!raw) return 'enrolled';
  if (['completed', 'complete', '已修', '完成', '修畢'].includes(raw)) return 'completed';
  if (['withdrawn', 'withdraw', '退選', '停修'].includes(raw)) return 'withdrawn';
  if (['failed', 'fail', '不及格', '未通過'].includes(raw)) return 'failed';
  if (['enrolled', '修課中', '選課', '在修'].includes(raw)) return 'enrolled';
  return 'unknown';
}

function normalizePassStatus(value, finalScore) {
  const raw = clean(value).toLowerCase();
  if (['passed', 'pass', '通過', '是', 'y', 'yes'].includes(raw)) return 'passed';
  if (['failed', 'fail', '未通過', '否', 'n', 'no'].includes(raw)) return 'failed';
  if (['in_progress', '修課中', '進行中'].includes(raw)) return 'in_progress';
  if (typeof finalScore === 'number') return finalScore >= 60 ? 'passed' : 'failed';
  return 'unknown';
}

function normalizeOutcomes(value) {
  const raw = clean(value);
  if (!raw) return [];
  return raw
    .split(/[;,，、]/)
    .map((x) => clean(x))
    .filter(Boolean);
}

function parseRowsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
}

function normalizeCourseImportRow(row, rowNumber) {
  const finalScore = parseNumber(pick(row, 'finalScore'));
  const normalized = {
    rowNumber,
    semesterId: clean(pick(row, 'semesterId')),
    courseCode: clean(pick(row, 'courseCode')).toUpperCase(),
    courseName: clean(pick(row, 'courseName')),
    departmentCode: clean(pick(row, 'departmentCode')),
    departmentName: clean(pick(row, 'departmentName')),
    instructorName: clean(pick(row, 'instructorName')),
    credits: parseNumber(pick(row, 'credits')),
    courseType: clean(pick(row, 'courseType')),
    studentId: normalizeStudentId(pick(row, 'studentId')),
    studentName: clean(pick(row, 'studentName')),
    enrollmentStatus: normalizeEnrollmentStatus(pick(row, 'enrollmentStatus')),
    finalScore,
    passStatus: normalizePassStatus(pick(row, 'passStatus'), finalScore),
    outcomes: normalizeOutcomes(pick(row, 'outcomes')),
    raw: row
  };

  const errors = [];
  if (!normalized.semesterId) errors.push('缺少學期');
  if (!normalized.courseCode) errors.push('缺少課號');
  if (!normalized.courseName) errors.push('缺少課名');
  if (!normalized.studentId) errors.push('缺少學號');
  if (clean(pick(row, 'credits')) && normalized.credits === null) errors.push('學分格式不正確');
  if (clean(pick(row, 'finalScore')) && normalized.finalScore === null) errors.push('成績格式不正確');

  return { ...normalized, errors };
}

function courseKey(row) {
  return `${row.semesterId}::${row.courseCode}`;
}

function enrollmentKey(row) {
  return `${courseKey(row)}::${row.studentId}`;
}

function hasCourseDiff(existing, row) {
  if (!existing) return false;
  const fields = ['courseName', 'departmentCode', 'departmentName', 'instructorName', 'courseType'];
  return fields.some((field) => clean(existing[field]) !== clean(row[field])) ||
    Number(existing.credits || 0) !== Number(row.credits || 0);
}

function hasEnrollmentDiff(existing, row) {
  if (!existing) return false;
  return (
    clean(existing.studentName) !== clean(row.studentName) ||
    clean(existing.enrollmentStatus) !== clean(row.enrollmentStatus) ||
    clean(existing.passStatus) !== clean(row.passStatus) ||
    Number(existing.finalScore || 0) !== Number(row.finalScore || 0)
  );
}

async function getExistingContext(validRows) {
  const semesters = [...new Set(validRows.map((r) => r.semesterId).filter(Boolean))];
  const courseCodes = [...new Set(validRows.map((r) => r.courseCode).filter(Boolean))];
  const studentIds = [...new Set(validRows.map((r) => r.studentId).filter(Boolean))];

  if (!validRows.length) {
    return { coursesByKey: new Map(), enrollmentsByKey: new Map(), studentsById: new Map() };
  }

  const [courses, enrollments, students] = await Promise.all([
    Course.findAll({
      where: {
        semesterId: { [Op.in]: semesters },
        courseCode: { [Op.in]: courseCodes }
      }
    }),
    CourseEnrollment.findAll({
      where: {
        semesterId: { [Op.in]: semesters },
        studentId: { [Op.in]: studentIds }
      },
      include: [{ model: Course, as: 'course', required: true }]
    }),
    Student.findAll({ where: { studentId: { [Op.in]: studentIds } } })
  ]);

  const coursesByKey = new Map();
  for (const course of courses) {
    coursesByKey.set(`${course.semesterId}::${course.courseCode}`, course);
  }

  const enrollmentsByKey = new Map();
  for (const enrollment of enrollments) {
    const course = enrollment.course;
    if (!course) continue;
    enrollmentsByKey.set(`${course.semesterId}::${course.courseCode}::${enrollment.studentId}`, enrollment);
  }

  const studentsById = new Map();
  for (const student of students) {
    studentsById.set(student.studentId, student);
  }

  return { coursesByKey, enrollmentsByKey, studentsById };
}

async function dryRunCourseImport({ rows, fileBuffer, sourceFile = '' }) {
  const rawRows = Array.isArray(rows) ? rows : parseRowsFromWorkbook(fileBuffer);
  const normalizedRows = rawRows.map((row, idx) => normalizeCourseImportRow(row, idx + 2));
  const invalidRows = normalizedRows.filter((row) => row.errors.length);
  const validRows = normalizedRows.filter((row) => !row.errors.length);

  const seenEnrollmentKeys = new Set();
  const duplicateRows = [];
  const uniqueValidRows = [];
  for (const row of validRows) {
    const key = enrollmentKey(row);
    if (seenEnrollmentKeys.has(key)) {
      duplicateRows.push({
        rowNumber: row.rowNumber,
        key,
        message: '檔案內重複的學期 + 課號 + 學號'
      });
      continue;
    }
    seenEnrollmentKeys.add(key);
    uniqueValidRows.push(row);
  }

  const { coursesByKey, enrollmentsByKey, studentsById } = await getExistingContext(uniqueValidRows);
  const courseKeys = new Set();
  const outcomeKeys = new Set();
  const summary = {
    dryRun: true,
    sourceFile,
    inputRows: rawRows.length,
    validRows: uniqueValidRows.length,
    invalidRows: invalidRows.length,
    duplicateRows: duplicateRows.length,
    wouldCreateCourses: 0,
    wouldUpdateCourses: 0,
    unchangedCourses: 0,
    wouldCreateEnrollments: 0,
    wouldUpdateEnrollments: 0,
    unchangedEnrollments: 0,
    unknownStudents: 0,
    wouldCreateOutcomeMappings: 0
  };

  for (const row of uniqueValidRows) {
    const cKey = courseKey(row);
    if (!courseKeys.has(cKey)) {
      courseKeys.add(cKey);
      const existingCourse = coursesByKey.get(cKey);
      if (!existingCourse) summary.wouldCreateCourses += 1;
      else if (hasCourseDiff(existingCourse, row)) summary.wouldUpdateCourses += 1;
      else summary.unchangedCourses += 1;
    }

    const existingEnrollment = enrollmentsByKey.get(enrollmentKey(row));
    if (!existingEnrollment) summary.wouldCreateEnrollments += 1;
    else if (hasEnrollmentDiff(existingEnrollment, row)) summary.wouldUpdateEnrollments += 1;
    else summary.unchangedEnrollments += 1;

    if (!studentsById.has(row.studentId)) summary.unknownStudents += 1;

    for (const outcome of row.outcomes) {
      const key = `${cKey}::${outcome}`;
      if (!outcomeKeys.has(key)) {
        outcomeKeys.add(key);
        summary.wouldCreateOutcomeMappings += 1;
      }
    }
  }

  return {
    ...summary,
    samples: {
      invalidRows: invalidRows.slice(0, 20).map((row) => ({
        rowNumber: row.rowNumber,
        studentId: row.studentId,
        courseCode: row.courseCode,
        errors: row.errors
      })),
      duplicateRows: duplicateRows.slice(0, 20),
      validRows: uniqueValidRows.slice(0, 10).map((row) => ({
        rowNumber: row.rowNumber,
        semesterId: row.semesterId,
        courseCode: row.courseCode,
        courseName: row.courseName,
        studentId: row.studentId,
        studentName: row.studentName,
        enrollmentStatus: row.enrollmentStatus,
        passStatus: row.passStatus
      }))
    }
  };
}

async function applyCourseImport({ rows, fileBuffer, sourceFile = '', actor = null }) {
  const rawRows = Array.isArray(rows) ? rows : parseRowsFromWorkbook(fileBuffer);
  const normalizedRows = rawRows.map((row, idx) => normalizeCourseImportRow(row, idx + 2));
  const invalidRows = normalizedRows.filter((row) => row.errors.length);
  const validRows = normalizedRows.filter((row) => !row.errors.length);

  const seenEnrollmentKeys = new Set();
  const duplicateRows = [];
  const uniqueValidRows = [];
  for (const row of validRows) {
    const key = enrollmentKey(row);
    if (seenEnrollmentKeys.has(key)) {
      duplicateRows.push({
        rowNumber: row.rowNumber,
        key,
        message: '檔案內重複的學期 + 課號 + 學號'
      });
      continue;
    }
    seenEnrollmentKeys.add(key);
    uniqueValidRows.push(row);
  }

  if (invalidRows.length || duplicateRows.length) {
    const preview = await dryRunCourseImport({ rows: rawRows, sourceFile });
    return {
      ...preview,
      dryRun: false,
      applied: false,
      error: '修課匯入含錯誤或重複列，請先修正後再 apply'
    };
  }

  const summary = {
    dryRun: false,
    applied: true,
    sourceFile,
    inputRows: rawRows.length,
    validRows: uniqueValidRows.length,
    createdCourses: 0,
    updatedCourses: 0,
    createdEnrollments: 0,
    updatedEnrollments: 0,
    unchangedEnrollments: 0,
    createdOutcomeMappings: 0,
    updatedOutcomeMappings: 0,
    unknownStudents: 0
  };

  const sourceRef = sourceFile ? `course_import:${sourceFile}` : 'course_import:manual';
  const nowIso = new Date().toISOString();
  const touchedCourseIds = new Set();

  await sequelize.transaction(async (transaction) => {
    for (const row of uniqueValidRows) {
      let course = await Course.findOne({
        where: { semesterId: row.semesterId, courseCode: row.courseCode },
        transaction
      });

      const coursePayload = {
        semesterId: row.semesterId,
        courseCode: row.courseCode,
        courseName: row.courseName,
        departmentCode: row.departmentCode || null,
        departmentName: row.departmentName || null,
        instructorName: row.instructorName || null,
        credits: row.credits,
        courseType: row.courseType || null,
        sourceRef,
        metaJson: {
          lastImportAt: nowIso,
          lastImportSourceFile: sourceFile || null,
          actor
        }
      };

      if (!course) {
        course = await Course.create(coursePayload, { transaction });
        summary.createdCourses += 1;
      } else if (!touchedCourseIds.has(course.id) && hasCourseDiff(course, row)) {
        await course.update(coursePayload, { transaction });
        summary.updatedCourses += 1;
      }
      touchedCourseIds.add(course.id);

      const student = await Student.findOne({ where: { studentId: row.studentId }, transaction });
      if (!student) summary.unknownStudents += 1;

      const enrollmentPayload = {
        courseId: course.id,
        studentPk: student ? student.id : null,
        studentId: row.studentId,
        studentName: row.studentName || null,
        semesterId: row.semesterId,
        enrollmentStatus: row.enrollmentStatus,
        finalScore: row.finalScore,
        passStatus: row.passStatus,
        sourceRef,
        rawPayload: {
          importRowNumber: row.rowNumber,
          sourceFile: sourceFile || null,
          raw: row.raw
        }
      };

      const enrollment = await CourseEnrollment.findOne({
        where: { courseId: course.id, studentId: row.studentId },
        transaction
      });

      if (!enrollment) {
        await CourseEnrollment.create(enrollmentPayload, { transaction });
        summary.createdEnrollments += 1;
      } else if (hasEnrollmentDiff(enrollment, row)) {
        await enrollment.update(enrollmentPayload, { transaction });
        summary.updatedEnrollments += 1;
      } else {
        summary.unchangedEnrollments += 1;
      }

      for (const outcomeKey of row.outcomes) {
        const existingOutcome = await CourseOutcomeMapping.findOne({
          where: { courseId: course.id, outcomeKey },
          transaction
        });
        const outcomePayload = {
          courseId: course.id,
          outcomeKey,
          outcomeLabel: outcomeKey,
          outcomeType: 'other',
          targetLevel: null,
          weight: null,
          metaJson: {
            lastImportAt: nowIso,
            lastImportSourceFile: sourceFile || null
          }
        };
        if (!existingOutcome) {
          await CourseOutcomeMapping.create(outcomePayload, { transaction });
          summary.createdOutcomeMappings += 1;
        } else {
          await existingOutcome.update(outcomePayload, { transaction });
          summary.updatedOutcomeMappings += 1;
        }
      }
    }
  });

  return summary;
}

async function getStudentCourses(studentIdRaw, options = {}) {
  const studentId = normalizeStudentId(studentIdRaw);
  const semesterId = clean(options.semesterId);
  if (!studentId) return { error: 'studentId 為必填' };

  const where = { studentId };
  if (semesterId) where.semesterId = semesterId;

  const rows = await CourseEnrollment.findAll({
    where,
    include: [
      {
        model: Course,
        as: 'course',
        required: true,
        include: [{ model: CourseOutcomeMapping, as: 'outcomeMappings', required: false }]
      }
    ],
    order: [
      ['semesterId', 'DESC'],
      [{ model: Course, as: 'course' }, 'courseCode', 'ASC'],
      ['id', 'ASC']
    ]
  });

  const courses = rows.map((row) => {
    const json = row.toJSON();
    const course = json.course || {};
    return {
      enrollmentId: json.id,
      studentId: json.studentId,
      studentName: json.studentName,
      semesterId: json.semesterId,
      enrollmentStatus: json.enrollmentStatus,
      finalScore: json.finalScore,
      passStatus: json.passStatus,
      sourceRef: json.sourceRef,
      course: {
        id: course.id,
        semesterId: course.semesterId,
        courseCode: course.courseCode,
        courseName: course.courseName,
        departmentCode: course.departmentCode,
        departmentName: course.departmentName,
        instructorName: course.instructorName,
        credits: course.credits,
        courseType: course.courseType,
        outcomes: (course.outcomeMappings || []).map((outcome) => ({
          outcomeKey: outcome.outcomeKey,
          outcomeLabel: outcome.outcomeLabel,
          outcomeType: outcome.outcomeType,
          targetLevel: outcome.targetLevel,
          weight: outcome.weight
        }))
      }
    };
  });

  return {
    studentId,
    semesterId: semesterId || null,
    total: courses.length,
    courses
  };
}

module.exports = {
  dryRunCourseImport,
  applyCourseImport,
  getStudentCourses
};
