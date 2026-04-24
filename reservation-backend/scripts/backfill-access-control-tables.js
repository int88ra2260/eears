/* eslint-disable no-console */
const { Teacher, sequelize } = require('../models');
const { syncPermissionOverrides, syncUserScopes } = require('../services/accessControl/writeService');

async function run() {
  const batchSize = Number(process.env.BACKFILL_BATCH_SIZE || 200);
  let offset = 0;
  let processed = 0;
  let permissionRows = 0;
  let scopeRows = 0;

  while (true) {
    const teachers = await Teacher.findAll({
      attributes: ['id', 'permissions', 'scopes'],
      order: [['id', 'ASC']],
      limit: batchSize,
      offset,
    });
    if (!teachers.length) break;

    for (const teacher of teachers) {
      const tx = await sequelize.transaction();
      try {
        const p = await syncPermissionOverrides(teacher.id, teacher.permissions || null, { id: null }, { transaction: tx, source: 'backfill' });
        const s = await syncUserScopes(teacher.id, Array.isArray(teacher.scopes) ? teacher.scopes : null, { id: null }, { transaction: tx, source: 'backfill' });
        await tx.commit();
        processed += 1;
        permissionRows += p.count;
        scopeRows += s.count;
      } catch (err) {
        await tx.rollback();
        console.error(`[backfill] teacher=${teacher.id} failed`, err.message);
      }
    }

    offset += teachers.length;
    console.log(`[backfill] processed=${processed} permissionRows=${permissionRows} scopeRows=${scopeRows}`);
  }

  console.log('[backfill] done', { processed, permissionRows, scopeRows });
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[backfill] fatal', err);
    process.exit(1);
  });

