/* eslint-disable no-console */
const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'migration';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize, MigrationBatch, MigrationCheckpoint, MigrationQuarantine } = require('../models');
const { runLearningJourneyMigration } = require('../services/learningJourney/migration/migrationRunner');

async function printLastBatch(tag) {
  const batch = await MigrationBatch.findOne({ order: [['id', 'DESC']] });
  if (!batch) {
    console.log(`[${tag}] no batch found`);
    return;
  }
  const checkpoints = await MigrationCheckpoint.count({ where: { batchId: batch.id } });
  const quarantines = await MigrationQuarantine.count({ where: { batchId: batch.id } });
  console.log(JSON.stringify({
    tag,
    batchId: batch.id,
    batchKey: batch.batchKey,
    status: batch.status,
    dryRun: batch.dryRun,
    counts: {
      processed: batch.processedCount,
      inserted: batch.insertedCount,
      updated: batch.updatedCount,
      skipped: batch.skippedCount,
      duplicate: batch.duplicateCount,
      quarantined: batch.quarantinedCount,
      errors: batch.errorCount,
      warnings: batch.warningCount
    },
    checkpoints,
    quarantines
  }, null, 2));
}

async function run() {
  try {
    console.log('[verify] case1 normal run');
    await runLearningJourneyMigration({
      batchKey: `verify-normal-${Date.now()}`,
      options: { mockQuarantine: true }
    });
    await printLastBatch('normal');

    console.log('[verify] case2 dry-run');
    await runLearningJourneyMigration({
      batchKey: `verify-dry-${Date.now()}`,
      dryRun: true,
      options: { mockQuarantine: true }
    });
    await printLastBatch('dry-run');

    console.log('[verify] case3 failure run');
    try {
      await runLearningJourneyMigration({
        batchKey: `verify-fail-${Date.now()}`,
        options: { simulateFailureStage: 'exam_attempts' }
      });
    } catch (err) {
      console.log('[verify] failure captured as expected:', err.message);
    }
    await printLastBatch('failure');
  } catch (error) {
    console.error('[verify] fatal', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
