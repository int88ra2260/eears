'use strict';

const { getSemesterReconciliation, isValidSemesterId } = require('./reconciliationService');
const { getEnglishTestSummaryCompare } = require('./englishTestSummaryV3Service');
const { compareEnglishTestStudents } = require('./englishTestStudentsV3Service');
const { compareEnglishTestStudentDetail } = require('./englishTestStudentDetailV3Service');
const englishTestReportService = require('../englishTestTracking/englishTestReportService');

const DETAIL_SAMPLE_SIZE = 10;

function isSummarySmallWarning(summaryCmp) {
  if (!summaryCmp || summaryCmp.status !== 'warning' || !summaryCmp.diff) return false;
  const d = summaryCmp.diff;
  const countsTight =
    Math.abs(Number(d.rosterActiveStudentCount || 0)) <= 1 &&
    Math.abs(Number(d.validBestScoreStudentCount || 0)) <= 1 &&
    Math.abs(Number(d.attainedStudentCount || 0)) <= 1;
  const rateOk = Math.abs(Number(d.attainmentRate || 0)) <= 0.001;
  const v3 = summaryCmp.v3;
  const warns = (v3 && v3.dataQuality && v3.dataQuality.warnings) || [];
  const hasErrorSev = warns.some((w) => w && w.severity === 'error');
  if (hasErrorSev) return false;
  const allZeroDiff =
    Math.abs(Number(d.rosterActiveStudentCount || 0)) === 0 &&
    Math.abs(Number(d.validBestScoreStudentCount || 0)) === 0 &&
    Math.abs(Number(d.attainedStudentCount || 0)) === 0 &&
    Math.abs(Number(d.attainmentRate || 0)) === 0;
  return allZeroDiff || (countsTight && rateOk);
}

function studentsListPass(stud) {
  if (!stud || stud.status === 'error') return false;
  const dc = Number(stud.diffCount || 0);
  const maxC = Math.max(Number(stud.legacyCount || 0), Number(stud.v3Count || 0), 1);
  return dc < 5 || dc / maxC < 0.05;
}

function isCriticalDetailCompare(row) {
  if (!row || row.status === 'error') return true;
  const diffs = row.diff || [];
  for (const d of diffs) {
    if (d.category === 'bestSkills') return true;
    if (d.category === 'attempts' && (d.field === 'count' || d.field === 'skillCefrSignature')) return true;
  }
  return false;
}

async function pickDetailSampleStudentIds(semesterId, limit) {
  try {
    const legacyRes = await englishTestReportService.getSemesterStudents(semesterId, { all: true, activeOnly: true });
    const items = (legacyRes && legacyRes.items) || [];
    const ids = items
      .map((r) => String((r && (r.studentId || r.student_id)) || '').trim().toUpperCase())
      .filter(Boolean);
    ids.sort();
    return ids.slice(0, limit);
  } catch (_) {
    return [];
  }
}

/**
 * Phase 5-13：整合對帳、summary／students compare 與學生詳情抽樣，產出試切換準備度。
 */
