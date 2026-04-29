'use strict';

/**
 * 考試成績 Excel 固定格式（第一個 sheet）：
 * A 系所 | B 學院 | C 班別 | D 年級 | E 學號 | F 姓名 | G 英文檢定類別 | H 檢定時間 |
 * I 聽力 | J 聽力(CEFR) | K 閱讀 | L 閱讀(CEFR) | M 口說 | N 口說(CEFR) | O 寫作 | P 寫作(CEFR)
 *
 * 去重鍵：studentId + testType/examType + testDate/examDate
 *
 * - 檔案內同 E（學號）對應不同 F（姓名）→ quarantine，該學號列皆不匯入
 * - DB 既有 students.studentId 之 name_zh 與 F 不符 → quarantine（不靜默接受）
 * - A～D（系所／學院／班別／年級）僅入 rawPayload，不作 B2 母體
 * - raw 分數可空白；CEFR 空白者不建該技能列；無效 CEFR → warning，不建該技能列
 */

const { Op } = require('sequelize');
const XLSX = require('xlsx');
const { sequelize, Student, EtExamAttempt, EtExamAttemptSkillScore } = require('../../models');
const { normalizeCefr, getCefrRank } = require('./utils/cefr');

const COL = {
  department: 0,
  college: 1,
  classSection: 2,
  grade: 3,
  studentId: 4,
  studentName: 5,
  examType: 6,
  examDate: 7,
  listeningScore: 8,
  listeningCefr: 9,
  readingScore: 10,
  readingCefr: 11,
  speakingScore: 12,
  speakingCefr: 13,
  writingScore: 14,
  writingCefr: 15
};

const SKILL_SPECS = [
  { skill: 'listening', scoreCol: COL.listeningScore, cefrCol: COL.listeningCefr },
  { skill: 'reading', scoreCol: COL.readingScore, cefrCol: COL.readingCefr },
  { skill: 'speaking', scoreCol: COL.speakingScore, cefrCol: COL.speakingCefr },
  { skill: 'writing', scoreCol: COL.writingScore, cefrCol: COL.writingCefr }
];

function normSid(s) {
  return String(s || '').trim().toUpperCase();
}

