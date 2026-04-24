// services/bestepClassService.js
const { 
  Class, 
  ClassMembership, 
  EnglishTestRegistration,
  LearningPartnerTeam,
  LearningPartnerTeamMember,
  BestepAttendance,
  BestepExamScore,
  BestepTeamRanking
} = require('../models');
const { Op } = require('sequelize');
const {
  pickLatestRegistrationPerStudent,
  computeExemptionDisplayType,
  formatExamTypeLabel
} = require('../utils/exemptionUtils');

/**
 * 取得班級 BESTEP 概況
 * @param {number} classId - 班級 ID
 * @param {string} semester - 學期
 * @param {string} examType - 考試類型：'LR' | 'SW' | 'all'
 * @param {object} filters - 篩選條件
 * @returns {Promise<object>}
 */
async function getClassBestepOverview(classId, semester, examType = 'all', filters = {}) {
  const { page = 1, pageSize = 50, search = '' } = filters;

  const buildExamTypeFilter = (type) => {
    if (!type || type === 'all') return null;
    if (type === 'LR') return ['LR', 'LRSW'];
    if (type === 'SW') return ['SW', 'LRSW'];
    return [type];
  };

  // 1. 取得班級資訊
  const classInfo = await Class.findByPk(classId);
  if (!classInfo) {
    throw new Error('班級不存在');
  }

  // 2. 取得班級學生列表
  const whereClause = {
    classId,
    semester
  };

  if (search) {
    whereClause[Op.or] = [
      { studentId: { [Op.like]: `%${search}%` } },
      { studentName: { [Op.like]: `%${search}%` } }
    ];
  }

  const { count: totalStudents, rows: memberships } = await ClassMembership.findAndCountAll({
    where: whereClause,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [['studentId', 'ASC']]
  });

  const studentIds = memberships.map(m => m.studentId);

  // 3. 個人報名：同學期可能多筆，取每學號 updatedAt 最新一筆，再依考試類型篩選
  const registrationExamTypes = buildExamTypeFilter(examType);

  const allRegsForStudents = studentIds.length === 0 ? [] : await EnglishTestRegistration.findAll({
    where: {
      studentId: { [Op.in]: studentIds },
      semester
    },
    order: [['updatedAt', 'DESC'], ['id', 'DESC']]
  });

  const latestByStudent = pickLatestRegistrationPerStudent(allRegsForStudents);

  const matchesExamFilter = (reg) => {
    if (!registrationExamTypes || !reg) return true;
    return registrationExamTypes.includes(reg.examType);
  };

  const registrationsMap = {};
  studentIds.forEach((sid) => {
    const reg = latestByStudent[sid];
    if (!reg || !matchesExamFilter(reg)) {
      return;
    }
    registrationsMap[sid] = {
      status: reg.status,
      regId: reg.id,
      examType: reg.examType,
      examTypeLabel: formatExamTypeLabel(reg.examType),
      updatedAt: reg.updatedAt,
      exemptionType: computeExemptionDisplayType(reg),
      exemption_review_status: reg.exemption_review_status || null
    };
  });

  // 供統計：僅計入「該學號最新一筆」且符合考試類型篩選者
  const latestRegsForStats = studentIds
    .map((sid) => latestByStudent[sid])
    .filter((reg) => reg && matchesExamFilter(reg));

  // 4. 批次查詢團體報名資訊
  const teamMembers = await LearningPartnerTeamMember.findAll({
    where: {
      studentId: { [Op.in]: studentIds },
      activeFlag: 1
    },
    include: [{
      model: LearningPartnerTeam,
      as: 'team',
      where: {
        status: 'approved',
        activeFlag: 1
      },
      required: false
    }]
  });

  // 取得團體名次
  const teamIds = [...new Set(teamMembers.map(tm => tm.teamId).filter(id => id))];
  const rankings = teamIds.length > 0 ? await BestepTeamRanking.findAll({
    where: {
      teamId: { [Op.in]: teamIds },
      semester
    }
  }) : [];
  const rankingsMap = {};
  rankings.forEach(r => {
    rankingsMap[r.teamId] = {
      rank: r.rank,
      rewardAmount: r.rewardAmount
    };
  });

  const groupRegistrationsMap = {};
  teamMembers.forEach(tm => {
    if (tm.team && tm.teamId) {
      const ranking = rankingsMap[tm.teamId];
      groupRegistrationsMap[tm.studentId] = {
        teamId: tm.team.id,
        teamName: tm.team.teamName || `隊伍${tm.team.id}`,
        role: tm.isRepresentative ? 'leader' : 'member',
        teamStatus: tm.team.status,
        rank: ranking?.rank || null,
        rewardAmount: ranking?.rewardAmount || null
      };
    }
  });

  // 5. 批次查詢出席狀況
  const attendanceWhere = {
    studentId: { [Op.in]: studentIds },
    semester
  };
  if (examType !== 'all') {
    attendanceWhere.examType = examType;
  }

  const attendances = await BestepAttendance.findAll({
    where: attendanceWhere
  });

  const attendanceMap = {};
  attendances.forEach(att => {
    if (!attendanceMap[att.studentId]) {
      attendanceMap[att.studentId] = {};
    }
    attendanceMap[att.studentId][att.examType] = {
      attended: att.attended,
      examDate: att.examDate,
      absentReason: att.absentReason
    };
  });

  // 6. 批次查詢成績
  const scores = await BestepExamScore.findAll({
    where: {
      studentId: { [Op.in]: studentIds },
      semester
    }
  });
  const scoresMap = {};
  scores.forEach(score => {
    scoresMap[score.studentId] = {
      listeningScore: score.listeningScore,
      readingScore: score.readingScore,
      speakingScore: score.speakingScore,
      writingScore: score.writingScore,
      listeningLevel: score.listeningLevel,
      readingLevel: score.readingLevel,
      speakingLevel: score.speakingLevel,
      writingLevel: score.writingLevel,
      totalScore: score.totalScore,
      overallLevel: score.overallLevel,
      passed: score.passed
    };
  });

  // 7. 組合學生資料
  const students = memberships.map(membership => {
    const studentId = membership.studentId;
    return {
      studentId,
      studentName: membership.studentName,
      department: membership.department,
      email: membership.email,
      grade: membership.grade,
      personalRegistration: registrationsMap[studentId] || null,
      groupRegistration: groupRegistrationsMap[studentId] || null,
      attendance: attendanceMap[studentId] || {},
      score: scoresMap[studentId] || null
    };
  });

  // 8. 計算統計（沿用原邏輯；報名成功數改為「最新一筆」且符合考試篩選）
  const registeredCount = latestRegsForStats.filter(reg => reg.status === 'success').length;
  const registrationRate = totalStudents > 0 ? (registeredCount / totalStudents * 100).toFixed(2) : 0;

  // LR 出席統計
  const lrAttendances = attendances.filter(a => a.examType === 'LR');
  const lrAttendedCount = lrAttendances.filter(a => a.attended).length;
  const lrAttendanceRate = registeredCount > 0 ? (lrAttendedCount / registeredCount * 100).toFixed(2) : 0;

  // SW 出席統計
  const swAttendances = attendances.filter(a => a.examType === 'SW');
  const swAttendedCount = swAttendances.filter(a => a.attended).length;
  const swAttendanceRate = registeredCount > 0 ? (swAttendedCount / registeredCount * 100).toFixed(2) : 0;

  // 達標統計
  const passedScores = scores.filter(s => s.passed);
  const passedCount = passedScores.length;
  const totalAttended = Math.max(lrAttendedCount, swAttendedCount); // 至少參加一場
  const passRate = totalAttended > 0 ? (passedCount / totalAttended * 100).toFixed(2) : 0;

  // 平均分
  const totalScores = scores.map(s => parseFloat(s.totalScore)).filter(s => !isNaN(s));
  const avgScore = totalScores.length > 0 
    ? (totalScores.reduce((a, b) => a + b, 0) / totalScores.length).toFixed(2)
    : null;

  // 團體報名統計
  const groupRegisteredCount = Object.keys(groupRegistrationsMap).length;
  const groupRegistrationRate = totalStudents > 0 
    ? (groupRegisteredCount / totalStudents * 100).toFixed(2) 
    : 0;

  return {
    classInfo: {
      classId: classInfo.id,
      className: classInfo.name,
      semester: classInfo.semester,
      teacherName: classInfo.teacherName
    },
    statistics: {
      totalStudents,
      registeredCount,
      registrationRate: parseFloat(registrationRate),
      lrAttendedCount,
      lrAttendanceRate: parseFloat(lrAttendanceRate),
      swAttendedCount,
      swAttendanceRate: parseFloat(swAttendanceRate),
      passedCount,
      passRate: parseFloat(passRate),
      avgScore: avgScore ? parseFloat(avgScore) : null,
      groupRegisteredCount,
      groupRegistrationRate: parseFloat(groupRegistrationRate)
    },
    students,
    pagination: {
      page,
      pageSize,
      total: totalStudents,
      totalPages: Math.ceil(totalStudents / pageSize)
    }
  };
}

