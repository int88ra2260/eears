/* eslint-disable no-console */
const path = require('path');
process.env.NODE_ENV = process.env.NODE_ENV || 'migration';
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const { runLearningJourneyMigration, getMigrationCheckpoints } = require('../services/learningJourney/migration/migrationRunner');
const { printSummary } = require('../services/learningJourney/migration/migrationReportService');

function getArgValue(name) {
  const arg = process.argv.find((item) => item.startsWith(`${name}=`));
  if (!arg) return null;
  const idx = arg.indexOf('=');
  return idx >= 0 ? arg.slice(idx + 1) : null;
}

function parseStagesArg(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function run() {
  try {
    const dryRun = process.argv.includes('--dry-run');
    const fromStage = getArgValue('--from-stage');
    const batchKey = getArgValue('--batch-key');
    const simulateFailureStage = getArgValue('--simulate-failure-stage');
    const mockQuarantine = process.argv.includes('--mock-quarantine');
    const stages = parseStagesArg(getArgValue('--stages'));
    const checkpointBatchKey = getArgValue('--checkpoint-batch-key');
    const showCheckpointsOnly = process.argv.includes('--show-checkpoints-only');

    if (showCheckpointsOnly) {
      const checkpoints = await getMigrationCheckpoints({ batchKey: checkpointBatchKey });
      printSummary({ checkpoints: checkpoints.map((c) => c.toJSON()) });
      process.exit(0);
    }

    const summary = await runLearningJourneyMigration({
      dryRun,
      fromStage,
      batchKey,
      stages,
      checkpointBatchKey,
      options: {
        simulateFailureStage,
        mockQuarantine
      }
    });
    printSummary(summary);
    process.exit(0);
  } catch (error) {
    console.error('[LJS migration] fatal', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
