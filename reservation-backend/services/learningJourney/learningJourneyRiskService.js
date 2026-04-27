'use strict';

const { Op } = require('sequelize');
const {
  StudentSemesterProfile,
  ExamAttempt,
  ExamRegistration,
  ActivityParticipation
} = require('../../models');
const { isValidSemesterId } = require('./reconciliationService');

function normId(v) {
  return String(v || '').trim().toUpperCase();
}

function pushReason(reasons, code, message, score) {
  reasons.push({ code, message, score: Number(score || 0) });
}

async function getRiskStudentsBySemester(semesterIdRaw) {
  const semesterId = String(semesterIdRaw || '').trim();
  if (!isValidSemesterId(semesterId)) {
    return { semesterId, status: 'error', error: 'semesterId 格式不正確', items: [] };
  }

  const rosterRows = await StudentSemesterProfile.findAll({
    where: { semesterId, isRostered: true },
    attributes: ['studentPk', 'studentId', 'attemptCount', 'bestAttained']
  });
  const studentPks = rosterRows.map((r) => r.studentPk);
  if (!studentPks.length) {
    return {
      semesterId,
      status: 'ok',
      items: [],
      metrics: { rosterCount: 0, riskCount: 0, riskRate: 0 }
    };
  }

  const [attemptRows, regRows, activityRows] = await Promise.all([
    ExamAttempt.findAll({
      where: { semesterId, studentPk: { [Op.in]: studentPks }, status: { [Op.ne]: 'invalid' } },
      attributes: ['studentPk', 'id']
    }),
    ExamRegistration.findAll({
      where: { semesterId, studentPk: { [Op.in]: studentPks } },
      attributes: ['studentPk', 'status']
    }),
    ActivityParticipation.findAll({
      where: { semesterId, studentPk: { [Op.in]: studentPks } },
      attributes: ['studentPk', 'attendanceStatus']
    })
  ]);

  const attemptCountByPk = new Map();
  for (const r of attemptRows) {
    attemptCountByPk.set(r.studentPk, (attemptCountByPk.get(r.studentPk) || 0) + 1);
  }
  const regByPk = new Map();
  for (const r of regRows) {
    const list = regByPk.get(r.studentPk) || [];
    list.push(r.status);
    regByPk.set(r.studentPk, list);
  }
  const actByPk = new Map();
  for (const r of activityRows) {
    const list = actByPk.get(r.studentPk) || [];
    list.push(r.attendanceStatus);
    actByPk.set(r.studentPk, list);
  }

  const items = [];
  for (const row of rosterRows) {
    const sid = normId(row.studentId);
    const attempts = Number(attemptCountByPk.get(row.studentPk) || row.attemptCount || 0);
    const bestAttained = !!row.bestAttained;
    const regs = regByPk.get(row.studentPk) || [];
    const acts = actByPk.get(row.studentPk) || [];
    const reasons = [];

    if (attempts === 0) {
      pushReason(reasons, 'NO_EXAM_ATTEMPT', '無任何英檢紀錄', 4);
    }
    if (attempts >= 2 && !bestAttained) {
      pushReason(reasons, 'MULTI_NOT_ATTAINED', '多次應試仍未達標', 3);
    }
    const attendedCount = acts.filter((s) => s === 'attended').length;
    const activityLow = acts.length === 0 || attendedCount / Math.max(acts.length, 1) < 0.3;
    if (activityLow) {
      pushReason(reasons, 'LOW_ACTIVITY_PARTICIPATION', '活動參與偏低', 2);
    }
    const hasReg = regs.length > 0;
    const hasAttempt = attempts > 0;
    if (hasReg && !hasAttempt) {
      pushReason(reasons, 'REGISTERED_BUT_NO_ATTEMPT', '已報名但查無出席/應試紀錄', 2);
    }

    if (reasons.length > 0) {
      const riskScore = reasons.reduce((sum, r) => sum + Number(r.score || 0), 0);
      items.push({
        semesterId,
        studentId: sid,
        studentPk: row.studentPk,
        attemptCount: attempts,
        bestAttained,
        registrationCount: regs.length,
        activityCount: acts.length,
        attendedActivityCount: attendedCount,
        riskScore,
        reasons
      });
    }
  }

  items.sort((a, b) => b.riskScore - a.riskScore || a.studentId.localeCompare(b.studentId));
  return {
    semesterId,
    status: 'ok',
    items,
    metrics: {
      rosterCount: rosterRows.length,
      riskCount: items.length,
      riskRate: Number((items.length / Math.max(rosterRows.length, 1)).toFixed(4))
    },
    source: 'learning_journey_v3'
  };
}

module.exports = {
  getRiskStudentsBySemester
};
