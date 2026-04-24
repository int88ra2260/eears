/* eslint-disable no-console */
const { sequelize } = require('../models');
const { syncRolePermissionsIfNeeded } = require('../services/accessControl/writeService');
const { buildBasePermissionSet } = require('../auth/accessProfile');

function unique(arr) {
  return Array.from(new Set(arr));
}

function roleSeeds() {
  return [
    { role: 'admin', teacherLevel: null, roleKey: 'admin' },
    { role: 'worker', teacherLevel: null, roleKey: 'worker' },
    { role: 'teacher', teacherLevel: 'executive', roleKey: 'teacher:executive' },
    { role: 'teacher', teacherLevel: 'et_manager', roleKey: 'teacher:et_manager' },
    { role: 'teacher', teacherLevel: 'if_manager', roleKey: 'teacher:if_manager' },
    { role: 'teacher', teacherLevel: 'jt_manager', roleKey: 'teacher:jt_manager' },
    { role: 'teacher', teacherLevel: 'regular', roleKey: 'teacher:regular' },
  ];
}

async function run() {
  const tx = await sequelize.transaction();
  try {
    const summary = [];
    for (const seed of roleSeeds()) {
      const perms = unique(Array.from(buildBasePermissionSet({
        role: seed.role,
        teacherLevel: seed.teacherLevel,
      })));
      const result = await syncRolePermissionsIfNeeded(seed.roleKey, perms, { transaction: tx });
      summary.push({
        role: seed.role,
        teacherLevel: seed.teacherLevel,
        roleKey: seed.roleKey,
        permissionCount: result.count,
      });
    }
    await tx.commit();
    console.log(JSON.stringify({ ok: true, summary }, null, 2));
  } catch (err) {
    await tx.rollback();
    console.error('[seed-role-permissions] fatal', err);
    process.exit(1);
  }
}

run().then(() => process.exit(0));

