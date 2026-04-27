'use strict';

const {
  sequelize,
  EtEnrollmentSnapshot,
  CourseEnrollment,
  MigrationBatch,
  MigrationQuarantine,
  EtAttemptImportHistory,
  JobRun
} = require('../../models');
const ljReadAggregate = require('../learningJourneyService');
const { getRiskStudentsBySemester } = require('./learningJourneyRiskService');
const { getLearningJourneyDataFreshness } = require('./dataFreshnessService');
const { getSemesterReconciliation, isValidSemesterId } = require('./reconciliationService');
const { getFallbackGovernanceSummary } = require('./learningJourneyFallbackLogger');
const { buildCanonicalPolicy } = require('./canonicalSemesterPolicyService');
const { getSemesterReadinessGate } = require('./readinessGateService');

function plain(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : row;
}

function statusRank(status) {
  if (status === 'error' || status === 'unknown') return 3;
  if (status === 'warning' || status === 'stale' || status === 'empty') return 2;
  return 1;
}

function worstStatus(statuses) {
  const filtered = statuses.filter(Boolean);
  if (!filtered.length) return 'unknown';
  return filtered.sort((a, b) => statusRank(b) - statusRank(a))[0];
}

async function getClassOverview(semesterId) {
  const rows = await EtEnrollmentSnapshot.findAll({
    where: { semesterId, isActive: true },
    attributes: [
      'department',
      'grade',
      [sequelize.fn('COUNT', sequelize.col('studentId')), 'studentCount']
    ],
    group: ['department', 'grade'],
    order: [
      ['department', 'ASC'],
      ['grade', 'ASC']
    ],
    raw: true
  });

  return rows.map((row) => ({
    department: row.department || '未填系所',
    grade: row.grade || '未填年級',
    studentCount: Number(row.studentCount || 0)
  }));
}

async function getCourseImportSummary(semesterId) {
  const [count, latest] = await Promise.all([
    CourseEnrollment.count({ where: { semesterId } }),
    CourseEnrollment.findOne({
      where: { semesterId },
      order: [['updatedAt', 'DESC'], ['id', 'DESC']]
    })
  ]);
  return {
    semesterId,
    courseEnrollmentCount: count,
    latestUpdatedAt: latest ? latest.updatedAt : null
  };
}

async function getImportGovernance(semesterId) {
  const [migrationBatches, quarantines, etAttemptImports] = await Promise.all([
    MigrationBatch.findAll({
      limit: 10,
      order: [['startedAt', 'DESC'], ['id', 'DESC']]
    }).catch((e) => ({ error: e.message })),
    MigrationQuarantine.findAll({
      limit: 20,
      order: [['createdAt', 'DESC'], ['id', 'DESC']]
    }).catch((e) => ({ error: e.message })),
    EtAttemptImportHistory.findAll({
      where: { semesterId },
      limit: 10,
      order: [['importedAt', 'DESC'], ['id', 'DESC']]
    }).catch((e) => ({ error: e.message }))
  ]);

  const batchRows = Array.isArray(migrationBatches) ? migrationBatches.map(plain) : [];
  const quarantineRows = Array.isArray(quarantines) ? quarantines.map(plain) : [];
  const etRows = Array.isArray(etAttemptImports) ? etAttemptImports.map(plain) : [];
  const latestBatch = batchRows[0] || null;

  return {
    migrationBatches: batchRows.map((b) => ({
      id: b.id,
      batchKey: b.batchKey,
      migrationName: b.migrationName,
      batchType: b.batchType,
      dryRun: b.dryRun,
      status: b.status,
      startedAt: b.startedAt,
      finishedAt: b.finishedAt,
      processedCount: b.processedCount,
      insertedCount: b.insertedCount,
      updatedCount: b.updatedCount,
      skippedCount: b.skippedCount,
      errorCount: b.errorCount,
      warningCount: b.warningCount,
      message: b.message
    })),
    latestBatchStatus: latestBatch ? latestBatch.status : 'none',
    quarantines: quarantineRows.map((q) => ({
      id: q.id,
      batchId: q.batchId,
      sourceTable: q.sourceTable,
      sourceKey: q.sourceKey,
      studentId: q.studentId,
      reasonCode: q.reasonCode,
      reason: q.reason || q.reasonMessage,
      createdAt: q.createdAt
    })),
    quarantineCount: quarantineRows.length,
    etAttemptImports: etRows.map((r) => ({
      id: r.id,
      importBatchId: r.importBatchId,
      importName: r.importName,
      importedAt: r.importedAt,
      importedCount: r.importedCount,
      skippedCount: r.skippedCount,
      errorCount: r.errorCount
    })),
    errors: [
      ...(migrationBatches && migrationBatches.error ? [{ source: 'migration_batch', message: migrationBatches.error }] : []),
      ...(quarantines && quarantines.error ? [{ source: 'migration_quarantine', message: quarantines.error }] : []),
      ...(etAttemptImports && etAttemptImports.error ? [{ source: 'et_attempt_import_histories', message: etAttemptImports.error }] : [])
    ]
  };
}

