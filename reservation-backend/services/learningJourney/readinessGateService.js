'use strict';

const { getSemesterReconciliation, isValidSemesterId } = require('./reconciliationService');
const { getEnglishTestSummaryV3 } = require('./englishTestSummaryV3Service');
const { getEnglishTestStudentsV3 } = require('./englishTestStudentsV3Service');

/**
 * Phase 1.5：僅檢查 V3/et_* read path，不再依賴 legacy 對照或橋接。
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

  let summary = null;
  try {
    summary = await getEnglishTestSummaryV3(semesterId);
  } catch (e) {
    checks.push({
      key: 'summary_v3',
      label: 'V3 英檢摘要',
      status: 'error',
      message: (e && e.message) || String(e),
      metrics: {}
    });
    return {
      semesterId,
      status: 'error',
      checks,
      recommendation: 'V3 摘要查詢失敗；請檢查 et_enrollment_snapshots／et_exam_attempts／et_exam_attempt_skill_scores。'
    };
  }

  const summaryWarnings = (summary.dataQuality && summary.dataQuality.warnings) || [];
  const summaryHasError = !!summary.error || summaryWarnings.some((w) => w && w.severity === 'error');
  const summaryHasWarning = summaryWarnings.some((w) => w && w.severity === 'warning');
  const summaryCheckStatus = summaryHasError ? 'error' : summaryHasWarning ? 'warning' : 'ok';
  const summaryMessage = summaryHasError
    ? (summary.error || 'V3 摘要存在 error 級資料品質警示')
    : summaryHasWarning
      ? 'V3 摘要存在資料品質警示'
      : 'V3 摘要可讀取';

  checks.push({
    key: 'summary_v3',
    label: 'V3 英檢摘要',
    status: summaryCheckStatus,
    message: summaryMessage,
    metrics: {
      rosterActiveStudentCount: summary.rosterActiveStudentCount,
      validBestScoreStudentCount: summary.validBestScoreStudentCount,
      attainedStudentCount: summary.attainedStudentCount,
      warningCount: summaryWarnings.length
    }
  });

  let students = null;
  try {
    students = await getEnglishTestStudentsV3(semesterId, { all: true });
  } catch (e) {
    checks.push({
      key: 'students_v3',
      label: 'V3 學生列表',
      status: 'error',
      message: (e && e.message) || String(e),
      metrics: {}
    });
    return {
      semesterId,
      status: 'error',
      checks,
      recommendation: 'V3 學生列表查詢失敗；請檢查 et_* read path。'
    };
  }

  const studentWarnings = (students.dataQuality && students.dataQuality.warnings) || [];
  const studCheckStatus = students.error
    ? 'error'
    : studentWarnings.some((w) => w && w.severity === 'error')
      ? 'error'
      : studentWarnings.some((w) => w && w.severity === 'warning')
        ? 'warning'
        : 'ok';
  const studMessage = students.error || (studCheckStatus === 'warning' ? 'V3 學生列表存在資料品質警示' : 'V3 學生列表可讀取');

  checks.push({
    key: 'students_v3',
    label: 'V3 學生列表',
    status: studCheckStatus,
    message: studMessage,
    metrics: {
      total: students.pagination ? students.pagination.total : 0,
      returned: students.pagination ? students.pagination.returned : 0,
      warningCount: studentWarnings.length
    }
  });

  const hasError = checks.some((c) => c.status === 'error');
  /** 對帳區塊 warning（來源≠聚合）不阻擋 ready，僅 error／queryErrors 阻擋（見 Phase 5-13 門檻說明） */
  const hasBlockingWarning = checks.some((c) => {
    if (c.status !== 'warning') return false;
    if (c.key === 'reconciliation') return false;
    if (c.key === 'summary_v3') return true;
    if (c.key === 'students_v3') return true;
    return false;
  });

  let status = 'ready';
  let recommendation =
    'V3/et_* read path 可讀取；可進入後續人工 UAT 與 Phase 2 規劃。';

  if (hasError) {
    status = 'error';
    recommendation =
      '系統或查詢失敗：請修復錯誤後再評估。請勿在 error 狀態下手動開啟 read model flag。';
  } else if (hasBlockingWarning) {
    status = 'not_ready';
    if (studCheckStatus === 'warning' || summaryCheckStatus === 'warning') {
      recommendation =
        'V3 摘要或學生列表存在資料品質警示：需要人工檢查 et_* 匯入資料後再進 Phase 2。';
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
  getSemesterReadinessGate
};
