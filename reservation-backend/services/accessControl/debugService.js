const { Teacher, RolePermission, UserPermissionOverride, UserScope } = require('../../models');
const { normalizeRoleKey, buildEffectiveAccessFromSources } = require('./readService');

function sortUnique(list) {
  return Array.from(new Set(list || [])).sort();
}

async function getUserBasicInfo(userId) {
  return Teacher.findByPk(userId, {
    attributes: ['id', 'role', 'teacherLevel', 'permissions', 'scopes', 'accessVersion', 'isActive'],
  });
}

async function getRolePermissions(roleKey) {
  if (!roleKey) return [];
  const rows = await RolePermission.findAll({
    where: { role: roleKey },
    attributes: ['permission', 'createdAt', 'updatedAt'],
    order: [['permission', 'ASC']],
  });
  return rows;
}

async function getUserOverrides(userId) {
  if (!userId) return [];
  return UserPermissionOverride.findAll({
    where: { userId },
    attributes: ['permission', 'value', 'source', 'updatedBy', 'createdAt', 'updatedAt'],
    order: [['permission', 'ASC']],
  });
}

async function getUserScopes(userId) {
  if (!userId) return [];
  return UserScope.findAll({
    where: { userId },
    attributes: ['scopeType', 'scopeValue', 'source', 'updatedBy', 'createdAt', 'updatedAt'],
    order: [['scopeType', 'ASC'], ['scopeValue', 'ASC']],
  });
}

async function getJsonPermissions(userId) {
  const t = await getUserBasicInfo(userId);
  return t ? (t.permissions || null) : null;
}

async function getJsonScopes(userId) {
  const t = await getUserBasicInfo(userId);
  return t ? (Array.isArray(t.scopes) ? t.scopes : null) : null;
}

async function buildEffectiveAccessTableFirst({ userId, role, teacherLevel, jsonPermissions, jsonScopes }) {
  return buildEffectiveAccessFromSources({
    userId,
    role,
    teacherLevel,
    jsonPermissions,
    jsonScopes,
    mode: 'table_first',
  });
}

async function buildEffectiveAccessJsonFirst({ userId, role, teacherLevel, jsonPermissions, jsonScopes }) {
  return buildEffectiveAccessFromSources({
    userId,
    role,
    teacherLevel,
    jsonPermissions,
    jsonScopes,
    mode: 'json_first',
  });
}

function diffAccess(tableResult, jsonResult) {
  const tablePerms = sortUnique(tableResult?.finalPermissions || []);
  const jsonPerms = sortUnique(jsonResult?.finalPermissions || []);
  const tableScopes = sortUnique(tableResult?.scopeOverrides || []);
  const jsonScopes = sortUnique(jsonResult?.scopeOverrides || []);
  return {
    permissionsOnlyInTable: tablePerms.filter((p) => !jsonPerms.includes(p)),
    permissionsOnlyInJson: jsonPerms.filter((p) => !tablePerms.includes(p)),
    scopesOnlyInTable: tableScopes.filter((s) => !jsonScopes.includes(s)),
    scopesOnlyInJson: jsonScopes.filter((s) => !tableScopes.includes(s)),
  };
}

function analyzeFallback(tableResult, jsonResult) {
  const source = tableResult?.source || 'unknown';
  const consistency = tableResult?.consistency || null;
  const required = source === 'json_fallback' || source === 'table_only_empty';
  const reason = required
    ? (source === 'json_fallback' ? 'table 缺少 base/override/scope，觸發 JSON fallback' : 'table-only 模式下 table 無資料')
    : 'NOT REQUIRED';
  return {
    required,
    source,
    reason,
    mismatch: consistency?.hasMismatch || false,
    consistency: consistency || null,
    jsonFirstSource: jsonResult?.source || 'unknown',
  };
}

function generateSuggestion(diffResult, data) {
  const hints = [];
  const rolePermissionsCount = (data?.table?.rolePermissions || []).length;
  const overrideCount = (data?.table?.overrides || []).length;
  const scopeCount = (data?.table?.scopes || []).length;
  if (!rolePermissionsCount) hints.push('RolePermissions 可能未 seed（base 權限為空）');
  if (!overrideCount) hints.push('此使用者無 override（屬正常，代表只吃 role base）');
  if (!scopeCount) hints.push('此使用者無 user_scopes（可能依 baseScopes 或無需 scope）');
  if (diffResult.permissionsOnlyInTable.length) hints.push('table 比 json 多權限，可能是 3.3 停寫 JSON 後的預期差異');
  if (diffResult.permissionsOnlyInJson.length) hints.push('json 比 table 多權限，請檢查 backfill/同步或是否漏寫 override');
  if (diffResult.scopesOnlyInJson.length || diffResult.scopesOnlyInTable.length) hints.push('scope 不一致，請檢查 user_scopes 與 legacy JSON scopes');
  if ((data?.basic?.accessVersion || 0) > (data?.tokenVersion || 0) && data?.tokenVersion != null) {
    hints.push('tokenVersion 落後於 DB accessVersion，可能觸發 ACCESS_PROFILE_STALE');
  }
  if (!hints.length) hints.push('table 與 json 看起來一致，未見明顯異常');
  return hints;
}

function explainPermission(permission, ctx) {
  const base = sortUnique((ctx?.table?.rolePermissions || []).map((r) => r.permission));
  const overrides = ctx?.table?.overrides || [];
  const matchedOverride = overrides.find((o) => o.permission === permission);
  const tableEffective = sortUnique(ctx?.effective?.tableFirst?.finalPermissions || []);
  const jsonEffective = sortUnique(ctx?.effective?.jsonFirst?.finalPermissions || []);
  return {
    permission,
    inRoleBase: base.includes(permission),
    override: matchedOverride ? { value: matchedOverride.value, source: matchedOverride.source || null } : null,
    inTableFirstEffective: tableEffective.includes(permission),
    inJsonFirstEffective: jsonEffective.includes(permission),
  };
}

module.exports = {
  normalizeRoleKey,
  getUserBasicInfo,
  getRolePermissions,
  getUserOverrides,
  getUserScopes,
  getJsonPermissions,
  getJsonScopes,
  buildEffectiveAccessTableFirst,
  buildEffectiveAccessJsonFirst,
  diffAccess,
  analyzeFallback,
  generateSuggestion,
  explainPermission,
};