async function getRecentJobRuns(semesterId) {
  try {
    const rows = await JobRun.findAll({
      where: semesterId ? { semesterId } : {},
      limit: 10,
      order: [['startedAt', 'DESC'], ['id', 'DESC']]
    });
    return rows.map((row) => {
      const r = plain(row);
      return {
        id: r.id,
        jobName: r.jobName,
        semesterId: r.semesterId,
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        durationMs: r.durationMs,
        triggeredBy: r.triggeredBy,
        requestId: r.requestId,
        summaryJson: r.summaryJson,
        errorMessage: r.errorMessage
      };
    });
  } catch (e) {
    return { error: e.message, rows: [] };
  }
}

function buildCanonicalCoverage(freshness) {
  const sourceSections = freshness && Array.isArray(freshness.sections) ? freshness.sections : [];
  const canonicalKeys = [
    'student_semester_profiles',
    'exam_registrations',
    'exam_attempts',
    'activity_participations',
    'course_enrollments'
  ];
  const sections = canonicalKeys.map((key) => {
    const row = sourceSections.find((s) => s.key === key) || null;
    const recordCount = Number(row && row.recordCount || 0);
    const status = row ? row.status : 'unknown';
    return {
      key,
      recordCount,
      freshnessStatus: status,
      covered: recordCount > 0 && status !== 'unknown',
      message: row ? row.message : '尚未納入 freshness 檢查或查詢失敗'
    };
  });
  const coveredCount = sections.filter((s) => s.covered).length;
  return {
    sections,
    coveredCount,
    totalCount: sections.length,
    coverageRate: sections.length ? Number((coveredCount / sections.length).toFixed(4)) : 0,
    canonicalMissingSections: sections.filter((s) => !s.covered).map((s) => s.key)
  };
}

function buildCanonicalReadyStatus({ canonicalPolicy, canonicalCoverage, freshness, reconciliation, readiness }) {
  const freshnessBad = (freshness.sections || []).filter((s) => ['empty', 'unknown'].includes(s.status));
  const reconciliationErrors = [
    ...((reconciliation.sections || []).filter((s) => s.status === 'error')),
    ...((reconciliation.queryErrors || []))
  ];
  const missing = canonicalCoverage.canonicalMissingSections || [];
  const readinessBlocking = readiness && ['error', 'not_ready'].includes(readiness.status);
  const canonicalReady = missing.length === 0 && freshnessBad.length === 0 && reconciliationErrors.length === 0 && !readinessBlocking;
  return {
    ...canonicalPolicy,
    canonicalReady,
    status: canonicalReady ? 'ready' : canonicalPolicy.canonicalRequired ? 'not_ready' : 'not_required',
    blockingReasons: [
      ...missing.map((key) => `missing:${key}`),
      ...freshnessBad.map((s) => `freshness:${s.key}:${s.status}`),
      ...reconciliationErrors.map((s) => `reconciliation:${s.key || s.source || 'query_error'}`),
      ...(readinessBlocking ? [`readiness:${readiness.status}`] : [])
    ],
    readinessStatus: readiness ? readiness.status : 'unknown',
    readinessRecommendation: readiness ? readiness.recommendation : ''
  };
}

function buildRecommendations({ freshness, reconciliation, risk, imports, fallbackUsage, canonicalCoverage, canonicalReady }) {
  const recommendations = [];
  if ((freshness.sections || []).some((s) => s.status === 'stale' || s.status === 'empty' || s.status === 'unknown')) {
    recommendations.push('資料新鮮度存在 stale/empty/unknown，建議先執行同步或確認匯入來源。');
  }
  if ((reconciliation.sections || []).some((s) => s.status === 'warning' || s.status === 'error')) {
    recommendations.push('對帳結果仍有 warning/error，建議先處理來源與 canonical 差異。');
  }
  if (risk.metrics && Number(risk.metrics.riskCount || 0) > 0) {
    recommendations.push(`目前有 ${risk.metrics.riskCount} 位風險學生，建議行政端檢視高風險前段名單。`);
  }
  if (imports.quarantineCount > 0 || imports.latestBatchStatus === 'failed' || imports.latestBatchStatus === 'partial') {
    recommendations.push('匯入/同步治理仍有 quarantine 或失敗批次，建議先處理錯誤列。');
  }
  if (fallbackUsage.fallbackUsageCount > 0) {
    recommendations.push(`近期偵測到 ${fallbackUsage.fallbackUsageCount} 次 legacy fallback 使用，建議檢查 canonical coverage 與同步狀態。`);
  }
  if ((canonicalCoverage.canonicalMissingSections || []).length > 0) {
    recommendations.push(`Canonical coverage 尚未完整：${canonicalCoverage.canonicalMissingSections.join(', ')}。`);
  }
  if (canonicalReady && canonicalReady.canonicalRequired && !canonicalReady.canonicalReady) {
    recommendations.push(`此學期已要求 canonical，但尚未 ready：${canonicalReady.blockingReasons.join('；') || '請檢查 readiness。'}`);
  }
  if (!recommendations.length) {
    recommendations.push('目前治理摘要未見阻擋上線的明顯訊號，仍需完成正式 UAT 簽核。');
  }
  return recommendations;
}

