'use strict';

const { Op } = require('sequelize');
const { EtExamAttempt, EtExamAttemptSkillScore } = require('../../models');
const { getCefrFromRank } = require('./utils/cefr');

const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

function emptyBest() {
  return {
    listening: null,
    reading: null,
    speaking: null,
    writing: null
  };
}

function mergeMaxSkill(best, skill, cefr, rank) {
  if (!skill || !SKILLS.includes(skill)) return;
  const r = rank != null ? Number(rank) : null;
  if (!Number.isFinite(r) || r < 1) return;
  const cur = best[skill];
  if (!cur || r > cur.rank) {
    best[skill] = { cefr: cefr || getCefrFromRank(r), rank: r };
  }
}

function mergeMaxSkillWithSource(best, skill, cefr, rank, sourceExamDate, sourceExamType) {
  if (!skill || !SKILLS.includes(skill)) return;
  const r = rank != null ? Number(rank) : null;
  if (!Number.isFinite(r) || r < 1) return;
  const cur = best[skill];
  const nextDate = sourceExamDate ? String(sourceExamDate) : '';
  if (!cur) {
    best[skill] = {
      cefr: cefr || getCefrFromRank(r),
      rank: r,
      sourceExamDate: nextDate || null,
      sourceExamType: sourceExamType || null
    };
    return;
  }

  const curDate = cur.sourceExamDate ? String(cur.sourceExamDate) : '';
  const shouldReplace = r > cur.rank || (r === cur.rank && nextDate > curDate);
  if (shouldReplace) {
    best[skill] = {
      cefr: cefr || getCefrFromRank(r),
      rank: r,
      sourceExamDate: nextDate || null,
      sourceExamType: sourceExamType || null
    };
  }
}

/**
 * 跨學期、跨檢定類型：取每 skill 最高 cefrRank。
 * @param {string} studentId
 */
async function getStudentBestSkills(studentId) {
  const sid = String(studentId || '').trim().toUpperCase();
  if (!sid) {
    return { ...emptyBest() };
  }

  const attempts = await EtExamAttempt.findAll({
    where: { studentId: sid, status: 'valid' },
    include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }]
  });

  const best = emptyBest();
  for (const att of attempts) {
    const rows = att.skillScores || [];
    for (const row of rows) {
      const j = typeof row.toJSON === 'function' ? row.toJSON() : row;
      const skill = j.skill;
      mergeMaxSkill(best, skill, j.cefr, j.cefrRank);
    }
  }
  return best;
}

/**
 * 與 getStudentBestSkills 相同，但附來源考試日期/類別。
 * 同 rank 時採較新 examDate。
 * @param {string} studentId
 */
async function getStudentBestSkillsWithSource(studentId) {
  const sid = String(studentId || '').trim().toUpperCase();
  const best = emptyBest();
  if (!sid) return best;

  const attempts = await EtExamAttempt.findAll({
    where: { studentId: sid, status: 'valid' },
    include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }]
  });

  for (const att of attempts) {
    const examDate = att.testDate || att.examDate || null;
    const examType = att.testType || att.examType || att.sourceType || att.source || null;
    for (const row of att.skillScores || []) {
      const j = typeof row.toJSON === 'function' ? row.toJSON() : row;
      mergeMaxSkillWithSource(best, j.skill, j.cefr, j.cefrRank, examDate, examType);
    }
  }
  return best;
}

/**
 * @param {string[]} studentIds
 * @returns {Promise<Map<string, ReturnType<typeof emptyBest>>>}
 */
async function getStudentsBestSkillsMap(studentIds) {
  const ids = [...new Set((studentIds || []).map((s) => String(s || '').trim().toUpperCase()).filter(Boolean))];
  const map = new Map();
  for (const id of ids) map.set(id, emptyBest());

  if (!ids.length) return map;

  const attempts = await EtExamAttempt.findAll({
    where: { studentId: { [Op.in]: ids }, status: 'valid' },
    include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }]
  });

  for (const att of attempts) {
    const sid = String(att.studentId || '').trim().toUpperCase();
    if (!map.has(sid)) continue;
    const best = map.get(sid) || emptyBest();
    for (const row of att.skillScores || []) {
      const j = typeof row.toJSON === 'function' ? row.toJSON() : row;
      mergeMaxSkill(best, j.skill, j.cefr, j.cefrRank);
    }
    map.set(sid, best);
  }
  return map;
}

module.exports = {
  getStudentBestSkills,
  getStudentBestSkillsWithSource,
  getStudentsBestSkillsMap,
  SKILLS
};
