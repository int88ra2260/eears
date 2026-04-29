// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
/**
 * @deprecated
 * Will be removed after Learning Journey v3 fully replaces legacy tracking.
 */
const {
  EtSemester,
  EtEnrollmentSnapshot,
  EtSemesterStudentBestSkill,
  EtExamAttempt,
  EtStudentMaster,
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const { getCefrRankMap } = require('./cefrService');

const SKILLS = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];

function buildSummaryCounts({ enrollments, bestSkills, rankMap, threshold }) {
  const rankThreshold = rankMap[threshold] || 4;
  const activeStudentIds = new Set(enrollments.map((e) => e.studentId));
  const validBestStudents = new Set();
  const attainedStudents = new Set();

  for (const bs of bestSkills) {
    if (!activeStudentIds.has(bs.studentId)) continue;
    validBestStudents.add(bs.studentId);
    if ((rankMap[bs.cefr] || 0) >= rankThreshold) {
      attainedStudents.add(bs.studentId);
    }
  }

  return {
    rosterActiveStudentCount: activeStudentIds.size,
    validBestScoreStudentCount: validBestStudents.size,
    attainedStudentCount: attainedStudents.size
  };
}

/**
 * 學期 × 年級 × 技能 摘要
 * 學生集合以 EnrollmentSnapshot(semesterId, isActive=true) 為準
 * @param {string} semesterId
 * @param {object} options - { metric: 'avg'|'count'|'cefr'|'attainment', threshold: 'B2', includeTotal: boolean }
 * @returns {Promise<object>}
 */
