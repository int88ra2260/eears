const logger = require('../../../utils/logger');
const {
  MigrationBatch,
  MigrationCheckpoint,
  MigrationQuarantine
} = require('../../../models');

function createEmptyStats() {
  return {
    processed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    duplicate: 0,
    quarantined: 0,
    errors: 0,
    warnings: 0
  };
}

function createBatchContext(input = {}) {
  const now = new Date().toISOString();
  return {
    batchId: input.batchId || null,
    batchKey: input.batchKey || `ljs-${Date.now()}`,
    batchType: input.batchType || 'learning-journey-migration',
    dryRun: Boolean(input.dryRun),
    fromStage: input.fromStage || null,
    startedAt: input.startedAt || now,
    options: input.options || {},
    stats: createEmptyStats(),
    warnings: [],
    checkpoints: [],
    stageSummaries: {},
    memoryQuarantine: [],
    scopeQuality: {
      scopeMismatchCount: 0,
      nonStandardSkillSetCount: 0
    },
    quarantineByReason: {}
  };
}

function mergeStats(targetStats, partialStats = {}) {
  for (const key of Object.keys(targetStats)) {
    targetStats[key] += Number(partialStats[key] || 0);
  }
  return targetStats;
}

async function runStage(stageName, batchContext, stageHandler) {
  const stageStartedAt = new Date().toISOString();
  logger.info(`[LJS migration] stage start: ${stageName}`, {
    batchKey: batchContext.batchKey,
    batchId: batchContext.batchId,
    stageStartedAt
  });

  const checkpoint = await MigrationCheckpoint.create({
    batchId: batchContext.batchId,
    stepName: stageName,
    stageName,
    status: 'running',
    startedAt: stageStartedAt,
    message: batchContext.dryRun ? 'stage started (dry-run)' : 'stage started',
    payloadJson: null,
    checkpointData: null
  });

  try {
    const result = await stageHandler(batchContext);
    const stageStats = Object.assign(createEmptyStats(), result && result.stats ? result.stats : {});
    mergeStats(batchContext.stats, stageStats);
    const checkpointData = {
      stageName,
      status: 'completed',
      message: result && result.message ? result.message : 'ok',
      payload: result && result.payload ? result.payload : null,
      stats: stageStats,
      startedAt: stageStartedAt,
      finishedAt: new Date().toISOString()
    };
    batchContext.checkpoints.push(checkpointData);
    batchContext.stageSummaries[stageName] = {
      status: 'completed',
      ...stageStats,
      warnings: result && Array.isArray(result.warnings) ? result.warnings : [],
      scopeQuality: result && result.scopeQuality ? result.scopeQuality : undefined,
      quarantineByReason: result && result.quarantineByReason ? result.quarantineByReason : undefined
    };

    if (result && result.scopeQuality) {
      batchContext.scopeQuality.scopeMismatchCount += Number(result.scopeQuality.scopeMismatchCount || 0);
      batchContext.scopeQuality.nonStandardSkillSetCount += Number(result.scopeQuality.nonStandardSkillSetCount || 0);
    }
    if (result && result.quarantineByReason) {
      for (const [reasonCode, count] of Object.entries(result.quarantineByReason)) {
        batchContext.quarantineByReason[reasonCode] = (batchContext.quarantineByReason[reasonCode] || 0) + Number(count || 0);
      }
    }

    await checkpoint.update({
      status: 'completed',
      finishedAt: checkpointData.finishedAt,
      processedCount: stageStats.processed,
      insertedCount: stageStats.inserted,
      updatedCount: stageStats.updated,
      skippedCount: stageStats.skipped,
      duplicateCount: stageStats.duplicate,
      quarantinedCount: stageStats.quarantined,
      errorCount: stageStats.errors,
      message: checkpointData.message,
      payloadJson: checkpointData.payload,
      checkpointData: checkpointData
    });
    return result;
  } catch (error) {
    batchContext.stats.errors += 1;
    const checkpointData = {
      stageName,
      status: 'failed',
      message: error.message,
      payload: {
        name: error.name,
        message: error.message,
        stack: error.stack ? String(error.stack).split('\n').slice(0, 4).join('\n') : undefined
      },
      stats: createEmptyStats(),
      startedAt: stageStartedAt,
      finishedAt: new Date().toISOString()
    };
    batchContext.checkpoints.push(checkpointData);
    batchContext.stageSummaries[stageName] = {
      status: 'failed',
      ...createEmptyStats(),
      warnings: []
    };
    await checkpoint.update({
      status: 'failed',
      finishedAt: checkpointData.finishedAt,
      errorCount: 1,
      message: error.message.slice(0, 500),
      payloadJson: checkpointData.payload,
      checkpointData: checkpointData
    });
    logger.error(`[LJS migration] stage failed: ${stageName}`, error);
    throw error;
  }
}

