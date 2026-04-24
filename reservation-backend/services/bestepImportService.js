// services/bestepImportService.js
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const { 
  EnglishTestRegistration,
  BestepAttendance,
  BestepExamScore,
  sequelize
} = require('../models');
const { Op } = require('sequelize');

// CEFR 等級列表
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// 欄位名稱對應表
const FIELD_MAPPINGS = {
  attendance: {
    studentId: ['學號', 'Student ID', 'studentId', '學號代碼', 'student_id'],
    name: ['姓名', 'Name', 'name', '學生姓名', 'student_name'],
    attended: ['出席狀態', 'Attendance', 'attended', '是否出席', '出席/缺席', '出席'],
    absentReason: ['缺席原因', 'Absent Reason', 'absentReason', '原因', '備註', '缺席原因']
  },
  scores: {
    studentId: ['學號', 'Student ID', 'studentId', '學號代碼', 'student_id'],
    name: ['姓名', 'Name', 'name', '學生姓名', 'student_name'],
    listeningScore: ['聽力分數', 'Listening', 'listeningScore', '聽力', 'L', '聽力成績', 'listening_score'],
    readingScore: ['閱讀分數', 'Reading', 'readingScore', '閱讀', 'R', '閱讀成績', 'reading_score'],
    speakingScore: ['口說分數', 'Speaking', 'speakingScore', '口說', 'S', '口說成績', 'speaking_score'],
    writingScore: ['寫作分數', 'Writing', 'writingScore', '寫作', 'W', '寫作成績', 'writing_score'],
    listeningLevel: ['聽力等級', 'Listening Level', 'listeningLevel', '聽力CEFR', '聽力級別', 'listening_level'],
    readingLevel: ['閱讀等級', 'Reading Level', 'readingLevel', '閱讀CEFR', '閱讀級別', 'reading_level'],
    speakingLevel: ['口說等級', 'Speaking Level', 'speakingLevel', '口說CEFR', '口說級別', 'speaking_level'],
    writingLevel: ['寫作等級', 'Writing Level', 'writingLevel', '寫作CEFR', '寫作級別', 'writing_level'],
    totalScore: ['總分', 'Total', 'totalScore', '總成績', '合計', 'total_score']
  }
};

/**
 * 自動識別欄位名稱
 * @param {object} row - Excel 行資料（物件）
 * @param {string} fieldType - 'attendance' 或 'scores'
 * @param {string} targetField - 目標欄位名稱
 * @returns {any} 欄位值
 */
function getFieldValue(row, fieldType, targetField) {
  const mappings = FIELD_MAPPINGS[fieldType][targetField] || [];
  for (const mapping of mappings) {
    if (row[mapping] !== undefined && row[mapping] !== null && row[mapping] !== '') {
      return row[mapping];
    }
  }
  return null;
}

/**
 * 解析出席狀態值
 * @param {any} value - 原始值
 * @returns {boolean} 是否出席
 */
function parseAttendanceStatus(value) {
  if (value === null || value === undefined) return false;
  const str = String(value).trim().toLowerCase();
  const attendedValues = ['出席', '是', 'y', 'yes', 'true', '1', '✓', 'v'];
  return attendedValues.includes(str);
}

/**
 * 計算整體等級（取最低項）
 * @param {string[]} levels - 各項等級陣列
 * @returns {string|null}
 */
function calculateOverallLevel(levels) {
  const validLevels = levels.filter(l => l && CEFR_LEVELS.includes(l));
  if (validLevels.length === 0) return null;
  const indices = validLevels.map(l => CEFR_LEVELS.indexOf(l));
  const minIndex = Math.min(...indices);
  return CEFR_LEVELS[minIndex];
}

/**
 * 判斷是否達標（各項都達 B2 以上）
 * @param {string[]} levels - 各項等級陣列
 * @returns {boolean}
 */
function isPassed(levels) {
  const validLevels = levels.filter(l => l && CEFR_LEVELS.includes(l));
  if (validLevels.length !== 4) return false; // 必須四項都有等級
  const minLevelIndex = CEFR_LEVELS.indexOf('B2');
  return validLevels.every(level => CEFR_LEVELS.indexOf(level) >= minLevelIndex);
}

/**
 * 匯入出席資料
 * @param {string} filePath - Excel 檔案路徑
 * @param {string} semester - 學期
 * @param {string} examType - 'LR' 或 'SW'
 * @param {string} examDate - 考試日期
 * @returns {Promise<object>}
 */
