/* eslint-disable no-console */
const { sequelize } = require('../models');
const health = require('../services/surveyHealthService');
const readiness = require('../services/surveyReleaseReadinessService');
const repairs = require('../services/surveyRepairExecutionService');

function statusLine(level, msg) {
  console.log(`[${level}] ${msg}`);
}

async function main() {
  const out = { pass: [], warn: [], fail: [], recommendedActions: [] };
  try {
    await sequelize.authenticate();
    statusLine('PASS', 'DB connected');
    out.pass.push('DB connected');

    const ov = await health.getHealthOverview();
    const rh = await health.getRuleHealth();
    const rd = await readiness.getReleaseReadiness();
    const runs = await repairs.listRepairRuns({});

    if (ov.missingSemesterCount === 0) out.pass.push('semester linkage healthy');
    else out.warn.push(`semester linkage pending: ${ov.missingSemesterCount}`);

    if (ov.missingVersionCount === 0) out.pass.push('version linkage healthy');
    else out.warn.push(`version linkage pending: ${ov.missingVersionCount}`);

    if (ov.unmatchedAnswersCount === 0) out.pass.push('unmatched answers healthy');
    else out.warn.push(`unmatched answers detected: ${ov.unmatchedAnswersCount}`);

    if (rh.conflictCount === 0) out.pass.push('rule conflict healthy');
    else out.fail.push(`rule conflicts blocking: ${rh.conflictCount}`);

    if (runs.length > 0) out.pass.push('repair audit runs available');
    else out.warn.push('no repair runs yet');

    out.recommendedActions = rd.recommendedActions || [];
    out.readinessGate = rd.gate;

    statusLine('INFO', `Readiness gate: ${rd.gate}`);
    out.pass.forEach((x) => statusLine('PASS', x));
    out.warn.forEach((x) => statusLine('WARN', x));
    out.fail.forEach((x) => statusLine('FAIL', x));
    if (out.recommendedActions.length) {
      statusLine('INFO', 'Recommended Actions:');
      out.recommendedActions.forEach((x) => statusLine('INFO', `- ${x}`));
    }

    const hasFail = out.fail.length > 0;
    process.exit(hasFail ? 1 : 0);
  } catch (e) {
    statusLine('FAIL', e.message || String(e));
    process.exit(1);
  }
}

main();