async function markStageSkipped(stageName, batchContext, reason) {
  const stats = createEmptyStats();
  stats.skipped = 1;
  mergeStats(batchContext.stats, stats);
  const checkpointData = {
    stageName,
    status: 'skipped',
    message: reason || 'stage skipped by runner',
    payload: null,
    stats,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString()
  };
  batchContext.checkpoints.push(checkpointData);
  batchContext.stageSummaries[stageName] = {
    status: 'skipped',
    ...stats,
    warnings: []
  };
  await MigrationCheckpoint.create({
    batchId: batchContext.batchId,
    stepName: stageName,
    stageName,
    status: 'skipped',
    startedAt: checkpointData.startedAt,
    finishedAt: checkpointData.finishedAt,
    processedCount: 0,
    insertedCount: 0,
    updatedCount: 0,
    skippedCount: 1,
    duplicateCount: 0,
    quarantinedCount: 0,
    errorCount: 0,
    message: checkpointData.message,
    payloadJson: null,
    checkpointData
  });
}

async function recordQuarantine(batchContext, payload = {}) {
  const normalizedPayload = {
    stageName: payload.stageName || 'unknown',
    sourceType: payload.sourceType || null,
    sourceRef: payload.sourceRef || null,
    studentId: payload.studentId || null,
    reasonCode: payload.reasonCode || 'UNKNOWN_DATA_ISSUE',
    reasonMessage: payload.reasonMessage || 'unspecified data issue',
    rawPayload: payload.rawPayload || null
  };
  batchContext.quarantineByReason[normalizedPayload.reasonCode] = (batchContext.quarantineByReason[normalizedPayload.reasonCode] || 0) + 1;

  if (batchContext.dryRun) {
    batchContext.memoryQuarantine.push(normalizedPayload);
    return { dryRun: true };
  }

  try {
    await MigrationQuarantine.create({
      batchId: batchContext.batchId,
      stageName: normalizedPayload.stageName,
      sourceType: normalizedPayload.sourceType,
      sourceRef: normalizedPayload.sourceRef,
      studentId: normalizedPayload.studentId,
      reasonCode: normalizedPayload.reasonCode,
      reasonMessage: normalizedPayload.reasonMessage,
      rawPayload: normalizedPayload.rawPayload,
      sourceTable: normalizedPayload.sourceType || 'unknown',
      sourceKey: normalizedPayload.sourceRef || null,
      reason: normalizedPayload.reasonMessage,
      payloadJson: normalizedPayload.rawPayload
    });
    return { dryRun: false };
  } catch (error) {
    logger.error('[LJS migration] failed to persist quarantine record', error);
    return { dryRun: false, failed: true };
  }
}

async function startBatchLifecycle(batchContext, stagePipeline = []) {
  try {
    const row = await MigrationBatch.create({
      batchKey: batchContext.batchKey,
      migrationName: 'learning_journey',
      batchType: batchContext.batchType,
      dryRun: batchContext.dryRun,
      status: 'running',
      startedAt: batchContext.startedAt,
      stageListJson: stagePipeline.map((s) => s.stage),
      summaryJson: {
        dryRun: batchContext.dryRun,
        stages: {},
        totals: createEmptyStats()
      }
    });
    batchContext.batchId = row.id;
    return row;
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_ENTRY') {
      throw new Error(`batchKey already exists: ${batchContext.batchKey}`);
    }
    throw error;
  }
}

async function finalizeBatchLifecycle(batchContext, { status, message } = {}) {
  const finalStatus = status || 'completed';
  const summary = {
    dryRun: batchContext.dryRun,
    fromStage: batchContext.fromStage,
    stages: batchContext.stageSummaries,
    totals: {
      ...batchContext.stats,
      warnings: batchContext.warnings.length
    },
    warnings: batchContext.warnings,
    checkpoints: batchContext.checkpoints
  };

  if (batchContext.batchId) {
    await MigrationBatch.update({
      status: finalStatus,
      finishedAt: new Date().toISOString(),
      processedCount: batchContext.stats.processed,
      insertedCount: batchContext.stats.inserted,
      updatedCount: batchContext.stats.updated,
      skippedCount: batchContext.stats.skipped,
      duplicateCount: batchContext.stats.duplicate,
      quarantinedCount: batchContext.stats.quarantined,
      errorCount: batchContext.stats.errors,
      warningCount: batchContext.warnings.length,
      message: message || null,
      summaryJson: summary
    }, {
      where: { id: batchContext.batchId }
    });
  }

  return summary;
}

async function getBatchCheckpoints({ batchId, batchKey } = {}) {
  if (batchId) {
    return MigrationCheckpoint.findAll({ where: { batchId }, order: [['id', 'ASC']] });
  }
  if (batchKey) {
    const batch = await MigrationBatch.findOne({ where: { batchKey } });
    if (!batch) return [];
    return MigrationCheckpoint.findAll({ where: { batchId: batch.id }, order: [['id', 'ASC']] });
  }
  const latestBatch = await MigrationBatch.findOne({ order: [['id', 'DESC']] });
  if (!latestBatch) return [];
  return MigrationCheckpoint.findAll({ where: { batchId: latestBatch.id }, order: [['id', 'ASC']] });
}

module.exports = {
  createEmptyStats,
  createBatchContext,
  mergeStats,
  runStage,
  markStageSkipped,
  recordQuarantine,
  startBatchLifecycle,
  finalizeBatchLifecycle,
  getBatchCheckpoints
};
