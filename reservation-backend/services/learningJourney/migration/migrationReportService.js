function buildMigrationSummary(batchContext, stageResults = [], options = {}) {
  const status = options.status || 'completed';
  return {
    batchId: batchContext.batchId,
    batchKey: batchContext.batchKey,
    batchType: batchContext.batchType,
    dryRun: batchContext.dryRun,
    fromStage: batchContext.fromStage,
    startedAt: batchContext.startedAt,
    finishedAt: new Date().toISOString(),
    status,
    totals: {
      ...batchContext.stats,
      warnings: batchContext.warnings.length
    },
    scopeQuality: batchContext.scopeQuality || {
      scopeMismatchCount: 0,
      nonStandardSkillSetCount: 0
    },
    quarantineByReason: batchContext.quarantineByReason || {},
    stages: batchContext.stageSummaries,
    checkpoints: batchContext.checkpoints,
    warnings: batchContext.warnings || [],
    stageResults: stageResults.map((result) => ({
      stage: result.stage,
      message: result.result && result.result.message ? result.result.message : ''
    })),
    failure: options.failure || null
  };
}

function printSummary(summary) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(summary, null, 2));
}

module.exports = {
  buildMigrationSummary,
  printSummary
};
