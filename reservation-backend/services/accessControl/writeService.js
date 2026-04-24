const { UserPermissionOverride, UserScope, Teacher, RolePermission } = require('../../models');
const { P } = require('../../auth/permissions');
const { ALL_SCOPES } = require('../../auth/scopes');
const { normalizeRoleKey } = require('./readService');

function toOverrideRows(userId, jsonOverrides, actorId, source = 'phase3_dual_write') {
  if (!jsonOverrides || typeof jsonOverrides !== 'object') return [];
  const rows = [];
  for (const [permission, value] of Object.entries(jsonOverrides)) {
    if (!Object.values(P).includes(permission)) continue;
    if (value === true) {
      rows.push({ userId, permission, value: 'allow', updatedBy: actorId || null, source });
    } else if (value === false) {
      rows.push({ userId, permission, value: 'deny', updatedBy: actorId || null, source });
    }
  }
  return rows;
}

function toScopeRows(userId, jsonScopes, actorId, source = 'phase3_dual_write') {
  if (!Array.isArray(jsonScopes)) return [];
  const valid = Array.from(new Set(jsonScopes.filter((s) => typeof s === 'string' && ALL_SCOPES.includes(s))));
  return valid.map((scopeValue) => ({
    userId,
    scopeType: 'event',
    scopeValue,
    updatedBy: actorId || null,
    source,
  }));
}

async function syncPermissionOverrides(userId, jsonOverrides, actor, options = {}) {
  const { transaction, source = 'phase3_dual_write' } = options;
  const actorId = actor && actor.id ? actor.id : null;
  const rows = toOverrideRows(userId, jsonOverrides, actorId, source);

  await UserPermissionOverride.destroy({ where: { userId }, transaction });
  if (!rows.length) return { count: 0 };
  await UserPermissionOverride.bulkCreate(rows, { transaction });
  return { count: rows.length };
}

async function syncUserScopes(userId, jsonScopes, actor, options = {}) {
  const { transaction, source = 'phase3_dual_write' } = options;
  const actorId = actor && actor.id ? actor.id : null;
  const rows = toScopeRows(userId, jsonScopes, actorId, source);

  await UserScope.destroy({ where: { userId }, transaction });
  if (!rows.length) return { count: 0 };
  await UserScope.bulkCreate(rows, { transaction });
  return { count: rows.length };
}

async function bumpAccessVersion(userId, reason = 'access_changed', options = {}) {
  const { transaction } = options;
  await Teacher.increment('accessVersion', {
    by: 1,
    where: { id: userId },
    transaction,
  });
  return { userId, reason };
}

async function syncRolePermissionsIfNeeded(role, permissions, options = {}) {
  const { transaction } = options;
  if (!role || !Array.isArray(permissions)) return { count: 0 };
  const roleKey = normalizeRoleKey(role);
  await RolePermission.destroy({ where: { role: roleKey }, transaction });
  const rows = permissions.map((permission) => ({ role: roleKey, permission }));
  if (!rows.length) return { count: 0 };
  await RolePermission.bulkCreate(rows, { transaction });
  return { count: rows.length };
}

module.exports = {
  syncPermissionOverrides,
  syncUserScopes,
  bumpAccessVersion,
  syncRolePermissionsIfNeeded,
};

