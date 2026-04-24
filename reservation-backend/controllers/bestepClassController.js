// controllers/bestepClassController.js
const ExcelJS = require('exceljs');
const { Class } = require('../models');
const { getClassBestepOverview, buildClassBestepExportData } = require('../services/bestepClassService');

function sanitizeFileName(name) {
  return String(name || '')
    .replace(/[\\/:*?"<>|]/g, '_')
    // 移除可能導致 HTTP header 失敗的控制字元
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * 取得班級 BESTEP 概況
 * GET /api/admin/classes/:classId/bestep-overview
 */
async function getBestepOverview(req, res, next) {
  try {
    const { classId } = req.params;
    const { semester, examType = 'all', page = 1, pageSize = 50, search = '' } = req.query;

    if (!semester) {
      return res.status(400).json({ error: '請指定學期' });
    }

    const result = await getClassBestepOverview(
      parseInt(classId),
      semester,
      examType,
      {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        search: search.trim()
      }
    );

    res.json(result);
  } catch (error) {
    console.error('取得班級 BESTEP 概況錯誤:', error);
    res.status(500).json({ error: error.message || '載入資料失敗' });
  }
}

/**
 * 匯出班級 BESTEP 概況 Excel
 * GET /api/admin/classes/:classId/bestep-overview/export?semester=114-1&examType=all&search=
 */
async function exportClassBestepOverview(req, res, next) {
  try {
    const { classId } = req.params;
    const { semester, examType = 'all', search = '' } = req.query;

    if (!semester) {
      return res.status(400).json({ error: '請指定學期' });
    }

    const numericClassId = parseInt(classId, 10);
    if (!numericClassId || isNaN(numericClassId)) {
      return res.status(400).json({ error: '無效的班級ID' });
    }

    const classRecord = await Class.findByPk(numericClassId);
    if (!classRecord) {
      return res.status(404).json({ error: '找不到班級' });
    }

    // 老師僅能匯出自己的班級（與班級明細匯出一致的權限檢查方式）
    if (req.user && req.user.role === 'teacher') {
      if (classRecord.teacherName !== req.user.name) {
        return res.status(403).json({ error: '您沒有權限匯出此班級' });
      }
    }

    const exportData = await buildClassBestepExportData(numericClassId, semester, examType, {
      search: String(search || '').trim()
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('BESTEP資料');

    worksheet.columns = [
      { header: '學號', key: 'studentId', width: 15 },
      { header: '姓名', key: 'studentName', width: 15 },
      { header: '個人報名項目', key: 'personalRegistrationItem', width: 22 },
      { header: '抵免項目', key: 'exemptionItem', width: 18 },
      { header: '出席狀況', key: 'attendanceStatus', width: 15 },
      { header: '聽力CEFR', key: 'listeningCEFR', width: 12 },
      { header: '閱讀CEFR', key: 'readingCEFR', width: 12 },
      { header: '寫作CEFR', key: 'writingCEFR', width: 12 },
      { header: '口說CEFR', key: 'speakingCEFR', width: 12 },
      { header: '團體報名', key: 'groupRegistrationLabel', width: 15 }
    ];

    // 表頭樣式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    (exportData.rows || []).forEach((row) => {
      worksheet.addRow(row);
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const safeClassName = sanitizeFileName(exportData.classInfo?.className || classRecord.name || `class-${classId}`);
    const fileName = `班級參與概況_BESTEP_${safeClassName}_${dateStr}.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    // 使用 filename*（UTF-8）+ filename（encode 後）確保 Node 不會因中文/特殊字元報錯
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getBestepOverview,
  exportClassBestepOverview
};
