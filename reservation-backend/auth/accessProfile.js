/**
 * 統一存取輪廓：將 JWT / Teacher 的 role + teacherLevel 映射為
 * scopes、permissions、以及與舊版相容的旗標。
 *
 * 規則集中於此檔；router 請勿再散落 if (role===...)。
 */

const { P } = require('./permissions');
const { SCOPE, ALL_SCOPES } = require('./scopes');
const { buildEffectiveAccessFromSources } = require('../services/accessControl/readService');
const logger = require('../utils/logger');

/**
 * @typedef {{
 *  id?: number|string,
 *  role?: string,
 *  teacherLevel?: string|null,
 *  permissions?: Record<string, boolean|null|undefined>|null,
 *  scopes?: string[]|null
 * }} UserLike
 */

/**
 * teacherLevel → 業務範圍（不含 admin/worker）
 * @param {string} teacherLevel
 * @returns {string[]}
 */
function baseScopesFromTeacherLevel(teacherLevel) {
  const level = teacherLevel || 'regular';
  switch (level) {
    case 'executive':
      return [SCOPE.ALL];
    case 'et_manager':
      return [SCOPE.ENGLISH_TABLE, SCOPE.SURVEY_ENGLISH_TABLE];
    case 'if_manager':
      return [SCOPE.INTERNATIONAL_FORUM];
    case 'jt_manager':
      return [SCOPE.JOB_TALK];
    case 'regular':
    default:
      return [SCOPE.CLASS];
  }
}

/**
 * @param {Set<string>} set
 * @param {string[]} list
 */
function addAll(set, list) {
  list.forEach((k) => set.add(k));
}

/**
 * 第一階段 base 權限映射（role + teacherLevel）
 * 第二階段：base + per-user overrides（user.permissions）
 */
