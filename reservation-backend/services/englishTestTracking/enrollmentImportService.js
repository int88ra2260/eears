// LEGACY - DO NOT USE: retained only for historical English-test tracking maintenance.
/**
 * @deprecated
 * Will be removed after Learning Journey v3 fully replaces legacy tracking.
 */
const XLSX = require('xlsx');
const path = require('path');
const {
  EtSemester,
  EtStudentMaster,
  EtEnrollmentSnapshot,
  sequelize
} = require('../../models');
const { Op } = require('sequelize');
const config = require('../../config/englishTestTracking');

const ENROLLMENT_FIELD_MAPPINGS = {
  studentId: ['學號', 'Student ID', 'studentId', '學號代碼', 'student_id'],
  name: ['姓名', 'Name', 'name', '學生姓名'],
  college: ['學院', 'College', 'college', '學院名稱'],
  dept: ['系所', 'Dept', 'Department', 'dept', '系所名稱'],
  grade: ['年級', 'Grade', 'grade', '年級別'],
  status: ['學籍狀態', 'Status', 'status', '狀態', '在學/休學/退學']
};

function getFieldValue(row, targetField) {
  const mappings = ENROLLMENT_FIELD_MAPPINGS[targetField] || [];
  for (const key of mappings) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return row[key];
    }
  }
  return null;
}

/**
 * 匯入學期在學名冊
 * @param {string} filePath - Excel 路徑
 * @param {string} semesterId - 學期 ID（如 114-1）
 * @param {object} options - { overwriteWithThisSheet: boolean } 若 true，本次名冊未出現的學生將 isActive=false
 * @returns {Promise<{ imported, updated, skipped, errors, warnings, importBatchId }>}
 */
async function importEnrollment(filePath, semesterId, options = {}) {
  const overwrite = options.overwriteWithThisSheet ?? config.importOverwriteEnrollment;
  const importBatchId = `enrollment-${semesterId}-${Date.now()}`;
  const transaction = await sequelize.transaction();
  const errors = [];
  const warnings = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: null });

    // 確保學期存在
    let semester = await EtSemester.findByPk(semesterId, { transaction });
    if (!semester) {
      await EtSemester.create({
        id: semesterId,
        startDate: null,
        endDate: null,
        snapshotDate: null
      }, { transaction });
    }

    const seenStudentIds = new Set();

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
      const name = getFieldValue(row, 'name');
      const college = getFieldValue(row, 'college');
      const dept = getFieldValue(row, 'dept');
      const grade = getFieldValue(row, 'grade');
      const statusRaw = getFieldValue(row, 'status');
      const status = statusRaw ? String(statusRaw).trim() : '在學';
      const isActive = !['休學', '退學'].includes(status);

      seenStudentIds.add(studentId);

      try {
        await EtStudentMaster.upsert(
          {
            studentId,
            name: name || null,
            college: college || null,
            dept: dept || null
          },
          { transaction }
        );

        const [enrollment, created] = await EtEnrollmentSnapshot.findOrCreate({
          where: { semesterId, studentId },
          defaults: {
            semesterId,
            studentId,
            grade: grade || null,
            status,
            isActive,
            importBatchId
          },
          transaction
        });

        if (created) {
          imported++;
        } else {
          await enrollment.update(
            { grade: grade || enrollment.grade, status, isActive, importBatchId },
            { transaction }
          );
          updated++;
        }
      } catch (err) {
        errors.push({ row: rowNum, studentId, error: 'PROCESSING_ERROR', message: err.message });
        skipped++;
      }
    }

    if (overwrite) {
      const toDeactivate = await EtEnrollmentSnapshot.findAll({
        where: {
          semesterId,
          studentId: { [Op.notIn]: Array.from(seenStudentIds) }
        },
        transaction
      });
      for (const rec of toDeactivate) {
        await rec.update({ isActive: false, importBatchId }, { transaction });
        warnings.push({ studentId: rec.studentId, message: '已自名冊移除，設為不納入統計' });
      }
    }

    await transaction.commit();
    return {
      imported,
      updated,
      skipped,
      errors,
      warnings,
      importBatchId
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = {
  importEnrollment,
  getFieldValue,
  ENROLLMENT_FIELD_MAPPINGS
};
