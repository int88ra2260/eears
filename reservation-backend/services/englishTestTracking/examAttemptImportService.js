const XLSX = require('xlsx');
const path = require('path');
const {
  EtEnrollmentSnapshot,
  EtExamAttempt,
  EtExamAttemptScore,
  EtAttemptImportHistory,
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const { buildCanonicalAttemptWhere } = require('./examAttemptNaturalKey');
const { getCefrRank } = require('./cefrMappingService');

const SCORE_FIELD_MAPPINGS = {
  studentId: ['學號', 'Student ID', 'studentId', '學號代碼', 'student_id'],
  name: ['姓名', 'Name', 'name', '學生姓名'],
  testType: ['檢定類別', 'Test Type', 'testType', '測驗類型', 'BESTEP', 'TOEIC', 'IELTS'],
  testDate: ['檢定時間', '考試日期', 'Test Date', 'testDate', '日期', 'examDate'],
  // 兼容不同 Excel 欄位命名（例如：聽力成績/聽力成績(CEFR)）
  listeningScore: ['聽力', '聽力分數', '聽力成績', 'Listening', 'listeningScore', 'L'],
  readingScore: ['閱讀', '閱讀分數', '閱讀成績', 'Reading', 'readingScore', 'R'],
  speakingScore: ['口說', '口說分數', '口說成績', 'Speaking', 'speakingScore', 'S'],
  writingScore: ['寫作', '寫作分數', '寫作成績', 'Writing', 'writingScore', 'W'],
  listeningCefr: ['聽力CEFR', '聽力等級', '聽力成績(CEFR)', '聽力成績（CEFR）', 'Listening Level', 'listeningLevel'],
  readingCefr: ['閱讀CEFR', '閱讀等級', '閱讀成績(CEFR)', '閱讀成績（CEFR）', 'Reading Level', 'readingLevel'],
  speakingCefr: ['口說CEFR', '口說等級', '口說成績(CEFR)', '口說成績（CEFR）', 'Speaking Level', 'speakingLevel'],
  writingCefr: ['寫作CEFR', '寫作等級', '寫作成績(CEFR)', '寫作成績（CEFR）', 'Writing Level', 'writingLevel']
};

const SKILLS = ['LISTENING', 'READING', 'SPEAKING', 'WRITING'];
const B2_RANK = getCefrRank('B2') || 4;
// 支援含「+」版本（例如 B2+）
// 注意：後續 rank 計算會把 A1+ 視為 A1（以避免資料庫 lookup 不存在的問題）
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'A1+', 'A2+', 'B1+', 'B2+', 'C1+', 'C2+'];

