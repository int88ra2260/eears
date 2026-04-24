/**
 * 前端存取控制：規則與後端 auth/accessProfile.js 對齊
 * @typedef {{ role: string, teacherLevel?: string|null }} UserLike
 */

import { P } from '../constants/permissions';
import { SCOPE, ALL_SCOPES } from '../constants/scopes';
import { parseJwtPayload } from './jwtPayload';

function addAll(set, list) {
  list.forEach((k) => set.add(k));
}

function buildBasePermissionSet(user) {
  const role = user && user.role;
  const teacherLevel = (user && user.teacherLevel) || 'regular';
  const perms = new Set();

  if (role === 'admin') {
    Object.values(P).forEach((k) => perms.add(k));
    return perms;
  }

  if (role === 'teacher' && teacherLevel === 'executive') {
    addAll(perms, [
      P.CAN_MANAGE_ACCOUNTS,
      P.CAN_RESET_PASSWORDS,
      P.CAN_VIEW_EVENTS_ADMIN,
      P.CAN_MANAGE_EVENTS,
      P.CAN_VIEW_RESERVATIONS,
      P.CAN_EXPORT_RESERVATIONS,
      P.CAN_CHECKIN_STUDENTS,
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
      P.CAN_VIEW_CLASSES,
      P.CAN_MANAGE_CLASSES,
      P.CAN_IMPORT_BESTEP,
      P.CAN_EXPORT_BESTEP,
      P.CAN_VIEW_ENGLISH_TEST_METRICS,
      P.CAN_VIEW_ENGLISH_TESTS,
      P.CAN_MANAGE_ENGLISH_TESTS,
      P.CAN_REVIEW_ENGLISH_TEST_REGISTRATIONS,
      P.CAN_EXPORT_ENGLISH_TEST_DATA,
      P.CAN_MANAGE_ENGLISH_TEST_TRACKING,
      P.CAN_VIEW_BLACKLIST,
      P.CAN_MANAGE_BLACKLIST,
      P.CAN_RECORD_VIOLATIONS,
      P.CAN_MANAGE_VIOLATIONS,
      P.CAN_VIEW_ANALYTICS,
      P.CAN_EXPORT_REPORTS,
      P.CAN_MANAGE_SETTINGS,
      P.CAN_MANAGE_ANNOUNCEMENTS,
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
    return perms;
  }

  return perms;
}

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
    default:
      return [SCOPE.CLASS];
  }
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

function applyPermissionOverrides(base, overrides) {
  const final = new Set(base);
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

/**
 * @param {string|null|undefined} token - JWT
 * @param {string} [fallbackRole]
 * @returns {UserLike & { permissionSet: Set<string>, finalPermissions: string[], basePermissions: string[], baseScopes: string[], finalScopes: string[], permissionOverrides: any, scopeOverrides: any, isAdmin: boolean, isExecutive: boolean, hasAdminRights: boolean, isWorker: boolean, isTeacher: boolean }}
 */
export function buildAccessProfile(token, fallbackRole = '') {
  let role = fallbackRole || '';
  let teacherLevel = 'regular';
  let permissionOverrides = null;
  let scopeOverrides = null;

  if (token) {
    try {
      const payload = parseJwtPayload(token);
      if (payload) {
        if (payload.role) role = payload.role;
        teacherLevel = payload.teacherLevel || 'regular';
        permissionOverrides = payload.permissions || null;
        scopeOverrides = Array.isArray(payload.scopes) ? payload.scopes : null;
      }
    } catch (_) {
      /* ignore */
    }
  }

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isWorker = role === 'worker';
  const isExecutive = isTeacher && teacherLevel === 'executive';
  const hasAdminRights = isAdmin || isExecutive;

  const userLike = {
    role,
    teacherLevel: isTeacher || isExecutive ? teacherLevel : teacherLevel || null,
    permissions: permissionOverrides,
    scopes: scopeOverrides,
  };

  const basePermissionsSet = buildBasePermissionSet(userLike);
  const { final: permissionSet, applied: appliedPermissionOverrides } = applyPermissionOverrides(
    basePermissionsSet,
    permissionOverrides
  );

  let baseScopes;
  if (isAdmin || isExecutive) baseScopes = [SCOPE.ALL];
  else if (isWorker) baseScopes = [SCOPE.ALL];
  else if (isTeacher) baseScopes = baseScopesFromTeacherLevel(teacherLevel);
  else baseScopes = [];

  const normalizedOverrides = scopeOverrides != null ? normalizeScopes(scopeOverrides) : null;
  const finalScopes = normalizedOverrides && normalizedOverrides.length ? normalizedOverrides : baseScopes;

  return {
    role,
    teacherLevel: userLike.teacherLevel,
    permissionSet,
    basePermissions: Array.from(basePermissionsSet).sort(),
    permissionOverrides,
    appliedPermissionOverrides,
    finalPermissions: Array.from(permissionSet).sort(),
    baseScopes,
    scopeOverrides: normalizedOverrides,
    finalScopes,
    isAdmin,
    isExecutive,
    hasAdminRights,
    isWorker,
    isTeacher,
  };
}

export function hasPermission(profile, permission) {
  return profile.permissionSet.has(permission);
}

export function hasAnyPermission(profile, permissions) {
  if (!permissions || !permissions.length) return true;
  return permissions.some((p) => profile.permissionSet.has(p));
}

export function hasAllPermissions(profile, permissions) {
  if (!permissions || !permissions.length) return true;
  return permissions.every((p) => profile.permissionSet.has(p));
}

export function canAccessEventType(profile, eventType) {
  if (profile.isAdmin) return true;
  if (profile.isWorker) return true;
  if (!profile.permissionSet.has(P.CAN_VIEW_EVENTS_ADMIN)) return false;

  const t = String(eventType || '').trim();
  let scope = null;
  if (t === 'English Table') scope = SCOPE.ENGLISH_TABLE;
  else if (t === 'International Forum') scope = SCOPE.INTERNATIONAL_FORUM;
  else if (t === 'Job Talk') scope = SCOPE.JOB_TALK;
  else scope = null;
  if (!scope) return false;
  if (profile.finalScopes.includes(SCOPE.ALL)) return true;
  return profile.finalScopes.includes(scope);
}

export function canAccessSurvey(profile, surveyId) {
  if (profile.isAdmin) return true;
  if (!profile.permissionSet.has(P.CAN_VIEW_SURVEYS) && !profile.permissionSet.has(P.CAN_EXPORT_SURVEYS)) return false;
  const id = String(surveyId || '');
  const isEnglishClubSurvey = id === 'english_club_feedback_114_1' || id.includes('english_club');
  const isEnglishTableSurvey = id === 'english_table_feedback_114_1' || id.includes('english_table');
  if (isEnglishTableSurvey) {
    if (profile.finalScopes.includes(SCOPE.ALL)) return true;
    return profile.finalScopes.includes(SCOPE.SURVEY_ENGLISH_TABLE) || profile.finalScopes.includes(SCOPE.ENGLISH_TABLE);
  }
  if (isEnglishClubSurvey) {
    return profile.finalScopes.includes(SCOPE.ALL);
  }
  return false;
}

/**
 * 供 AdminSidebar / adminNavigation 使用（與舊 AdminNavContext 形狀相容）
 */
export function buildNavContextFromAccessProfile(profile) {
  const canViewReport = profile.permissionSet.has(P.CAN_VIEW_EVENTS_ADMIN);
  const canViewSurvey = profile.permissionSet.has(P.CAN_VIEW_SURVEYS) || profile.permissionSet.has(P.CAN_EXPORT_SURVEYS);
  const canManageAccounts = profile.permissionSet.has(P.CAN_MANAGE_ACCOUNTS);
  const canManageSettings = profile.permissionSet.has(P.CAN_MANAGE_SETTINGS);
  const canViewAnalytics = profile.permissionSet.has(P.CAN_VIEW_ANALYTICS);
  const canExportReports = profile.permissionSet.has(P.CAN_EXPORT_REPORTS);
  const canViewAuditLogs = profile.permissionSet.has(P.CAN_VIEW_AUDIT_LOGS);
  const canViewDiagnostics = profile.permissionSet.has(P.CAN_VIEW_INTERNAL_DIAGNOSTICS);
  const canManageAnnouncements = profile.permissionSet.has(P.CAN_MANAGE_ANNOUNCEMENTS);

  return {
    actualUserRole: profile.role,
    isTeacher: profile.isTeacher,
    hasAdminRights: profile.hasAdminRights,
    canViewReport,
    canViewSurvey,
    canManageAccounts,
    canManageSettings,
    canViewAnalytics,
    canExportReports,
    canViewAuditLogs,
    canViewDiagnostics,
    canManageAnnouncements,
    accessProfile: profile,
  };
}
