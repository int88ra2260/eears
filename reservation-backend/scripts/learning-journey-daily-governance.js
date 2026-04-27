/**
 * Daily Learning Journey governance check.
 * Usage: node scripts/learning-journey-daily-governance.js --semesterId=114-1
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { sequelize } = require('../models');
const { runDailyGovernanceJob } = require('../services/learningJourney/learningJourneyJobService');

function arg(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((x) => String(x).startsWith(prefix));
  return found ? found.slice(prefix.length) : '';
}

(async () => {
  const semesterId = arg('semesterId');
  if (!semesterId) {
    console.error('Missing --semesterId=114-1');
    process.exitCode = 1;
    return;
  }

  const report = await runDailyGovernanceJob({
    semesterId,
    triggeredBy: 'scheduler',
    requestId: `lj-daily-${Date.now()}`
  });
  console.log(JSON.stringify(report, null, 2));
  if (report.status === 'failed' || report.status === 'skipped') {
    process.exitCode = 1;
  }
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close().catch(() => {});
  });