function normalizeToIsoDateString(dateString) {
  const m = String(dateString).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Use UTC to avoid timezone side effects while validating calendar date.
  const dt = new Date(Date.UTC(year, month - 1, day));
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 最終入庫前的 DATEONLY 正規化保險：
 * 接受 YYYY-M-D / YYYY/MM/DD / YYYYMMDD，輸出 YYYY-MM-DD；無法解析則回傳 null。
 * @param {any} value
 * @returns {string|null}
 */
function normalizeDateOnlyForDb(value) {
  if (value == null || value === '') return null;
  const text = String(value).trim().replace(/\//g, '-');
  if (/^\d{8}$/.test(text)) {
    return normalizeToIsoDateString(`${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`);
  }
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(text)) {
    return normalizeToIsoDateString(text);
  }
  return null;
}

function getFieldValue(row, targetField) {
  const mappings = SCORE_FIELD_MAPPINGS[targetField] || [];
  for (const key of mappings) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return null;
}

/**
 * 解析日期欄位：可能為單一日期、多日期（用頓號/、/空格分隔）、或含中文備註
 * @param {any} value
 * @param {object} options - { splitMultiple: boolean } 若 true 拆成多筆 attempt
 * @returns {{ dates: string[], warnings: string[] }} 日期陣列 YYYY-MM-DD，與警告
 */
function parseTestDate(value, options = {}) {
  const splitMultiple = options.splitMultiple !== false;
  const warnings = [];
  if (value == null || value === '') {
    return { dates: [], warnings: ['缺少檢定時間'] };
  }

  let str = String(value).trim();
  // 移除常見中文備註（括號內、全形空格後等）
  const noteMatch = str.match(/[（(].*?[）)]|\s+[備註附註說明].*$/);
  if (noteMatch) {
    warnings.push(`已剔除備註: ${noteMatch[0].substring(0, 30)}...`);
    str = str.replace(noteMatch[0], '').trim();
  }

  const separators = /[,，、\s]+/;
  const parts = splitMultiple ? str.split(separators).map(s => s.trim()).filter(Boolean) : [str];
  const dates = [];

  for (const part of parts) {
    let d = part;
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(d)) {
      d = d.replace(/\//g, '-');
      const normalizedDate = normalizeToIsoDateString(d);
      if (normalizedDate) {
        dates.push(normalizedDate);
      } else {
        warnings.push(`無法解析日期: ${part}`);
      }
    } else if (/^\d{8}$/.test(d)) {
      const normalizedDate = normalizeToIsoDateString(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`);
      if (normalizedDate) {
        dates.push(normalizedDate);
      } else {
        warnings.push(`無法解析日期: ${part}`);
      }
    } else {
      warnings.push(`無法解析日期: ${part}`);
    }
  }

  return { dates: [...new Set(dates)], warnings };
}

function parseNumeric(val) {
  if (val == null || val === '') return null;
  const n = parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

function normalizeCefr(val) {
  if (val == null || val === '') return null;
  const v = String(val)
    .trim()
    .replace(/＋/g, '+') // full-width plus -> ascii plus
    .replace(/\s+/g, '') // remove spaces
    .toUpperCase();
  return CEFR_LEVELS.includes(v) ? v : null;
}

function emptySkillRanks() {
  return {
    LISTENING: 0,
    READING: 0,
    SPEAKING: 0,
    WRITING: 0
  };
}

function roundRate(count, total) {
  if (!total) return 0;
  return Number((count / total).toFixed(4));
}

async function computeSemesterSkillStatsSnapshot(semesterId, transaction) {
  const rosterRows = await EtEnrollmentSnapshot.findAll({
    where: { semesterId, isActive: true },
    attributes: ['studentId'],
    transaction
  });
  const rosterStudentIds = [...new Set(rosterRows.map((row) => String(row.studentId).trim()).filter(Boolean))];
  const studentSkillRanks = new Map(rosterStudentIds.map((sid) => [sid, emptySkillRanks()]));
  if (rosterStudentIds.length === 0) {
    return {
      semesterId,
      rosterTotal: 0,
      skills: {
        listening: { count: 0, rate: 0 },
        reading: { count: 0, rate: 0 },
        speaking: { count: 0, rate: 0 },
        writing: { count: 0, rate: 0 }
      },
      studentSkillRanks
    };
  }

  const attempts = await EtExamAttempt.findAll({
    where: {
      studentId: { [Op.in]: rosterStudentIds },
      status: 'valid'
    },
    attributes: ['id', 'studentId'],
    include: [{ model: EtExamAttemptScore, as: 'scores', required: false, attributes: ['skill', 'cefr'] }],
    transaction
  });

  for (const attempt of attempts) {
    const studentId = String(attempt.studentId).trim();
    const current = studentSkillRanks.get(studentId);
    if (!current) continue;
    for (const score of attempt.scores || []) {
      const skill = String(score.skill || '').toUpperCase();
      if (!SKILLS.includes(skill)) continue;
      const rank = Number(getCefrRank(score.cefr) || 0);
      if (rank > current[skill]) current[skill] = rank;
    }
  }

  const counts = { LISTENING: 0, READING: 0, SPEAKING: 0, WRITING: 0 };
  for (const ranks of studentSkillRanks.values()) {
    for (const skill of SKILLS) {
      if (Number(ranks[skill] || 0) >= B2_RANK) counts[skill] += 1;
    }
  }
  const rosterTotal = rosterStudentIds.length;
  return {
    semesterId,
    rosterTotal,
    skills: {
      listening: { count: counts.LISTENING, rate: roundRate(counts.LISTENING, rosterTotal) },
      reading: { count: counts.READING, rate: roundRate(counts.READING, rosterTotal) },
      speaking: { count: counts.SPEAKING, rate: roundRate(counts.SPEAKING, rosterTotal) },
      writing: { count: counts.WRITING, rate: roundRate(counts.WRITING, rosterTotal) }
    },
    studentSkillRanks
  };
}

function buildDeltaStats(beforeStats, afterStats) {
  const skills = {};
  ['listening', 'reading', 'speaking', 'writing'].forEach((skill) => {
    const beforeCount = Number(beforeStats?.skills?.[skill]?.count || 0);
    const afterCount = Number(afterStats?.skills?.[skill]?.count || 0);
    const beforeRate = Number(beforeStats?.skills?.[skill]?.rate || 0);
    const afterRate = Number(afterStats?.skills?.[skill]?.rate || 0);
    skills[skill] = {
      count: afterCount - beforeCount,
      rate: Number((afterRate - beforeRate).toFixed(4))
    };
  });
  return {
    rosterTotal: Number(afterStats?.rosterTotal || 0) - Number(beforeStats?.rosterTotal || 0),
    skills
  };
}

function buildNewB2BySkill(beforeRanksMap, afterRanksMap) {
  const result = { listening: 0, reading: 0, speaking: 0, writing: 0 };
  const mappings = [
    ['LISTENING', 'listening'],
    ['READING', 'reading'],
    ['SPEAKING', 'speaking'],
    ['WRITING', 'writing']
  ];
  for (const [studentId, afterRanks] of afterRanksMap.entries()) {
    const beforeRanks = beforeRanksMap.get(studentId) || emptySkillRanks();
    mappings.forEach(([upper, lower]) => {
      const before = Number(beforeRanks[upper] || 0);
      const after = Number(afterRanks[upper] || 0);
      if (before < B2_RANK && after >= B2_RANK) result[lower] += 1;
    });
  }
  return result;
}

/**
 * 匯入成績 attempt
 * @param {string} filePath
 * @param {object} options - { semesterId, importName, operatorId, source, treatDuplicateAs: 'replace'|'skip'|'reject', splitMultipleDates }
 *   reject：已存在相同正規自然鍵之有效紀錄時，該列不寫入並回報 DUPLICATE_ATTEMPT
 * @returns {Promise<{ imported, skipped, errors, warnings, importBatchId }>}
 */
async function importExamAttempts(filePath, options = {}) {
  const semesterId = String(options.semesterId || '').trim();
  if (!semesterId) {
    throw new Error('semesterId is required');
  }
  const importName = String(options.importName || '').trim();
  if (!importName) {
    throw new Error('importName is required');
  }
  const source = options.source || 'manual_import';
  const treatDuplicateAs = options.treatDuplicateAs || 'replace';
  const splitMultipleDates = options.splitMultipleDates !== false;
  const importBatchId = `attempts-${Date.now()}`;
  const operatorId = options.operatorId ? String(options.operatorId) : null;

  const transaction = await sequelize.transaction();
  const errors = [];
  const warnings = [];
  let imported = 0;
  let skipped = 0;
  /** 同一次匯入中已出現過的正規鍵（用於提示工作表內重複列） */
  const sheetCanonicalKeysSeen = new Set();

  try {
    const beforeSnapshot = await computeSemesterSkillStatsSnapshot(semesterId, transaction);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      const studentIdRaw = getFieldValue(row, 'studentId');
      if (!studentIdRaw || String(studentIdRaw).trim() === '') {
        errors.push({ row: rowNum, error: 'MISSING_STUDENT_ID', message: '學號為空' });
        skipped++;
        continue;
      }

      const studentId = String(studentIdRaw).trim();
      const testTypeRaw = getFieldValue(row, 'testType');
      const testType = testTypeRaw ? String(testTypeRaw).trim() : 'BESTEP';

      const dateValue = getFieldValue(row, 'testDate');
      const { dates: testDates, warnings: dateWarnings } = parseTestDate(dateValue, { splitMultiple: splitMultipleDates });
      dateWarnings.forEach(w => warnings.push({ row: rowNum, message: w }));

      if (testDates.length === 0 && dateValue) {
        errors.push({ row: rowNum, studentId, error: 'INVALID_DATE', message: '無法解析檢定時間' });
        skipped++;
        continue;
      }

      const useDates = testDates.length > 0 ? testDates : [null];

      const listeningScore = parseNumeric(getFieldValue(row, 'listeningScore'));
      const readingScore = parseNumeric(getFieldValue(row, 'readingScore'));
      const speakingScore = parseNumeric(getFieldValue(row, 'speakingScore'));
      const writingScore = parseNumeric(getFieldValue(row, 'writingScore'));
      const listeningCefr = normalizeCefr(getFieldValue(row, 'listeningCefr'));
      const readingCefr = normalizeCefr(getFieldValue(row, 'readingCefr'));
      const speakingCefr = normalizeCefr(getFieldValue(row, 'speakingCefr'));
      const writingCefr = normalizeCefr(getFieldValue(row, 'writingCefr'));

      const scores = [
        { skill: 'LISTENING', rawScore: listeningScore, cefr: listeningCefr },
        { skill: 'READING', rawScore: readingScore, cefr: readingCefr },
        { skill: 'SPEAKING', rawScore: speakingScore, cefr: speakingCefr },
        { skill: 'WRITING', rawScore: writingScore, cefr: writingCefr }
      ].filter(s => s.rawScore != null || s.cefr != null);

      if (scores.length === 0) {
        errors.push({ row: rowNum, studentId, error: 'NO_SCORES', message: '至少需有一項成績或 CEFR' });
        skipped++;
        continue;
      }

      for (const testDate of useDates) {
        const normalizedTestDate = normalizeDateOnlyForDb(testDate);
        const typeUpper = String(testType).trim().toUpperCase();
        const canonicalKey = `${studentId}|${normalizedTestDate ?? 'NULL'}|${typeUpper}`;
        if (sheetCanonicalKeysSeen.has(canonicalKey)) {
          warnings.push({
            row: rowNum,
            studentId,
            message: '工作表內重複列（與上方列同學號／檢定日期／檢定類型）；仍依「重複處理」規則寫入資料庫。'
          });
        } else {
          sheetCanonicalKeysSeen.add(canonicalKey);
        }

        const canonicalWhere = buildCanonicalAttemptWhere(EtExamAttempt, studentId, normalizedTestDate, testType);
        const existingValid = await EtExamAttempt.findOne({
          where: { ...canonicalWhere, status: 'valid' },
          transaction
        });

        if (existingValid) {
          if (treatDuplicateAs === 'skip') {
            skipped++;
            continue;
          }
          if (treatDuplicateAs === 'reject') {
            errors.push({
              row: rowNum,
              studentId,
              error: 'DUPLICATE_ATTEMPT',
              message: '已存在相同學號、檢定日期、檢定類型之有效紀錄，略過本列（可改為 replace 覆寫或 skip 略過）。'
            });
            skipped++;
            continue;
          }
          // replace：作廢所有同正規自然鍵之有效列，再寫入一筆
          await EtExamAttempt.update(
            { status: 'void', replacedByAttemptId: null },
            { where: { ...canonicalWhere, status: 'valid' }, transaction }
          );
        }

        const attempt = await EtExamAttempt.create({
          studentId,
          testType,
          testDate: normalizedTestDate,
          source,
          importBatchId,
          status: 'valid',
          replacedByAttemptId: null
        }, { transaction });

        for (const { skill, rawScore, cefr } of scores) {
          await EtExamAttemptScore.create({
            attemptId: attempt.id,
            skill,
            rawScore,
            cefr
          }, { transaction });
        }
        imported++;
      }
    }

    const afterSnapshot = await computeSemesterSkillStatsSnapshot(semesterId, transaction);
    const deltaStats = buildDeltaStats(beforeSnapshot, afterSnapshot);
    const newB2BySkill = buildNewB2BySkill(beforeSnapshot.studentSkillRanks, afterSnapshot.studentSkillRanks);
    await EtAttemptImportHistory.create({
      importBatchId,
      importName,
      semesterId,
      importedAt: new Date(),
      operatorId,
      importedCount: imported,
      skippedCount: skipped,
      errorCount: errors.length,
      beforeStats: {
        semesterId: beforeSnapshot.semesterId,
        rosterTotal: beforeSnapshot.rosterTotal,
        skills: beforeSnapshot.skills
      },
      afterStats: {
        semesterId: afterSnapshot.semesterId,
        rosterTotal: afterSnapshot.rosterTotal,
        skills: afterSnapshot.skills
      },
      deltaStats,
      newB2BySkill
    }, { transaction });

    await transaction.commit();
    return {
      semesterId,
      importName,
      imported,
      skipped,
      errors,
      warnings,
      importBatchId,
      newB2BySkill,
      deltaStats
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * 回滾指定 batch：將該 batch 建立的 attempts 標記為 void（或刪除 scores 後刪除 attempt，依需求可改為軟刪）
 * @param {string} importBatchId
 * @returns {Promise<{ voided: number }>}
 */
async function rollbackBatch(importBatchId) {
  const transaction = await sequelize.transaction();
  try {
    const attempts = await EtExamAttempt.findAll({
      where: { importBatchId, status: 'valid' },
      transaction
    });
    let voided = 0;
    for (const a of attempts) {
      await a.update({ status: 'void' }, { transaction });
      voided++;
    }
    await transaction.commit();
    return { voided };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  importExamAttempts,
  rollbackBatch,
  parseTestDate,
  getFieldValue,
  SCORE_FIELD_MAPPINGS,
  normalizeDateOnlyForDb
};