function buildBasePermissionSet(user) {
  const role = user && user.role;
  const teacherLevel = (user && user.teacherLevel) || 'regular';
  const perms = new Set();

  if (role === 'admin') {
    Object.values(P).forEach((k) => perms.add(k));
    return perms;
  }

  if (role === 'teacher' && teacherLevel === 'executive') {
    // 第二階段：executive 不再等同 admin（系統級權限改為 admin only）
    addAll(perms, [
      // 帳號：可管理 teacher/worker（controller 另限制不可改 admin）
      P.CAN_MANAGE_ACCOUNTS,
      P.CAN_RESET_PASSWORDS,

      // 活動與預約
      P.CAN_VIEW_EVENTS_ADMIN,
      P.CAN_MANAGE_EVENTS,
      P.CAN_VIEW_RESERVATIONS,
      P.CAN_MANAGE_RESERVATIONS,
      P.CAN_EXPORT_RESERVATIONS,
      P.CAN_CHECKIN_STUDENTS,

      // 問卷
      P.CAN_VIEW_SURVEYS,
      P.CAN_MANAGE_SURVEYS,
      P.CAN_EXPORT_SURVEYS,
      P.CAN_MANAGE_SURVEY_SETTINGS,
      P.CAN_MANAGE_SURVEY_RULES,
      P.CAN_PUBLISH_SURVEYS,
      P.CAN_VIEW_SURVEY_RESPONSES,
      P.CAN_EXPORT_SURVEY_RESPONSES,
      P.CAN_VIEW_SURVEY_ANALYTICS,
      P.CAN_VIEW_SURVEY_HEALTH,
      P.CAN_EXECUTE_SURVEY_REPAIRS,
      P.CAN_MANAGE_SURVEY_ANSWER_MAPPING,
      P.CAN_VIEW_SURVEY_REPAIR_AUDIT,

      // 班級 / BESTEP
      P.CAN_VIEW_CLASSES,
      P.CAN_MANAGE_CLASSES,
      P.CAN_IMPORT_BESTEP,
      P.CAN_EXPORT_BESTEP,

      // 英檢
      P.CAN_VIEW_ENGLISH_TEST_METRICS,
      P.CAN_VIEW_ENGLISH_TESTS,
      P.CAN_MANAGE_ENGLISH_TESTS,
      P.CAN_REVIEW_ENGLISH_TEST_REGISTRATIONS,
      P.CAN_EXPORT_ENGLISH_TEST_DATA,
      P.CAN_MANAGE_ENGLISH_TEST_TRACKING,

      // 黑名單 / 違規
      P.CAN_VIEW_BLACKLIST,
      P.CAN_MANAGE_BLACKLIST,
      P.CAN_RECORD_VIOLATIONS,
      P.CAN_MANAGE_VIOLATIONS,

      // 分析 / 報表
      P.CAN_VIEW_ANALYTICS,
      P.CAN_EXPORT_REPORTS,

      // 系統設定（保留；feature flags / diagnostics / audit logs 改 admin-only）
      P.CAN_MANAGE_SETTINGS,

      // 公告（保留）
      P.CAN_MANAGE_ANNOUNCEMENTS,

      // 學習有伴管理端
      P.CAN_MANAGE_LEARNING_PARTNER_ADMIN,
    ]);
    return perms;
  }

  if (role === 'worker') {
    addAll(perms, [
      P.CAN_VIEW_EVENTS_ADMIN,
      P.CAN_VIEW_RESERVATIONS,
      P.CAN_EXPORT_RESERVATIONS,
      P.CAN_CHECKIN_STUDENTS,
      P.CAN_VIEW_BLACKLIST,
      P.CAN_RECORD_VIOLATIONS,
      P.CAN_MANAGE_VIOLATIONS,
      P.CAN_VIEW_ENGLISH_TEST_METRICS,
    ]);
    return perms;
  }

  if (role === 'teacher') {
    addAll(perms, [
      P.CAN_VIEW_CLASSES,
      P.CAN_VIEW_RESERVATIONS,
      P.CAN_EXPORT_RESERVATIONS,
      P.CAN_CHECKIN_STUDENTS,
      P.CAN_VIEW_BLACKLIST,
      P.CAN_RECORD_VIOLATIONS,
      P.CAN_MANAGE_VIOLATIONS,
    ]);

    if (teacherLevel === 'et_manager') {
      addAll(perms, [
        P.CAN_VIEW_EVENTS_ADMIN,
        P.CAN_VIEW_SURVEYS,
        P.CAN_EXPORT_SURVEYS,
        P.CAN_VIEW_SURVEY_RESPONSES,
        P.CAN_EXPORT_SURVEY_RESPONSES,
        P.CAN_VIEW_SURVEY_ANALYTICS,
        P.CAN_VIEW_SURVEY_HEALTH,
        P.CAN_EXECUTE_SURVEY_REPAIRS,
        P.CAN_MANAGE_SURVEY_ANSWER_MAPPING,
        P.CAN_VIEW_SURVEY_REPAIR_AUDIT,
      ]);
    }
    if (teacherLevel === 'if_manager' || teacherLevel === 'jt_manager') {
      addAll(perms, [P.CAN_VIEW_EVENTS_ADMIN]);
    }
    // regular：僅班級與現場協作相關，不看活動後台報表／問卷
    return perms;
  }

  return perms;
}

/**
 * per-user permission overrides（tri-state）
 * true：強制允許；false：強制禁止；undefined/null：不覆寫
 * @param {Set<string>} base
 * @param {Record<string, boolean|null|undefined>|null|undefined} overrides
 * @returns {{ final: Set<string>, applied: Record<string, boolean> }}
 */
function applyPermissionOverrides(base, overrides) {
  const final = new Set(base);
  /** @type {Record<string, boolean>} */
  const applied = {};
  if (!overrides || typeof overrides !== 'object') return { final, applied };

  for (const [key, val] of Object.entries(overrides)) {
    if (!Object.values(P).includes(key)) continue;
    if (val === true) {
      final.add(key);
      applied[key] = true;
    } else if (val === false) {
      final.delete(key);
      applied[key] = false;
    }
  }
  return { final, applied };
}

function normalizeScopes(scopes) {
  if (!Array.isArray(scopes)) return [];
  const set = new Set();
  for (const s of scopes) {
    if (typeof s !== 'string') continue;
    if (!ALL_SCOPES.includes(s)) continue;
    set.add(s);
  }
  return Array.from(set);
}