async function getGovernanceOverview(semesterIdRaw) {
  const semesterId = String(semesterIdRaw || '').trim();
  if (!isValidSemesterId(semesterId)) {
    return { semesterId, status: 'error', error: 'semesterId 格式不正確' };
  }

  const [
    dashboard,
    risk,
    freshness,
    reconciliation,
    classOverview,
    courseImport,
    imports,
    jobRuns,
    readiness
  ] = await Promise.all([
    ljReadAggregate.getAggregatedSemesterDashboard(semesterId),
    getRiskStudentsBySemester(semesterId),
    getLearningJourneyDataFreshness(semesterId),
    getSemesterReconciliation(semesterId),
    getClassOverview(semesterId).catch((e) => ({ error: e.message, rows: [] })),
    getCourseImportSummary(semesterId).catch((e) => ({ error: e.message, courseEnrollmentCount: 0 })),
    getImportGovernance(semesterId),
    getRecentJobRuns(semesterId),
    getSemesterReadinessGate(semesterId).catch((e) => ({ status: 'error', error: e.message, recommendation: e.message }))
  ]);

  const freshnessStatus = worstStatus((freshness.sections || []).map((s) => s.status));
  const reconciliationStatus = worstStatus((reconciliation.sections || []).map((s) => s.status));
  const fallbackUsage = getFallbackGovernanceSummary(semesterId);
  const canonicalCoverage = buildCanonicalCoverage(freshness);
  const canonicalReady = buildCanonicalReadyStatus({
    canonicalPolicy: buildCanonicalPolicy(semesterId),
    canonicalCoverage,
    freshness,
    reconciliation,
    readiness
  });
  const importStatus = imports.errors.length || imports.quarantineCount > 0 || ['failed', 'partial'].includes(imports.latestBatchStatus)
    ? 'warning'
    : 'ok';
  const riskStatus = risk.status === 'error' ? 'error' : Number(risk.metrics && risk.metrics.riskCount || 0) > 0 ? 'warning' : 'ok';
  const fallbackStatus = fallbackUsage.fallbackUsageCount > 0 ? 'warning' : 'ok';
  const coverageStatus = canonicalCoverage.canonicalMissingSections.length > 0 ? 'warning' : 'ok';
  const overallStatus = worstStatus([freshnessStatus, reconciliationStatus, importStatus, riskStatus, fallbackStatus, coverageStatus]);

  const data = {
    semesterId,
    status: overallStatus,
    generatedAt: new Date().toISOString(),
    dashboard,
    classOverview: Array.isArray(classOverview) ? classOverview : [],
    classOverviewError: classOverview && classOverview.error ? classOverview.error : null,
    risk: {
      metrics: risk.metrics || {},
      topStudents: (risk.items || []).slice(0, 20),
      status: risk.status
    },
    freshness,
    reconciliation: {
      sections: reconciliation.sections || [],
      queryErrors: reconciliation.queryErrors || []
    },
    imports: {
      ...imports,
      courseImport
    },
    canonicalCoverage,
    canonicalReady,
    fallbackUsage: {
      ...fallbackUsage,
      canonicalMissingSections: canonicalCoverage.canonicalMissingSections
    },
    legacyApiUsageWarning: fallbackUsage.fallbackUsageCount > 0
      ? '偵測到 legacy fallback 使用；請確認是否為歷史學期查詢或 canonical sync 尚未完成。'
      : '',
    jobs: Array.isArray(jobRuns)
      ? {
          enabled: true,
          recent: jobRuns,
          message: jobRuns.length ? '已啟用 job_runs 自動化任務紀錄。' : '尚無此學期 job run 紀錄。'
        }
      : {
          enabled: false,
          recent: [],
          error: jobRuns && jobRuns.error,
          message: 'job_runs 查詢失敗；請確認 migration 是否已執行。'
        }
  };

  data.recommendations = buildRecommendations({ freshness, reconciliation, risk, imports, fallbackUsage, canonicalCoverage, canonicalReady });
  return data;
}

module.exports = {
  getGovernanceOverview
};