async function importAttendanceData(filePath, semester, examType, examDate) {
  const transaction = await sequelize.transaction();
  const errors = [];
  let imported = 0;
  let skipped = 0;

  try {
    // 讀取 Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const sourceFile = path.basename(filePath);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel 行號從 2 開始

      try {
        // 取得欄位值
        const studentId = getFieldValue(row, 'attendance', 'studentId');
        const name = getFieldValue(row, 'attendance', 'name');
        const attendedValue = getFieldValue(row, 'attendance', 'attended');
        const absentReason = getFieldValue(row, 'attendance', 'absentReason');

        // 驗證學號
        if (!studentId || String(studentId).trim() === '') {
          errors.push({
            row: rowNum,
            studentId: studentId || '',
            name: name || '',
            error: 'MISSING_STUDENT_ID',
            message: '學號為空'
          });
          skipped++;
          continue;
        }

        const cleanStudentId = String(studentId).trim().toUpperCase();

        // 驗證學號是否存在於報名記錄中（且 status='success'）
        const registration = await EnglishTestRegistration.findOne({
          where: {
            studentId: cleanStudentId,
            status: 'success'
          },
          transaction
        });

        if (!registration) {
          errors.push({
            row: rowNum,
            studentId: cleanStudentId,
            name: name || '',
            error: 'STUDENT_NOT_FOUND',
            message: '找不到該學號的報名記錄（或報名狀態不是「報名成功」）'
          });
          skipped++;
          continue;
        }

        // 解析出席狀態
        const attended = parseAttendanceStatus(attendedValue);

        // 更新或建立出席記錄
        await BestepAttendance.upsert({
          studentId: cleanStudentId,
          semester,
          examType,
          examDate,
          attended,
          absentReason: absentReason ? String(absentReason).trim() : null,
          importedAt: new Date(),
          sourceFile
        }, {
          transaction
        });

        imported++;

      } catch (error) {
        errors.push({
          row: rowNum,
          studentId: getFieldValue(row, 'attendance', 'studentId') || '',
          name: getFieldValue(row, 'attendance', 'name') || '',
          error: 'PROCESSING_ERROR',
          message: error.message
        });
        skipped++;
      }
    }

    await transaction.commit();

    return {
      imported,
      skipped,
      errors
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 匯入成績資料
 * @param {string} filePath - Excel 檔案路徑
 * @param {string} semester - 學期
 * @returns {Promise<object>}
 */
async function importScoreData(filePath, semester) {
  const transaction = await sequelize.transaction();
  const errors = [];
  let imported = 0;
  let skipped = 0;

  try {
    // 讀取 Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    const sourceFile = path.basename(filePath);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel 行號從 2 開始

      try {
        // 取得欄位值
        const studentId = getFieldValue(row, 'scores', 'studentId');
        const name = getFieldValue(row, 'scores', 'name');
        const listeningScore = getFieldValue(row, 'scores', 'listeningScore');
        const readingScore = getFieldValue(row, 'scores', 'readingScore');
        const speakingScore = getFieldValue(row, 'scores', 'speakingScore');
        const writingScore = getFieldValue(row, 'scores', 'writingScore');
        const listeningLevel = getFieldValue(row, 'scores', 'listeningLevel');
        const readingLevel = getFieldValue(row, 'scores', 'readingLevel');
        const speakingLevel = getFieldValue(row, 'scores', 'speakingLevel');
        const writingLevel = getFieldValue(row, 'scores', 'writingLevel');
        const totalScore = getFieldValue(row, 'scores', 'totalScore');

        // 驗證學號
        if (!studentId || String(studentId).trim() === '') {
          errors.push({
            row: rowNum,
            studentId: studentId || '',
            name: name || '',
            error: 'MISSING_STUDENT_ID',
            message: '學號為空'
          });
          skipped++;
          continue;
        }

        const cleanStudentId = String(studentId).trim().toUpperCase();

        // 驗證學號是否存在於報名記錄中（且 status='success'）
        const registration = await EnglishTestRegistration.findOne({
          where: {
            studentId: cleanStudentId,
            status: 'success'
          },
          transaction
        });

        if (!registration) {
          errors.push({
            row: rowNum,
            studentId: cleanStudentId,
            name: name || '',
            error: 'STUDENT_NOT_FOUND',
            message: '找不到該學號的報名記錄（或報名狀態不是「報名成功」）'
          });
          skipped++;
          continue;
        }

        // 驗證分數（轉換為數字）
        const scores = {
          listening: listeningScore ? parseFloat(listeningScore) : null,
          reading: readingScore ? parseFloat(readingScore) : null,
          speaking: speakingScore ? parseFloat(speakingScore) : null,
          writing: writingScore ? parseFloat(writingScore) : null
        };

        // 驗證分數範圍（0-150，可配置）
        const MAX_SCORE = 150;
        for (const [key, value] of Object.entries(scores)) {
          if (value !== null && (isNaN(value) || value < 0 || value > MAX_SCORE)) {
            errors.push({
              row: rowNum,
              studentId: cleanStudentId,
              name: name || '',
              error: 'INVALID_SCORE',
              message: `${key}分數格式錯誤或超出範圍（0-${MAX_SCORE}）`
            });
            skipped++;
            continue;
          }
        }

        // 驗證等級
        const levels = {
          listening: listeningLevel ? String(listeningLevel).trim().toUpperCase() : null,
          reading: readingLevel ? String(readingLevel).trim().toUpperCase() : null,
          speaking: speakingLevel ? String(speakingLevel).trim().toUpperCase() : null,
          writing: writingLevel ? String(writingLevel).trim().toUpperCase() : null
        };

        // 驗證等級格式
        for (const [key, value] of Object.entries(levels)) {
          if (value && !CEFR_LEVELS.includes(value)) {
            errors.push({
              row: rowNum,
              studentId: cleanStudentId,
              name: name || '',
              error: 'INVALID_LEVEL',
              message: `${key}等級格式錯誤（應為 A1, A2, B1, B2, C1, C2 之一）`
            });
            skipped++;
            continue;
          }
        }

        // 計算總分（若未提供）
        let calculatedTotalScore = totalScore ? parseFloat(totalScore) : null;
        if (calculatedTotalScore === null || isNaN(calculatedTotalScore)) {
          const scoreValues = Object.values(scores).filter(s => s !== null);
          if (scoreValues.length === 4) {
            calculatedTotalScore = scoreValues.reduce((a, b) => a + b, 0);
          }
        }

        // 驗證總分（若提供）
        if (calculatedTotalScore !== null) {
          const sumOfScores = Object.values(scores).filter(s => s !== null).reduce((a, b) => a + b, 0);
          if (Math.abs(calculatedTotalScore - sumOfScores) > 1) {
            errors.push({
              row: rowNum,
              studentId: cleanStudentId,
              name: name || '',
              error: 'TOTAL_SCORE_MISMATCH',
              message: `總分與各科分數總和不符（總分：${calculatedTotalScore}，各科總和：${sumOfScores}）`
            });
            skipped++;
            continue;
          }
        }

        // 計算整體等級和達標狀態
        const levelValues = [levels.listening, levels.reading, levels.speaking, levels.writing];
        const overallLevel = calculateOverallLevel(levelValues);
        const passed = isPassed(levelValues);

        // 確保總分已計算
        if (calculatedTotalScore === null || isNaN(calculatedTotalScore)) {
          const scoreValues = Object.values(scores).filter(s => s !== null);
          if (scoreValues.length === 4) {
            calculatedTotalScore = scoreValues.reduce((a, b) => a + b, 0);
          }
        }

        // 更新或建立成績記錄
        await BestepExamScore.upsert({
          studentId: cleanStudentId,
          semester,
          examDate: null, // 可能 LR 和 SW 不同日期，暫時設為 null
          listeningScore: scores.listening,
          readingScore: scores.reading,
          speakingScore: scores.speaking,
          writingScore: scores.writing,
          listeningLevel: levels.listening,
          readingLevel: levels.reading,
          speakingLevel: levels.speaking,
          writingLevel: levels.writing,
          totalScore: calculatedTotalScore,
          overallLevel,
          passed,
          importedAt: new Date(),
          sourceFile
        }, {
          transaction
        });

        imported++;

      } catch (error) {
        errors.push({
          row: rowNum,
          studentId: getFieldValue(row, 'scores', 'studentId') || '',
          name: getFieldValue(row, 'scores', 'name') || '',
          error: 'PROCESSING_ERROR',
          message: error.message
        });
        skipped++;
      }
    }

    await transaction.commit();

    return {
      imported,
      skipped,
      errors
    };

  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

/**
 * 生成錯誤報表 Excel
 * @param {array} errors - 錯誤列表
 * @param {string} outputPath - 輸出檔案路徑
 */
async function generateErrorReport(errors, outputPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('錯誤報表');

  // 設定欄位
  worksheet.columns = [
    { header: '行號', key: 'row', width: 10 },
    { header: '學號', key: 'studentId', width: 15 },
    { header: '姓名', key: 'name', width: 15 },
    { header: '錯誤類型', key: 'error', width: 20 },
    { header: '錯誤訊息', key: 'message', width: 50 }
  ];

  // 加入錯誤資料
  errors.forEach(error => {
    worksheet.addRow({
      row: error.row,
      studentId: error.studentId || '',
      name: error.name || '',
      error: error.error || 'UNKNOWN_ERROR',
      message: error.message || '未知錯誤'
    });
  });

  // 儲存檔案
  await workbook.xlsx.writeFile(outputPath);
}

module.exports = {
  importAttendanceData,
  importScoreData,
  generateErrorReport
};