function normalizeEmptyValue(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

/**
 * 匯出用：將 examType 轉為 Excel 要求的中文值
 * - 這裡不直接重用 getClassBestepOverview 內的 formatExamTypeLabel，以避免字串不一致。
 */
function getBestepExamTypeLabelForExport(examType) {
  const code = normalizeEmptyValue(examType).trim().toUpperCase();
  if (!code) return '';

  const map = {
    LRSW: '聽讀說寫',
    LR: '聽讀',
    SW: '說寫',
    NON: '不報考'
  };

  // 未知值不要丟錯：回傳原始碼或空字串（Excel 仍保持純文字）
  return map[code] || code;
}

/**
 * C 欄：個人報名項目
 * - status='success' => 輸出 examType 中文名稱
 * - 其他狀態 => 輸出 報名失敗
 * - 沒有 registration => 未報名
 */
function getBestepPersonalRegistrationItem(registration) {
  if (!registration) return '未報名';

  const status = normalizeEmptyValue(registration.status).trim();
  if (status === 'success' || status === 'registered_success') {
    return getBestepExamTypeLabelForExport(registration.examType);
  }

  // 若系統未來出現明確未報名 code，支援對應（避免匯出時拋錯）
  if (status === 'not_registered' || status === '未報名') {
    return '未報名';
  }

  const knownFailedStatuses = new Set([
    'failed',
    'registration_failed',
    '報名失敗'
  ]);

  if (knownFailedStatuses.has(status)) return '報名失敗';

  // 針對 approved/pending/revision/expired 等非 success 狀態，依 Excel 規格收斂為「報名失敗」
  return '報名失敗';
}

/**
 * D 欄：抵免項目
 * - 若沒有抵免資料，輸出空字串
 */
function getBestepExemptionItem(registration) {
  if (!registration) return '';
  const v = registration.exemptionType;
  if (v === null || v === undefined) return '';
  const text = normalizeEmptyValue(v).trim();
  if (!text || text === '無') return '';
  return text;
}

/**
 * E 欄：出席狀況（匯出為單一文字）
 */
function getBestepAttendanceStatus(attendance, examTypeFilter = 'all') {
  const att = attendance || {};
  const lr = att.LR || null;
  const sw = att.SW || null;

  const recToStatus = (rec) => {
    if (!rec || typeof rec.attended !== 'boolean') return '未知';
    return rec.attended ? '已出席' : '缺席';
  };

  if (examTypeFilter === 'LR') {
    return lr ? recToStatus(lr) : '未安排';
  }

  if (examTypeFilter === 'SW') {
    return sw ? recToStatus(sw) : '未安排';
  }

  // examTypeFilter === 'all'
  if (!lr && !sw) return '未知';
  if (lr && !sw) return '未安排';
  if (!lr && sw) return '未安排';

  // 兩場都有資料：只要任一場缺席 => 缺席
  if (lr.attended && sw.attended) return '已出席';
  return '缺席';
}

function getScoreLevel(score, key) {
  if (!score) return '';
  const v = score[key];
  if (v === null || v === undefined) return '';
  const text = normalizeEmptyValue(v).trim();
  return text;
}

/**
 * J 欄：團體報名
 * - 輸出「有/無」，避免布林值裸輸出
 */
function getBestepGroupRegistrationLabel(groupRegistration) {
  return groupRegistration ? '有' : '無';
}

/**
 * 建立匯出資料（A~J 欄）
 * - 篩選條件：classId + semester + examType + search（不依賴 pagination）
 * - 內部沿用 getClassBestepOverview 的「同一學生取最新 updatedAt 一筆」邏輯
 */
async function buildClassBestepExportData(classId, semester, examType = 'all', filters = {}) {
  const { search = '' } = filters;

  const classInfo = await Class.findByPk(classId);
  if (!classInfo) throw new Error('班級不存在');

  const whereClause = {
    classId,
    semester
  };

  if (search) {
    whereClause[Op.or] = [
      { studentId: { [Op.like]: `%${search}%` } },
      { studentName: { [Op.like]: `%${search}%` } }
    ];
  }

  const totalCount = await ClassMembership.count({ where: whereClause });
  if (totalCount === 0) {
    return {
      classInfo: { className: classInfo.name },
      rows: []
    };
  }

  const overview = await getClassBestepOverview(classId, semester, examType, {
    page: 1,
    pageSize: totalCount,
    search
  });

  const students = overview.students || [];

  const rows = students.map((student) => {
    const personal = student.personalRegistration;
    const attendanceStatus = getBestepAttendanceStatus(student.attendance, examType);
    const score = student.score;

    return {
      studentId: normalizeEmptyValue(student.studentId),
      studentName: normalizeEmptyValue(student.studentName),
      personalRegistrationItem: getBestepPersonalRegistrationItem(personal),
      exemptionItem: getBestepExemptionItem(personal),
      attendanceStatus,
      listeningCEFR: getScoreLevel(score, 'listeningLevel'),
      readingCEFR: getScoreLevel(score, 'readingLevel'),
      writingCEFR: getScoreLevel(score, 'writingLevel'),
      speakingCEFR: getScoreLevel(score, 'speakingLevel'),
      groupRegistrationLabel: getBestepGroupRegistrationLabel(student.groupRegistration)
    };
  });

  return {
    classInfo: { className: classInfo.name },
    rows
  };
}

module.exports = {
  getClassBestepOverview,
  buildClassBestepExportData
};
