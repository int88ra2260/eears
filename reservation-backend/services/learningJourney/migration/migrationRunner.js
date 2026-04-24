const {
  createBatchContext,
  startBatchLifecycle,
  finalizeBatchLifecycle,
  markStageSkipped,
  getBatchCheckpoints
} = require('./migrationCommonService');
const { migrateStudents } = require('./studentMigrationService');
const { migrateRegistrations } = require('./registrationMigrationService');
const { migrateAttempts } = require('./attemptMigrationService');
const { migrateActivities } = require('./activityMigrationService');
const { buildMigrationSummary } = require('./migrationReportService');
const { rebuildStudentSemesterProfile } = require('../learningJourneyRebuildService');

const STAGE_ALIASES = {
  registrations: 'exam_registrations',
  registration: 'exam_registrations',
  attempts: 'exam_attempts',
  attempt: 'exam_attempts',
  activities: 'activity_participations',
  activity: 'activity_participations'
};

const ALL_STAGES = [
  'students',
  'exam_registrations',
  'exam_attempts',
  'activity_participations'
];

const STAGE_EXECUTORS = {
  students: migrateStudents,
  exam_registrations: migrateRegistrations,
  exam_attempts: migrateAttempts,
  activity_participations: migrateActivities
};

function normalizeStageName(stageName) {
  if (!stageName) return null;
  return STAGE_ALIASES[stageName] || stageName;
}

async function rebuildProfilesForBestepAttempts(batchContext) {
  if (batchContext.dryRun) {
    return { skipped: true, reason: 'dry-run mode' };
  }

  const targets = Array.isArray(batchContext.rebuildTargets) ? batchContext.rebuildTargets : [];
  if (!targets.length) {
    return { skipped: true, reason: 'no affected student/semester targets' };
  }

  let rebuilt = 0;
  let skippedMissingSemester = 0;
  const semesterBreakdown = {};
  for (const target of targets) {
    if (!target.studentPk || !target.semesterId) {
      skippedMissingSemester += 1;
      continue;
    }
    const profile = await rebuildStudentSemesterProfile(target.studentPk, target.semesterId);
    if (profile) {
      rebuilt += 1;
      semesterBreakdown[target.semesterId] = (semesterBreakdown[target.semesterId] || 0) + 1;
    }
  }

  return {
    skipped: false,
    processed: targets.length,
    rebuilt,
    skippedMissingSemester,
    semesterBreakdown
  };
}

function resolveFinalBatchStatus({ hadError, startIndex }) {
  if (hadError) {
    return 'failed';
  }
  if (startIndex > 0) {
    // partial means this batch intentionally ran from a later stage
    // (previous stages are persisted as skipped checkpoints).
    return 'partial';
  }
  return 'completed';
}

async function runLearningJourneyMigration(input = {}) {
  const batchContext = createBatchContext(input);
  const stageResults = [];

  const selectedStagesRaw = Array.isArray(input.stages) && input.stages.length ? input.stages : ALL_STAGES;
  const selectedStages = Array.from(new Set(selectedStagesRaw.map(normalizeStageName).filter(Boolean)));
  const unknownStages = selectedStages.filter((stage) => !STAGE_EXECUTORS[stage]);
  if (unknownStages.length) {
    throw new Error(`Invalid --stages value(s): ${unknownStages.join(',')}`);
  }

  const stagePipeline = selectedStages.map((stage) => ({
    stage,
    execute: STAGE_EXECUTORS[stage]
  }));
  const fromStage = normalizeStageName(batchContext.fromStage);
  batchContext.fromStage = fromStage;
  if (batchContext.options && batchContext.options.simulateFailureStage) {
    batchContext.options.simulateFailureStage = normalizeStageName(batchContext.options.simulateFailureStage);
  }
  const startIndex = fromStage ? stagePipeline.findIndex((s) => s.stage === fromStage) : 0;
  if (fromStage && startIndex < 0) {
    throw new Error(`Invalid --from-stage value: ${fromStage}`);
  }

  for (const stageName of ALL_STAGES) {
    if (!selectedStages.includes(stageName)) {
      batchContext.stageSummaries[stageName] = {
        status: 'not_selected',
        processed: 0,
        inserted: 0,
        updated: 0,
        skipped: 0,
        duplicate: 0,
        quarantined: 0,
        errors: 0,
        warnings: []
      };
    }
  }

  await startBatchLifecycle(batchContext, stagePipeline);
  batchContext.previousCheckpoints = await getBatchCheckpoints({ batchKey: input.checkpointBatchKey || batchContext.batchKey });

  try {
    for (let i = 0; i < stagePipeline.length; i += 1) {
      const stage = stagePipeline[i];
      if (i < startIndex) {
        await markStageSkipped(stage.stage, batchContext, `skipped by --from-stage=${fromStage}`);
        stageResults.push({ stage: stage.stage, result: { message: 'skipped by from-stage' } });
        continue;
      }
      const result = await stage.execute(batchContext);
      stageResults.push({ stage: stage.stage, result });
    }

    const rebuildResult = await rebuildProfilesForBestepAttempts(batchContext);
    stageResults.push({
      stage: 'rebuild_profiles',
      result: {
        message: rebuildResult.skipped
          ? `profile rebuild skipped: ${rebuildResult.reason}`
          : `profile rebuild finished: ${rebuildResult.rebuilt}/${rebuildResult.processed}`,
        payload: rebuildResult
      }
    });

    const finalStatus = resolveFinalBatchStatus({ hadError: false, startIndex });
    const summary = buildMigrationSummary(batchContext, stageResults, { status: finalStatus });
    await finalizeBatchLifecycle(batchContext, {
      status: finalStatus,
      message: 'migration finished'
    });
    return summary;
  } catch (error) {
    const summary = buildMigrationSummary(batchContext, stageResults, {
      status: 'failed',
      failure: {
        message: error.message,
        name: error.name
      }
    });
    await finalizeBatchLifecycle(batchContext, {
      status: 'failed',
      message: error.message.slice(0, 500)
    });
    throw Object.assign(error, { migrationSummary: summary });
  }
}

module.exports = {
  runLearningJourneyMigration,
  getMigrationCheckpoints: getBatchCheckpoints,
  resolveFinalBatchStatus,
  ALL_STAGES
};