async function getSemesterReadinessGate(semesterIdRaw) {
  const semesterId = String(semesterIdRaw || '').trim();
  const checks = [];

  if (!isValidSemesterId(semesterId)) {
    checks.push({
      key: 'semester_id',
      label: '學期參數',
      status: 'error',
      message: 'semesterId 格式不正確（須如 114-1）',
      metrics: {}
    });
    return {
      semesterId,
      status: 'error',
      checks,
      recommendation: '請修正學期代碼後重試。'
    };
  }

  let recon = null;
  try {
    recon = await getSemesterReconciliation(semesterId);
  } catch (e) {
    checks.push({
      key: 'reconciliation',
      label: '資料對帳（reconciliation）',
      status: 'error',
      message: (e && e.message) || String(e),
      metrics: {}
    });
    return {
      semesterId,
      status: 'error',
      checks,
      recommendation: '對帳查詢失敗；請檢查資料庫連線與日誌後重試。'
    };
  }

  const queryErrors = recon.queryErrors || [];
  const sections = recon.sections || [];
  const sectionErrors = sections.filter((s) => s.status === 'error');
  const sectionWarnings = sections.filter((s) => s.status === 'warning');

  let reconCheckStatus = 'ok';
  let reconMessage = '各區塊無 error，且無 queryErrors';
  if (queryErrors.length > 0 || sectionErrors.length > 0) {
    reconCheckStatus = 'error';
    reconMessage = `queryErrors=${queryErrors.length}，區塊 error=${sectionErrors.length}`;
  } else if (sectionWarnings.length > 0) {
    reconCheckStatus = 'warning';
    reconMessage = `有 ${sectionWarnings.length} 個對帳區塊為 warning（來源與聚合筆數或差異清單不一致）`;
  }

  checks.push({
    key: 'reconciliation',
    label: '資料對帳（reconciliation）',
    status: reconCheckStatus,
    message: reconMessage,
    metrics: {
      queryErrorCount: queryErrors.length,
      sectionErrorCount: sectionErrors.length,
      sectionWarningCount: sectionWarnings.length,
      sectionStatuses: sections.map((s) => ({ key: s.key, status: s.status }))
    }
  });

  let summaryCmp = null;
  try {
    summaryCmp = await getEnglishTestSummaryCompare(semesterId);
  } catch (e) {
    checks.push({
      key: 'summary_compare',
      label: '儀表摘要比較（english-test-summary compare）',
      status: 'error',
      message: (e && e.message) || String(e),
      metrics: {}
    });
    return {
      semesterId,
      status: 'error',
      checks,
      recommendation: '摘要比較失敗；請檢查 legacy／v3 服務與日誌。'
    };
  }

  let summaryCheckStatus = 'ok';
  let summaryMessage = 'summary compare 為 ok';
  if (summaryCmp.status === 'error') {
    summaryCheckStatus = 'error';
    summaryMessage = 'legacy 或 v3 summary 回傳 error';
  } else if (summaryCmp.status === 'warning') {
    if (isSummarySmallWarning(summaryCmp)) {
      summaryCheckStatus = 'ok';
      summaryMessage = 'summary 為 warning 但差異在小幅門檻內（可接受）';
    } else {
      summaryCheckStatus = 'warning';
      summaryMessage = '主要指標與 legacy 差異超過小幅門檻';
    }
  }

  checks.push({
    key: 'summary_compare',
    label: '儀表摘要比較（english-test-summary compare）',
    status: summaryCheckStatus,
    message: summaryMessage,
    metrics: {
      compareStatus: summaryCmp.status,
      diff: summaryCmp.diff || null,
      smallWarningAccepted: summaryCmp.status === 'warning' && summaryCheckStatus === 'ok'
    }
  });

  let stud = null;
  try {
    stud = await compareEnglishTestStudents(semesterId);
  } catch (e) {
    checks.push({
      key: 'students_compare',
      label: '學生列表比較（english-test-students compare）',
      status: 'error',
      message: (e && e.message) || String(e),
      metrics: {}
    });
    return {
      semesterId,
      status: 'error',
      checks,
      recommendation: '學生列表比較失敗；請檢查 API 與日誌。'
    };
  }

  const studPass = studentsListPass(stud);
  let studCheckStatus = 'ok';
  let studMessage = 'diffCount 低於門檻（<5 或 <5%）';
  if (stud.status === 'error') {
    studCheckStatus = 'error';
    studMessage = stud.legacyError || stud.v3Error || stud.error || 'students compare error';
  } else if (!studPass) {
    studCheckStatus = 'warning';
    studMessage = 'diffCount 超過門檻（≥5 且 ≥5%）';
  }

  checks.push({
    key: 'students_compare',
    label: '學生列表比較（english-test-students compare）',
    status: studCheckStatus,
    message: studMessage,
    metrics: {
      legacyCount: stud.legacyCount,
      v3Count: stud.v3Count,
      diffCount: stud.diffCount,
      compareStatus: stud.status,
      thresholdPass: studPass
    }
  });

  const sampleIds = await pickDetailSampleStudentIds(semesterId, DETAIL_SAMPLE_SIZE);
  const detailRows = [];
  let detailFatal = false;
  for (const sid of sampleIds) {
    try {
      const row = await compareEnglishTestStudentDetail(semesterId, sid);
      detailRows.push({ studentId: sid, compare: row });
      if (row.status === 'error') detailFatal = true;
    } catch (e) {
      detailFatal = true;
      detailRows.push({
        studentId: sid,
        compare: { status: 'error', legacyError: (e && e.message) || String(e), diff: [] }
      });
    }
  }

  const criticalStudents = detailRows.filter((r) => isCriticalDetailCompare(r.compare));
  const errorStudents = detailRows.filter((r) => r.compare && r.compare.status === 'error');

  let detailCheckStatus = 'ok';
  let detailMessage = `抽樣 ${detailRows.length} 位，無 critical diff、無 compare error`;
  if (detailFatal || errorStudents.length > 0) {
    detailCheckStatus = 'error';
    detailMessage = `抽樣中有 ${errorStudents.length} 位無法完成比較（error）`;
  } else if (criticalStudents.length > 0) {
    detailCheckStatus = 'warning';
    detailMessage = `抽樣中有 ${criticalStudents.length} 位存在 critical diff（bestSkills 或 attempts 核心欄位）`;
  } else if (sampleIds.length === 0) {
    detailMessage = 'legacy 名冊上無學生可抽樣，略過詳情比對（不視為失敗）';
  }

  checks.push({
    key: 'detail_sample',
    label: `學生詳情抽樣比較（最多 ${DETAIL_SAMPLE_SIZE} 位）`,
    status: detailCheckStatus,
    message: detailMessage,
    metrics: {
      sampleSize: detailRows.length,
      errorStudentCount: errorStudents.length,
      criticalDiffStudentCount: criticalStudents.length,
      sampledStudentIds: sampleIds,
      samples: detailRows.map((r) => ({
        studentId: r.studentId,
        compareStatus: r.compare.status,
        diffCount: (r.compare.diff && r.compare.diff.length) || 0,
        critical: isCriticalDetailCompare(r.compare)
      }))
    }
  });

  const hasError = checks.some((c) => c.status === 'error');
  /** 對帳區塊 warning（來源≠聚合）不阻擋 ready，僅 error／queryErrors 阻擋（見 Phase 5-13 門檻說明） */
  const hasBlockingWarning = checks.some((c) => {
    if (c.status !== 'warning') return false;
    if (c.key === 'reconciliation') return false;
    if (c.key === 'summary_compare') return true;
    if (c.key === 'students_compare') return true;
    if (c.key === 'detail_sample') return true;
    return false;
  });

  let status = 'ready';
  let recommendation =
    '整體符合試切換門檻：可於營運確認後，再以環境變數 ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true 做試切換（請勿略過對帳與人工 spot check）。';

  if (hasError) {
    status = 'error';
    recommendation =
      '系統或查詢失敗：請修復錯誤後再評估。請勿在 error 狀態下手動開啟 read model flag。';
  } else if (hasBlockingWarning) {
    status = 'not_ready';
    if (studCheckStatus === 'warning' || summaryCheckStatus === 'warning') {
      recommendation =
        '摘要或學生列表與 legacy 差異超過門檻：需要人工檢查差異來源（匯入、同步、名冊）後再啟用 flag。';
    } else if (detailCheckStatus === 'warning') {
      recommendation =
        '抽樣學生詳情存在 bestSkills／attempts 等核心差異：需要人工檢查並釐清後再試切換。';
    } else {
      recommendation = '部分檢查未達 ready：請依 checks 逐項處理後再評估。';
    }
  } else if (reconCheckStatus === 'warning') {
    recommendation =
      '整體已達 ready，但對帳仍有區塊為 warning（來源與聚合不一致）：建議仍執行同步或人工釐清後再開 flag。';
  }

  return {
    semesterId,
    status,
    checks,
    recommendation
  };
}

module.exports = {
  getSemesterReadinessGate,
  DETAIL_SAMPLE_SIZE
};
