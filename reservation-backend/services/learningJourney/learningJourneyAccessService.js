'use strict';

const { Op } = require('sequelize');
const { Course, CourseEnrollment } = require('../../models');

function norm(v) {
  return String(v || '').trim();
}

function normLower(v) {
  return norm(v).toLowerCase();
}

function normSid(v) {
  return norm(v).toUpperCase();
}

function isAdmin(user) {
  return String(user?.role || '').toLowerCase() === 'admin';
}

function isExecutive(user) {
  return String(user?.role || '').toLowerCase() === 'teacher'
    && String(user?.teacherLevel || '').toLowerCase() === 'executive';
}

function isTeacher(user) {
  return String(user?.role || '').toLowerCase() === 'teacher' && !isExecutive(user);
}

async function getTeacherAllowedStudentsBySemester(user, semesterId) {
  const teacherName = normLower(user?.name);
  if (!teacherName) return { courseIds: [], allowedStudentIds: [] };

  const rows = await Course.findAll({
    where: { semesterId: norm(semesterId) },
    include: [{
      model: CourseEnrollment,
      as: 'enrollments',
      required: true,
      where: {
        semesterId: norm(semesterId),
        enrollmentStatus: { [Op.in]: ['enrolled', 'completed'] }
      },
      attributes: ['courseId', 'studentId']
    }],
    attributes: ['id', 'instructorName']
  });

  const courseIds = new Set();
  const studentIds = new Set();
  for (const course of rows) {
    if (normLower(course.instructorName) !== teacherName) continue;
    courseIds.add(Number(course.id));
    for (const e of course.enrollments || []) {
      const sid = normSid(e.studentId);
      if (sid) studentIds.add(sid);
    }
  }
  return { courseIds: [...courseIds], allowedStudentIds: [...studentIds] };
}

async function getUserLearningJourneyScope(user, semesterId) {
  if (isAdmin(user) || isExecutive(user)) return { scope: 'all' };
  if (!isTeacher(user)) return { scope: 'none', semesterId: norm(semesterId), allowedStudentIds: [], courseIds: [] };
  const sem = norm(semesterId);
  const { courseIds, allowedStudentIds } = await getTeacherAllowedStudentsBySemester(user, sem);
  return { scope: 'teacher', semesterId: sem, allowedStudentIds, courseIds };
}

module.exports = {
  getUserLearningJourneyScope,
  isAdmin,
  isExecutive,
  isTeacher
};
