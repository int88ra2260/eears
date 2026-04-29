'use strict';

const { EtEnrollmentSnapshot } = require('../../models');
const { getStudentsBestSkillsMap, SKILLS } = require('./bestSkillService');

const B2_RANK = 4;

function roundRate(n, d) {
  if (!d) return 0;
  return Number((n / d).toFixed(4));
}

function normStudentId(v) {
  return String(v || '').trim().toUpperCase();
}

function parseGradeNumber(raw) {
  if (raw == null || raw === '') return null;
  const m = String(raw).match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

function resolveCohortGroup(snapshot) {
  const gradeNo = parseGradeNumber(snapshot.grade);
  if (gradeNo != null && gradeNo >= 1 && gradeNo <= 3) return '大一至大三';
  if (gradeNo != null && gradeNo >= 2 && gradeNo <= 4) return '大二至大四';
  return '其他 / 未分組';
}

function resolveGroupValue(snapshot, groupBy) {
  if (groupBy === 'grade') return String(snapshot.grade || '未提供').trim() || '未提供';
  if (groupBy === 'department') return String(snapshot.department || '未提供').trim() || '未提供';
  return resolveCohortGroup(snapshot);
}

/**
 * 名冊內學生之歷史最佳技能中，各技能達 B2+ 人數與比率。
 * @param {string} semesterId
 */
async function getSemesterB2Report(semesterId, opts = {}) {
  const sem = String(semesterId || '').trim();
  if (!sem) {
    return {
      semesterId: sem,
      totalStudents: 0,
      skills: {
        listening: { count: 0, rate: 0 },
        reading: { count: 0, rate: 0 },
        speaking: { count: 0, rate: 0 },
        writing: { count: 0, rate: 0 }
      }
    };
  }

  const snapshots = await EtEnrollmentSnapshot.findAll({
    where: { semesterId: sem, isActive: true },
    attributes: ['studentId']
  });

  const allStudentIds = snapshots.map((r) => normStudentId(r.studentId)).filter(Boolean);
  const hasAllowedFilter = Array.isArray(opts.allowedStudentIds);
  const allowSet = new Set((opts.allowedStudentIds || []).map(normStudentId).filter(Boolean));
  const studentIds = hasAllowedFilter
    ? allStudentIds.filter((sid) => allowSet.has(sid))
    : allStudentIds;
  const totalStudents = studentIds.length;

  const bestMap = await getStudentsBestSkillsMap(studentIds);

  const counts = { listening: 0, reading: 0, speaking: 0, writing: 0 };

  for (const sid of studentIds) {
    const best = bestMap.get(sid) || {};
    for (const sk of SKILLS) {
      const cell = best[sk];
      if (cell && Number(cell.rank) >= B2_RANK) {
        counts[sk] += 1;
      }
    }
  }

  const skills = {};
  for (const sk of SKILLS) {
    skills[sk] = {
      count: counts[sk],
      rate: roundRate(counts[sk], totalStudents)
    };
  }

  return {
    semesterId: sem,
    totalStudents,
    skills
  };
}

/**
 * 依 active enrollment snapshot 分組，計算每組四技能 B2+ 人數與比率。
 * @param {string} semesterId
 * @param {'grade'|'department'|'cohort'} groupBy
 */
async function getSemesterBreakdownReport(semesterId, groupBy, opts = {}) {
  const sem = String(semesterId || '').trim();
  const by = String(groupBy || '').trim().toLowerCase();
  if (!['grade', 'department', 'cohort'].includes(by)) return [];

  const snapshots = await EtEnrollmentSnapshot.findAll({
    where: { semesterId: sem, isActive: true },
    attributes: ['studentId', 'grade', 'department']
  });

  const hasAllowedFilter = Array.isArray(opts.allowedStudentIds);
  const allowSet = new Set((opts.allowedStudentIds || []).map(normStudentId).filter(Boolean));
  const filteredSnapshots = hasAllowedFilter
    ? snapshots.filter((r) => allowSet.has(normStudentId(r.studentId)))
    : snapshots;
  const studentIds = filteredSnapshots.map((r) => normStudentId(r.studentId)).filter(Boolean);
  const bestMap = await getStudentsBestSkillsMap(studentIds);

  const groups = new Map();
  for (const snap of filteredSnapshots) {
    const group = resolveGroupValue(snap, by);
    if (!groups.has(group)) {
      groups.set(group, {
        group,
        totalStudents: 0,
        skills: {
          listening: { count: 0, rate: 0 },
          reading: { count: 0, rate: 0 },
          speaking: { count: 0, rate: 0 },
          writing: { count: 0, rate: 0 }
        }
      });
    }
    const row = groups.get(group);
    row.totalStudents += 1;

    const sid = normStudentId(snap.studentId);
    const best = bestMap.get(sid) || {};
    for (const sk of SKILLS) {
      const cell = best[sk];
      if (cell && Number(cell.rank) >= B2_RANK) row.skills[sk].count += 1;
    }
  }

  const result = [...groups.values()].map((row) => {
    const out = { ...row, skills: { ...row.skills } };
    for (const sk of SKILLS) {
      out.skills[sk] = {
        count: row.skills[sk].count,
        rate: roundRate(row.skills[sk].count, row.totalStudents)
      };
    }
    return out;
  });

  if (by === 'cohort') {
    const order = new Map([
      ['大一至大三', 1],
      ['大二至大四', 2],
      ['其他 / 未分組', 3]
    ]);
    result.sort((a, b) => (order.get(a.group) || 99) - (order.get(b.group) || 99));
    return result;
  }

  result.sort((a, b) => String(a.group).localeCompare(String(b.group)));
  return result;
}

module.exports = {
  getSemesterB2Report,
  getSemesterBreakdownReport
};
