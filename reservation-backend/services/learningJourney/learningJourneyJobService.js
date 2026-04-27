'use strict';

const { sequelize, JobRun } = require('../../models');
const { getGovernanceOverview } = require('./governanceOverviewService');
const { getSemesterReconciliation, isValidSemesterId } = require('./reconciliationService');

const JOBS = {
  DAILY_GOVERNANCE: 'learning_journey_daily_governance',
  RECONCILE_SEMESTER: 'learning_journey_reconcile_semester'
};

function toPlain(row) {
  if (!row) return null;
  return typeof row.toJSON === 'function' ? row.toJSON() : row;
}

function normalizeLimit(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 20;
  return Math.min(Math.floor(n), 100);
}

function lockName(jobName, semesterId) {
  return `eears:lj:${jobName}:${semesterId || 'global'}`.slice(0, 64);
}

async function acquireLock(name) {
  const rows = await sequelize.query('SELECT GET_LOCK(:name, 0) AS acquired', {
    replacements: { name },
    type: sequelize.QueryTypes.SELECT
  });
  const raw = rows && rows[0] ? rows[0].acquired : 0;
  return raw === 1 || raw === '1' || raw === true;
}

async function releaseLock(name) {
  try {
    await sequelize.query('SELECT RELEASE_LOCK(:name) AS released', {
      replacements: { name },
      type: sequelize.QueryTypes.SELECT
    });
  } catch (error) {
    console.warn(`[learning-journey-job-lock] release failed lock=${name} error=${error.message}`);
  }
}

function summarizeGovernance(report) {
  return {
    status: report.status,
    generatedAt: report.generatedAt,
    recommendations: report.recommendations || [],
    fallbackUsageCount: report.fallbackUsage && report.fallbackUsage.fallbackUsageCount || 0,
    canonicalCoverageRate: report.canonicalCoverage && report.canonicalCoverage.coverageRate,
    staleSectionCount: ((report.freshness && report.freshness.sections) || [])
      .filter((s) => ['stale', 'empty', 'unknown'].includes(s.status)).length,
    quarantineCount: report.imports && report.imports.quarantineCount || 0,
    riskCount: report.risk && report.risk.metrics && report.risk.metrics.riskCount || 0
  };
}

function summarizeReconciliation(report) {
  const sections = report.sections || [];
  return {
    status: sections.some((s) => s.status === 'error') || report.error ? 'error' : sections.some((s) => s.status === 'warning') ? 'warning' : 'ok',
    sections: sections.map((s) => ({
      key: s.key,
      sourceCount: s.sourceCount,
      aggregateCount: s.aggregateCount,
      status: s.status
    })),
    queryErrorCount: (report.queryErrors || []).length
  };
}

async function createSkippedRun({ jobName, semesterId, triggeredBy, requestId, reason }) {
  const now = new Date();
  const row = await JobRun.create({
    jobName,
    semesterId,
    status: 'skipped',
    startedAt: now,
    finishedAt: now,
    durationMs: 0,
    triggeredBy,
    requestId,
    summaryJson: { reason },
    errorMessage: reason
  });
  return toPlain(row);
}

async function runWithJobRecord({ jobName, semesterId, triggeredBy = 'manual', requestId = null, runner }) {
  const normalizedSemester = String(semesterId || '').trim();
  if (!isValidSemesterId(normalizedSemester)) {
    return { error: 'semesterId 格式不正確', status: 'failed' };
  }
  const name = lockName(jobName, normalizedSemester);
  const locked = await acquireLock(name);
  if (!locked) {
    const skipped = await createSkippedRun({
      jobName,
      semesterId: normalizedSemester,
      triggeredBy,
      requestId,
      reason: '同一 job + semester 正在執行，已略過本次觸發'
    });
    return { error: 'JOB_ALREADY_RUNNING', status: 'skipped', jobRun: skipped };
  }

  const startedAt = new Date();
  const jobRun = await JobRun.create({
    jobName,
    semesterId: normalizedSemester,
    status: 'running',
    startedAt,
    triggeredBy,
    requestId
  });

  try {
    const result = await runner(normalizedSemester);
    const summaryJson = jobName === JOBS.DAILY_GOVERNANCE
      ? summarizeGovernance(result)
      : summarizeReconciliation(result);
    const finishedAt = new Date();
    const finalStatus = summaryJson.status === 'error' ? 'failed' : 'success';
    await jobRun.update({
      status: finalStatus,
      finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      summaryJson,
      errorMessage: finalStatus === 'failed' ? JSON.stringify(summaryJson).slice(0, 2000) : null
    });
    return { status: finalStatus, jobRun: toPlain(jobRun), result };
  } catch (error) {
    const finishedAt = new Date();
    await jobRun.update({
      status: 'failed',
      finishedAt,
      durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
      errorMessage: (error && error.stack) || (error && error.message) || String(error),
      summaryJson: { message: (error && error.message) || String(error) }
    });
    return { error: (error && error.message) || String(error), status: 'failed', jobRun: toPlain(jobRun) };
  } finally {
    await releaseLock(name);
  }
}

async function runDailyGovernanceJob({ semesterId, triggeredBy = 'manual', requestId = null } = {}) {
  return runWithJobRecord({
    jobName: JOBS.DAILY_GOVERNANCE,
    semesterId,
    triggeredBy,
    requestId,
    runner: getGovernanceOverview
  });
}

async function runReconcileSemesterJob({ semesterId, triggeredBy = 'manual', requestId = null } = {}) {
  return runWithJobRecord({
    jobName: JOBS.RECONCILE_SEMESTER,
    semesterId,
    triggeredBy,
    requestId,
    runner: getSemesterReconciliation
  });
}

async function listRecentJobRuns({ semesterId, limit } = {}) {
  const where = {};
  const sid = String(semesterId || '').trim();
  if (sid) where.semesterId = sid;
  const rows = await JobRun.findAll({
    where,
    limit: normalizeLimit(limit),
    order: [['startedAt', 'DESC'], ['id', 'DESC']]
  });
  return rows.map(toPlain);
}

module.exports = {
  JOBS,
  listRecentJobRuns,
  runDailyGovernanceJob,
  runReconcileSemesterJob
};