function normName(s) {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

function cellStr(row, idx) {
  const v = row && row[idx];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function parseRawScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

function normalizeDateOnly(value) {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const mo = value.getMonth() + 1;
    const da = value.getDate();
    return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
  }
  if (typeof value === 'number' && XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed && typeof parsed.y === 'number') {
      const y = parsed.y;
      const m = parsed.m + 1;
      const d = parsed.d;
      return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }
  const text = String(value).trim().replace(/\//g, '-');
  if (/^\d{8}$/.test(text)) {
    return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
  }
  const m = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const da = Number(m[3]);
  if (!Number.isInteger(y) || mo < 1 || mo > 12 || da < 1 || da > 31) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(da).padStart(2, '0')}`;
}

function canonicalSkillPayloadParts(rows, fromDb) {
  const arr = [];
  for (const row of rows || []) {
    const j = fromDb && typeof row.toJSON === 'function' ? row.toJSON() : row;
    if (!j.skill) continue;
    arr.push({
      skill: j.skill,
      cefr: j.cefr != null ? String(j.cefr) : '',
      cefrRank: j.cefrRank != null ? Number(j.cefrRank) : null
    });
  }
  arr.sort((a, b) => String(a.skill).localeCompare(String(b.skill)));
  return JSON.stringify(arr);
}

/**
 * @param {Buffer} file
 */
async function importExam(file) {
  const warnings = [];
  const conflicts = [];
  const quarantine = [];
  let inserted = 0;
  let skipped = 0;

  const workbook = XLSX.read(file, { type: 'buffer', cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let startRow = 0;
  if (matrix[0]) {
    const probeE = String(matrix[0][COL.studentId] || '').toLowerCase();
    if (probeE.includes('學號') || probeE.includes('student')) startRow = 1;
  }

  const fileRows = [];
  for (let i = startRow; i < matrix.length; i += 1) {
    const row = matrix[i];
    if (!row) continue;
    const studentId = normSid(cellStr(row, COL.studentId));
    if (!studentId) continue;
    fileRows.push({
      line: i + 1,
      row,
      studentId,
      studentName: normName(cellStr(row, COL.studentName))
    });
  }

  const idToNames = new Map();
  const idHasEmptyName = new Set();
  for (const fr of fileRows) {
    if (!fr.studentName) {
      idHasEmptyName.add(fr.studentId);
      continue;
    }
    if (!idToNames.has(fr.studentId)) idToNames.set(fr.studentId, new Set());
    idToNames.get(fr.studentId).add(fr.studentName);
  }
  const fileConflictIds = new Set();
  for (const [sid, set] of idToNames) {
    if (set.size > 1) fileConflictIds.add(sid);
    if (idHasEmptyName.has(sid) && set.size >= 1) fileConflictIds.add(sid);
  }

  const uniqueIds = [...new Set(fileRows.map((r) => r.studentId))];
  const dbStudents =
    uniqueIds.length > 0
      ? await Student.findAll({
          where: { studentId: { [Op.in]: uniqueIds } }
        })
      : [];
  const sidToStudent = new Map(dbStudents.map((s) => [normSid(s.studentId), s]));

  await sequelize.transaction(async (transaction) => {
    for (const { line, row, studentId, studentName: nameFromSheet } of fileRows) {
      const department = normName(cellStr(row, COL.department));
      const college = normName(cellStr(row, COL.college));
      const classSection = normName(cellStr(row, COL.classSection));
      const gradeText = normName(cellStr(row, COL.grade));

      const examType = cellStr(row, COL.examType);
      const examDateRaw = row[COL.examDate];

      if (fileConflictIds.has(studentId)) {
        quarantine.push({
          reason: 'same_student_id_different_student_name_in_file',
          studentId,
          line
        });
        continue;
      }

      if (!nameFromSheet) {
        warnings.push(`第 ${line} 列：F 姓名空白，無法檢核學號身分，略過`);
        continue;
      }

      if (!examType || examDateRaw === '' || examDateRaw == null) {
        warnings.push(`第 ${line} 列：缺少 G 英文檢定類別或 H 檢定時間，已略過`);
        continue;
      }

      const examDate = normalizeDateOnly(examDateRaw);
      if (!examDate) {
        warnings.push(`第 ${line} 列：無法解析 H 檢定時間，已略過`);
        continue;
      }

      const existingStudent = sidToStudent.get(studentId);
      if (existingStudent && normName(existingStudent.nameZh) !== nameFromSheet) {
        quarantine.push({
          reason: 'student_id_name_mismatch_db',
          studentId,
          line,
          nameInDb: normName(existingStudent.nameZh),
          nameInExcel: nameFromSheet
        });
        continue;
      }

      const skillsRaw = {};
      const incomingSkills = [];

      for (const spec of SKILL_SPECS) {
        const cRawStr = cellStr(row, spec.cefrCol);
        const rawScore = parseRawScore(row[spec.scoreCol]);
        skillsRaw[spec.skill] = { rawScore, cefrText: cRawStr };

        if (!cRawStr) continue;

        const cefrNorm = normalizeCefr(cRawStr);
        if (!cefrNorm) {
          warnings.push(`第 ${line} 列 ${spec.skill}：CEFR「${cRawStr}」非 A1–C2，已略過該技能`);
          continue;
        }

        const rank = getCefrRank(cefrNorm);
        incomingSkills.push({
          skill: spec.skill,
          cefr: cefrNorm,
          cefrRank: rank,
          rawScore
        });
      }

      if (incomingSkills.length === 0) {
        warnings.push(`第 ${line} 列：無有效技能 CEFR（J/L/N/P），已略過`);
        continue;
      }

      const existing = await EtExamAttempt.findOne({
        where: {
          studentId,
          testType: examType,
          testDate: examDate
        },
        include: [{ model: EtExamAttemptSkillScore, as: 'skillScores', required: false }],
        transaction
      });

      if (existing) {
        const dbSig = canonicalSkillPayloadParts(existing.skillScores || [], true);
        const inSig = canonicalSkillPayloadParts(incomingSkills, false);
        if (dbSig === inSig) {
          skipped += 1;
          continue;
        }
        conflicts.push({
          studentId,
          examType,
          examDate,
          line,
          message: '與既有測驗鍵相同但技能內容不同，未覆寫'
        });
        continue;
      }

      const attempt = await EtExamAttempt.create(
        {
          studentId,
          examType,
          examDate,
          testType: examType,
          testDate: examDate,
          source: 'manual_import',
          sourceType: 'learning_journey_v3_import',
          status: 'valid',
          rawPayload: {
            rowLine: line,
            department,
            college,
            classSection,
            grade: gradeText,
            studentName: nameFromSheet,
            skillsRaw,
            importReferenceOnly: true
          }
        },
        { transaction }
      );

      for (const s of incomingSkills) {
        await EtExamAttemptSkillScore.create(
          {
            attemptId: attempt.id,
            skill: s.skill,
            cefr: s.cefr,
            cefrRank: s.cefrRank,
            rawScore: s.rawScore,
            rawLevel: null,
            isInferred: false
          },
          { transaction }
        );
      }

      inserted += 1;
    }
  });

  return {
    ok: true,
    inserted,
    skipped,
    warnings,
    conflicts,
    quarantine
  };
}

module.exports = {
  importExam
};