function buildAccessProfile(user) {
  const role = (user && user.role) || '';
  const teacherLevel = user && user.teacherLevel != null ? user.teacherLevel : 'regular';
  const isAdmin = role === 'admin';
  const isExecutive = role === 'teacher' && teacherLevel === 'executive';
  const isWorker = role === 'worker';
  const isTeacher = role === 'teacher';
  const hasAdminRights = isAdmin || isExecutive;

  // base scopes（role + teacherLevel）
  let baseScopes;
  if (isAdmin || isExecutive) {
    baseScopes = [SCOPE.ALL];
  } else if (isWorker) {
    baseScopes = [SCOPE.ALL];
  } else if (isTeacher) {
    baseScopes = baseScopesFromTeacherLevel(teacherLevel);
  } else {
    baseScopes = [];
  }

  // final scopes：若 user.scopes 有值，採「覆寫」模式（最保守，避免不小心 union 放寬）
  const scopeInput = user && user.__effectiveScopes !== undefined ? user.__effectiveScopes : (user && user.scopes);
  const scopeOverrides = scopeInput != null ? normalizeScopes(scopeInput) : null;
  const finalScopes = scopeOverrides && scopeOverrides.length ? scopeOverrides : baseScopes;

  const rawEffectiveBase = user && user.__effectiveBasePermissions;
  const hasEffectiveBaseArray = Array.isArray(rawEffectiveBase);
  // table_first 在 DB 尚無任何 role/user 列時會標為 json_fallback，但仍回傳 basePermissions: []。
  // 空陣列在此語意代表「尚未以表接管」，應回退到 buildBasePermissionSet（admin 全權等）。
  // json_only 同理：base 為空時僅 JWT 覆寫不足以代表「零權限」的 admin。
  const source = user && user.__effectiveSource;
  const emptyBaseMeansUseDefaults =
    hasEffectiveBaseArray &&
    rawEffectiveBase.length === 0 &&
    (source === 'json_fallback' || source === 'json_only');
  const basePermissionSet =
    hasEffectiveBaseArray && !emptyBaseMeansUseDefaults
      ? new Set(rawEffectiveBase)
      : buildBasePermissionSet(user);
  const permissionInput =
    user && user.__effectivePermissionOverrides !== undefined ? user.__effectivePermissionOverrides : (user && user.permissions);
  const permissionOverrides = permissionInput != null ? permissionInput : null;
  const { final: finalPermissionSet, applied: appliedPermissionOverrides } = applyPermissionOverrides(
    basePermissionSet,
    permissionOverrides
  );

  return {
    role,
    teacherLevel: isTeacher || isExecutive ? teacherLevel : teacherLevel || null,
    isAdmin,
    isExecutive,
    isWorker,
    isTeacher,
    hasAdminRights,

    baseScopes,
    scopeOverrides,
    finalScopes,

    basePermissions: Array.from(basePermissionSet).sort(),
    permissionOverrides,
    appliedPermissionOverrides,
    finalPermissions: Array.from(finalPermissionSet).sort(),

    permissionSet: finalPermissionSet,
    isAdmin,
    isExecutive,
  };
}

function isFlagEnabled(name, defaultValue = false) {
  const val = process.env[name];
  if (val == null || val === '') return defaultValue;
  return String(val).toLowerCase() === 'true' || String(val) === '1';
}

function getAccessProfileReadMode() {
  const tableReadEnabled = isFlagEnabled('ACCESS_PROFILE_ENABLE_TABLE_READ', true);
  if (!tableReadEnabled) return 'json_only';
  const tableFirst = isFlagEnabled('ACCESS_PROFILE_TABLE_FIRST', true);
  return tableFirst ? 'table_first' : 'json_first';
}

async function resolveEffectiveAccessSources(user) {
  if (!user || !user.id) return user;
  const mode = getAccessProfileReadMode();
  const effective = await buildEffectiveAccessFromSources({
    userId: user.id,
    role: user.role || null,
    teacherLevel: user.teacherLevel || null,
    jsonPermissions: user.permissions || null,
    jsonScopes: Array.isArray(user.scopes) ? user.scopes : null,
    mode,
  });
  if (effective?.consistency?.hasMismatch) {
    console.log(JSON.stringify({
      type: 'access_profile_source_mismatch',
      userId: user.id,
      role: user.role || null,
      teacherLevel: user.teacherLevel || null,
      source: effective.source,
      mode,
      permissionOverrideDiffKeys: {
        table: Object.keys(effective.consistency.permissionOverrideDiff.table || {}),
        fallback: Object.keys(effective.consistency.permissionOverrideDiff.fallback || {}),
      },
      scopeDiff: effective.consistency.scopeDiff || null,
    }));
    logger.warn('access profile table/json mismatch detected');
  }
  return {
    ...user,
    __effectiveBasePermissions: Array.isArray(effective.basePermissions) ? effective.basePermissions : [],
    __effectivePermissionOverrides: effective.permissionOverrides,
    __effectiveScopes: effective.scopeOverrides,
    __effectiveSource: effective.source,
    __effectiveFinalPermissions: effective.finalPermissions,
  };
}