async function getGradeSkillSummary(semesterId, options = {}) {
  const metric = options.metric || 'avg';
  const threshold = options.threshold || 'B2';
  const includeTotal = options.includeTotal !== false;

  const enrollments = await EtEnrollmentSnapshot.findAll({
    where: { semesterId, isActive: true },
    attributes: ['studentId', 'grade']
  });

  const gradeOrder = [...new Set(enrollments.map(e => e.grade).filter(Boolean))].sort();
  const studentToGrade = {};
  enrollments.forEach(e => { studentToGrade[e.studentId] = e.grade || ''; });

  const bestSkills = await EtSemesterStudentBestSkill.findAll({
    where: { semesterId },
    include: [{ model: EtExamAttempt, as: 'bestAttempt', attributes: ['id', 'testDate', 'testType'] }]
  });

  const byGradeSkill = {};
  const add = (grade, skill, payload) => {
    if (!byGradeSkill[grade]) byGradeSkill[grade] = {};
    if (!byGradeSkill[grade][skill]) byGradeSkill[grade][skill] = { count: 0, sum: 0, cefrCount: {}, students: [] };
    const t = byGradeSkill[grade][skill];
    t.count += 1;
    if (payload.rawScore != null) t.sum += Number(payload.rawScore);
    if (payload.cefr) {
      t.cefrCount[payload.cefr] = (t.cefrCount[payload.cefr] || 0) + 1;
    }
    if (payload.studentId && !t.students.includes(payload.studentId)) {
      t.students.push(payload.studentId);
    }
  };

  for (const bs of bestSkills) {
    const grade = studentToGrade[bs.studentId];
    if (grade === undefined) continue;
    add(grade, bs.skill, {
      rawScore: bs.rawScore,
      cefr: bs.cefr,
      studentId: bs.studentId,
      attemptId: bs.attemptId
    });
  }

  const grades = includeTotal ? [...gradeOrder, '_total'] : gradeOrder;
  const rows = [];

  const rankMap = await getCefrRankMap();
  const rankThreshold = rankMap[threshold] || 4;
  const summaryCounts = buildSummaryCounts({
    enrollments,
    bestSkills,
    rankMap,
    threshold
  });

  for (const grade of grades) {
    const row = { grade: grade === '_total' ? '總計' : grade };
    for (const skill of SKILLS) {
      let cell;
      if (grade === '_total') {
        const totalCount = Object.values(byGradeSkill).reduce((acc, g) => {
          const s = g[skill];
          return acc + (s ? s.count : 0);
        }, 0);
        const totalSum = Object.values(byGradeSkill).reduce((acc, g) => {
          const s = g[skill];
          return acc + (s ? s.sum : 0);
        }, 0);
        const totalCefr = {};
        Object.values(byGradeSkill).forEach(g => {
          const s = g[skill];
          if (s && s.cefrCount) {
            Object.entries(s.cefrCount).forEach(([c, n]) => { totalCefr[c] = (totalCefr[c] || 0) + n; });
          }
        });
        if (metric === 'count') cell = totalCount;
        else if (metric === 'avg') cell = totalCount ? Math.round((totalSum / totalCount) * 100) / 100 : null;
        else if (metric === 'cefr') cell = totalCefr;
        else if (metric === 'attainment') {
          cell = Object.entries(totalCefr).reduce((acc, [cefr, n]) => ((rankMap[cefr] || 0) >= rankThreshold ? acc + n : acc), 0);
        } else cell = null;
      } else {
        const t = byGradeSkill[grade] && byGradeSkill[grade][skill];
        if (!t) {
          cell = metric === 'count' ? 0 : null;
        } else if (metric === 'count') {
          cell = t.count;
        } else if (metric === 'avg') {
          cell = t.count ? Math.round((t.sum / t.count) * 100) / 100 : null;
        } else if (metric === 'cefr') {
          cell = t.cefrCount || {};
        } else if (metric === 'attainment') {
          let count = 0;
          for (const [cefr, c] of Object.entries(t.cefrCount || {})) {
            if ((rankMap[cefr] || 0) >= rankThreshold) count += c;
          }
          cell = count;
        } else {
          cell = null;
        }
      }
      row[skill] = cell;
    }
    rows.push(row);
  }

  return {
    semesterId,
    metric,
    threshold: metric === 'attainment' ? threshold : undefined,
    rosterActiveStudentCount: summaryCounts.rosterActiveStudentCount,
    validBestScoreStudentCount: summaryCounts.validBestScoreStudentCount,
    attainedStudentCount: summaryCounts.attainedStudentCount,
    grades: gradeOrder,
    skills: SKILLS,
    rows
  };
}

/**
 * Drill-down：某學期、某年級、某技能的學生名單（含最佳 attempt、分數、CEFR）
 */
async function getGradeSkillDrilldown(semesterId, grade, skill) {
  const enrollments = await EtEnrollmentSnapshot.findAll({
    where: { semesterId, isActive: true, grade }
  });
  const studentIds = enrollments.map(e => e.studentId);

  const bestSkills = await EtSemesterStudentBestSkill.findAll({
    where: { semesterId, skill, studentId: { [Op.in]: studentIds } },
    include: [{ model: EtExamAttempt, as: 'bestAttempt', attributes: ['id', 'testDate', 'testType'] }]
  });

  const students = await EtStudentMaster.findAll({
    where: { studentId: { [Op.in]: studentIds } },
    attributes: ['studentId', 'name', 'college', 'dept']
  });
  const studentMap = {};
  students.forEach(s => { studentMap[s.studentId] = s; });

  return bestSkills.map(bs => ({
    studentId: bs.studentId,
    name: studentMap[bs.studentId]?.name || null,
    college: studentMap[bs.studentId]?.college || null,
    dept: studentMap[bs.studentId]?.dept || null,
    skill: bs.skill,
    rawScore: bs.rawScore,
    cefr: bs.cefr,
    attemptId: bs.attemptId,
    testDate: bs.bestAttempt?.testDate || null,
    testType: bs.bestAttempt?.testType || null
  }));
}

module.exports = {
  getGradeSkillSummary,
  getGradeSkillDrilldown,
  SKILLS
};