/**
 * 附加在 req 上供後續 middleware 使用
 * @param {import('express').Request} req
 */
function attachAccessProfile(req) {
  if (!req.user) return null;
  const profile = buildAccessProfile(req.user);
  req.accessProfile = profile;
  return profile;
}

function hasPermission(user, permission) {
  const profile = buildAccessProfile(user);
  return profile.permissionSet.has(permission);
}

function hasAnyPermission(user, permissions) {
  if (!permissions || !permissions.length) return true;
  const profile = buildAccessProfile(user);
  return permissions.some((p) => profile.permissionSet.has(p));
}

function hasAllPermissions(user, permissions) {
  if (!permissions || !permissions.length) return true;
  const profile = buildAccessProfile(user);
  return permissions.every((p) => profile.permissionSet.has(p));
}

/**
 * eventType → scope 映射（第二階段：scope 正式化）
 */
function eventTypeToScope(eventType) {
  const t = String(eventType || '').trim();
  if (!t) return null;
  if (t === 'English Table') return SCOPE.ENGLISH_TABLE;
  if (t === 'International Forum') return SCOPE.INTERNATIONAL_FORUM;
  if (t === 'Job Talk') return SCOPE.JOB_TALK;
  // English Club、其他：目前不做 manager scope 控制（保守），僅 admin/worker 可視
  return null;
}

function hasScope(profile, scope) {
  if (!scope) return false;
  if (profile.finalScopes.includes(SCOPE.ALL)) return true;
  return profile.finalScopes.includes(scope);
}

/**
 * canAccessEventType：以 permission + scope 為主，teacherLevel 僅作 base 映射來源
 */
function canAccessEventType(user, eventType) {
  const profile = buildAccessProfile(user);
  if (profile.isAdmin) return true;
  if (profile.isWorker) return true;

  if (!profile.permissionSet.has(P.CAN_VIEW_EVENTS_ADMIN)) return false;
  const scope = eventTypeToScope(eventType);
  // 未映射者：僅 admin/worker；避免擴權
  if (!scope) return false;
  return hasScope(profile, scope);
}

/**
 * canAccessSurvey：以 permission + scope 為主
 */
function canAccessSurvey(user, surveyId) {
  const profile = buildAccessProfile(user);
  if (profile.isAdmin) return true;
  if (!profile.permissionSet.has(P.CAN_VIEW_SURVEYS) && !profile.permissionSet.has(P.CAN_EXPORT_SURVEYS)) return false;

  const id = String(surveyId || '');
  const isEnglishClubSurvey = id === 'english_club_feedback_114_1' || id.includes('english_club');
  // 第二階段先落地 ET 問卷 scope；EC 目前無獨立 scope，僅 ALL scope 可存取
  const isEnglishTableSurvey = id === 'english_table_feedback_114_1' || id.includes('english_table');
  if (isEnglishTableSurvey) {
    return hasScope(profile, SCOPE.SURVEY_ENGLISH_TABLE) || hasScope(profile, SCOPE.ENGLISH_TABLE);
  }
  if (isEnglishClubSurvey) {
    return hasScope(profile, SCOPE.ALL);
  }
  return false;
}

/** @deprecated 使用 buildAccessProfile；保留別名相容 */
function normalizeUserAccess(user) {
  return buildAccessProfile(user);
}

module.exports = {
  SCOPE,
  buildAccessProfile,
  resolveEffectiveAccessSources,
  getAccessProfileReadMode,
  attachAccessProfile,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessEventType,
  canAccessSurvey,
  normalizeUserAccess,
  baseScopesFromTeacherLevel,
  buildBasePermissionSet,
  eventTypeToScope,
};
