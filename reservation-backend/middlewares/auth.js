// middlewares/auth.js — JWT 驗證 + 統一權限中心（相容舊匯出名稱）
const jwt = require('jsonwebtoken');
const { createAPIError, logError } = require('../utils/errorMessages');
const {
  buildAccessProfile,
  attachAccessProfile,
  resolveEffectiveAccessSources,
  getAccessProfileReadMode,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessEventType,
  canAccessSurvey,
} = require('../auth/accessProfile');
const { P } = require('../auth/permissions');
const { Teacher } = require('../models');
const logger = require('../utils/logger');

const secretKey = process.env.JWT_SECRET || 'MY_SUPER_SECRET_KEY';
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line no-console
  console.error(
    '[EEARS][auth] 警告：未設定 JWT_SECRET，使用內建 fallback，生產環境極不安全。請立即設定環境變數。'
  );
} else if (!process.env.JWT_SECRET) {
  // eslint-disable-next-line no-console
  console.warn('[EEARS][auth] 開發模式：未設定 JWT_SECRET，使用內建 fallback。');
}

function buildAuthLogContext(req) {
  const method = req?.method || 'UNKNOWN';
  const path = req?.originalUrl || req?.url || 'unknown-path';
  const ip = req?.ip || req?.headers?.['x-forwarded-for'] || 'unknown-ip';
  const ua = req?.get?.('user-agent') || req?.headers?.['user-agent'] || 'unknown-ua';
  const area = String(path).startsWith('/api/admin') ? 'admin' : 'public';
  return `${method} ${path} - area=${area} - ip=${ip} - ua=${ua}`;
}

function sendForbidden(res, message) {
  const apiError = createAPIError('INSUFFICIENT_PERMISSIONS', 403, message || undefined);
  return res.status(403).json(apiError);
}

function sendPasswordResetRequired(res) {
  return res.status(403).json({
    success: false,
    code: 'PASSWORD_RESET_REQUIRED',
    message: 'Password reset is required before accessing this resource.',
  });
}

function normalizePath(path) {
  return String(path || '')
    .split('?')[0]
    .replace(/\/+$/, '');
}

function isPasswordResetExemptPath(req) {
  const method = String(req?.method || '').toUpperCase();
  const path = normalizePath(req?.originalUrl || req?.url);
  const allowlist = [
    { method: 'POST', path: '/api/teachers/change-password' },
  ];
  return allowlist.some((rule) => rule.method === method && rule.path === path);
}

function enforcePasswordResetMiddleware(req, res, next) {
  if (req.user?.mustResetPassword === true && !isPasswordResetExemptPath(req)) {
    return sendPasswordResetRequired(res);
  }
  return next();
}

function sendStaleToken(res, latestAccessVersion) {
  return res.status(401).json({
    code: 'ACCESS_PROFILE_STALE',
    error: '權限資料已更新，請重新登入',
    message: 'Access profile changed, please login again',
    actionHint: 'relogin',
    latestAccessVersion: latestAccessVersion != null ? Number(latestAccessVersion) : null,
  });
}

function parseCsvSet(raw) {
  return new Set(
    String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

function isEnabled(name, defaultValue = false) {
  const val = process.env[name];
  if (val == null || val === '') return defaultValue;
  return String(val).toLowerCase() === 'true' || String(val) === '1';
}

function shouldEnforceStaleForRequest(req, user) {
  const enabled = isEnabled('ACCESS_VERSION_CHECK_ENABLED', false);
  if (!enabled) return false;

  const roles = parseCsvSet(process.env.ACCESS_VERSION_ENFORCE_ROLES || '');
  const prefixes = parseCsvSet(process.env.ACCESS_VERSION_ENFORCE_PATH_PREFIXES || '/api/admin');
  const path = String(req?.originalUrl || req?.url || '');
  const role = String(user?.role || '');

  const roleMatch = roles.size ? roles.has(role) : false;
  const pathMatch = Array.from(prefixes).some((p) => path.startsWith(p));
  return roleMatch || pathMatch;
}

async function checkAccessVersion(req, user, mode = 'auth') {
  if (!user || !user.id) return { mismatch: false, tokenVersion: null, dbVersion: null };
  const t = await Teacher.findByPk(user.id, { attributes: ['id', 'accessVersion'] });
  if (!t) return { mismatch: false, tokenVersion: null, dbVersion: null };
  const tokenVersion = Number(user.accessVersion || 0);
  const dbVersion = Number(t.accessVersion || 1);
  const mismatch = tokenVersion !== dbVersion;

  if (mismatch) {
    const payload = {
      type: 'access_version_mismatch',
      mode,
      method: req?.method || 'UNKNOWN',
      path: req?.originalUrl || req?.url || '',
      requestId: req?.requestId || null,
      userId: user.id,
      role: user.role || null,
      tokenVersion,
      dbVersion,
      enforceEligible: shouldEnforceStaleForRequest(req, user),
      readMode: getAccessProfileReadMode(),
    };
    logger.warn('access version mismatch detected');
    console.log(JSON.stringify(payload));
  }

  return { mismatch, tokenVersion, dbVersion };
}

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      logError('TOKEN_MISSING', null, `${buildAuthLogContext(req)} - Authorization header missing`);
      const apiError = createAPIError('TOKEN_MISSING', 401);
      return res.status(401).json(apiError);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logError('TOKEN_MISSING', null, `${buildAuthLogContext(req)} - Token format error`);
      const apiError = createAPIError('TOKEN_INVALID', 401);
      return res.status(401).json(apiError);
    }

    jwt.verify(token, secretKey, async (err, decoded) => {
      if (err) {
        if (err.name === 'TokenExpiredError') {
          logError('TOKEN_EXPIRED', err, `Token expired at ${err.expiredAt}`);
          const apiError = createAPIError('TOKEN_EXPIRED', 401);
          return res.status(401).json(apiError);
        }
        if (err.name === 'JsonWebTokenError') {
          logError('TOKEN_INVALID', err, 'Invalid token format');
          const apiError = createAPIError('TOKEN_INVALID', 401);
          return res.status(401).json(apiError);
        }
        logError('TOKEN_INVALID', err, 'Token verification failed');
        const apiError = createAPIError('TOKEN_INVALID', 401);
        return res.status(401).json(apiError);
      }
      req.user = decoded;
      try {
        req.user = await resolveEffectiveAccessSources(req.user);
        if (req.user && req.user.__effectiveSource === 'json_fallback') {
          console.log(JSON.stringify({
            type: 'access_profile_json_fallback_used',
            userId: req.user.id,
            role: req.user.role || null,
            teacherLevel: req.user.teacherLevel || null,
            path: req.originalUrl || req.url || '',
            requestId: req.requestId || null,
          }));
        }
      } catch (e) {
        logError('INSUFFICIENT_PERMISSIONS', e, 'resolveEffectiveAccessSources(authMiddleware)');
      }
      attachAccessProfile(req);
      try {
        const { mismatch, tokenVersion, dbVersion } = await checkAccessVersion(req, req.user, 'auth');
        if (mismatch) {
          req.accessVersionMismatch = { token: tokenVersion, current: dbVersion, mode: 'observe' };
          if (shouldEnforceStaleForRequest(req, req.user)) {
            return sendStaleToken(res, dbVersion);
          }
        }
      } catch (e) {
        logError('TOKEN_INVALID', e, 'accessVersion check failed');
      }
      return enforcePasswordResetMiddleware(req, res, next);
    });
  } catch (error) {
    logError('TOKEN_INVALID', error, 'Authentication middleware error');
    const apiError = createAPIError('TOKEN_INVALID', 401);
    res.status(401).json(apiError);
  }
}

/** 後登入後附加 accessProfile（不依賴 JWT 時勿用） */
function optionalAuthMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();
    const token = authHeader.split(' ')[1];
    if (!token) return next();
    jwt.verify(token, secretKey, async (err, decoded) => {
      if (!err && decoded) {
        req.user = decoded;
        try {
          req.user = await resolveEffectiveAccessSources(req.user);
        } catch (e) {
          logError('INSUFFICIENT_PERMISSIONS', e, 'resolveEffectiveAccessSources(optionalAuthMiddleware)');
        }
        attachAccessProfile(req);
        try {
          const { mismatch, tokenVersion, dbVersion } = await checkAccessVersion(req, req.user, 'optional');
          if (mismatch) {
            req.accessVersionMismatch = { token: tokenVersion, current: dbVersion, mode: 'observe' };
          }
        } catch (e) {
          logError('TOKEN_INVALID', e, 'accessVersion optional observe failed');
        }
      }
      next();
    });
  } catch (_) {
    next();
  }
}

/**
 * @param {string} permission
 * @param {string} [message]
 */
function requirePermission(permission, message) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return sendForbidden(res, message || '權限不足');
      }
      if (!hasPermission(req.user, permission)) {
        logError(
          'INSUFFICIENT_PERMISSIONS',
          null,
          `Missing permission: ${permission} user=${req.user.role}/${req.user.teacherLevel || ''}`
        );
        return sendForbidden(res, message || '權限不足');
      }
      next();
    } catch (error) {
      logError('INSUFFICIENT_PERMISSIONS', error, 'requirePermission');
      return sendForbidden(res, message || '權限不足');
    }
  };
}

function requireAnyPermission(permissions, message) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return sendForbidden(res, message || '權限不足');
      }
      if (!hasAnyPermission(req.user, permissions)) {
        logError('INSUFFICIENT_PERMISSIONS', null, `Missing any of: ${permissions.join(',')}`);
        return sendForbidden(res, message || '權限不足');
      }
      next();
    } catch (error) {
      logError('INSUFFICIENT_PERMISSIONS', error, 'requireAnyPermission');
      return sendForbidden(res, message || '權限不足');
    }
  };
}

function requireAllPermissions(permissions, message) {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return sendForbidden(res, message || '權限不足');
      }
      if (!hasAllPermissions(req.user, permissions)) {
        logError('INSUFFICIENT_PERMISSIONS', null, `Missing all required: ${permissions.join(',')}`);
        return sendForbidden(res, message || '權限不足');
      }
      next();
    } catch (error) {
      logError('INSUFFICIENT_PERMISSIONS', error, 'requireAllPermissions');
      return sendForbidden(res, message || '權限不足');
    }
  };
}

/** 僅系統角色 admin（不含執行長） */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return sendForbidden(res, '需要系統管理員身分');
  }
  next();
}

/** admin 或執行長（舊 adminMiddleware 語意） */
function requireAdminRights(req, res, next) {
  const profile = req.accessProfile || buildAccessProfile(req.user);
  if (!profile.hasAdminRights) {
    return sendForbidden(res, '需要管理權限（管理員或執行長）');
  }
  next();
}

/** 語意化別名：網域管理權（admin 或 executive） */
function adminOrExecutiveMiddleware(req, res, next) {
  return requireAdminRights(req, res, next);
}

function adminOrTeacherMiddleware(req, res, next) {
  const user = req.user || {};
  const role = String(user.role || '').toLowerCase();
  if (role === 'admin') return next();
  if (role === 'teacher') return next();
  return sendForbidden(res, '需要管理員或教師身分');
}

/** 語意化別名：系統管理員限定（admin only） */
function adminOnlyMiddleware(req, res, next) {
  return requireAdmin(req, res, next);
}

function requireTeacher(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      return sendForbidden(res, '權限不足');
    }
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      return sendForbidden(res, '需要教師或管理員身分');
    }
    next();
  } catch (error) {
    logError('INSUFFICIENT_PERMISSIONS', error, 'requireTeacher');
    return sendForbidden(res, '權限不足');
  }
}

/**
 * 系統級權限：僅限 role==='admin'（executive 也不可）
 * @param {string} permission
 * @param {string} [message]
 */
function requireSystemPermission(permission, message) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
      return sendForbidden(res, message || '僅限系統管理員');
    }
    return requirePermission(permission, message)(req, res, next);
  };
}

/**
 * 由 query/body/param 讀取 eventType 並檢查
 * @param {string} source - 'query'|'body'|'params'
 * @param {string} key - 欄位名，預設 eventType
 */
function requireEventTypeAccess(source = 'query', key = 'eventType') {
  return (req, res, next) => {
    const bag = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
    const eventType = bag && bag[key];
    if (!canAccessEventType(req.user, eventType)) {
      return sendForbidden(res, '無權限存取此活動類型');
    }
    next();
  };
}

/**
 * 從 params 讀取 surveyId
 */
function requireSurveyAccess(paramKey = 'surveyId') {
  return (req, res, next) => {
    const surveyId = req.params[paramKey];
    if (!canAccessSurvey(req.user, surveyId)) {
      return sendForbidden(res, '無權限存取此問卷');
    }
    next();
  };
}

function hasScope(profile, scope) {
  const scopes = profile?.finalScopes || [];
  return scopes.includes('all') || scopes.includes(scope);
}

function requireScope(scope, message) {
  return (req, res, next) => {
    const profile = req.accessProfile || buildAccessProfile(req.user);
    if (!hasScope(profile, scope)) {
      return sendForbidden(res, message || `缺少範圍權限：${scope}`);
    }
    next();
  };
}

function requireAnyScope(scopes, message) {
  return (req, res, next) => {
    const profile = req.accessProfile || buildAccessProfile(req.user);
    const ok = (scopes || []).some((s) => hasScope(profile, s));
    if (!ok) return sendForbidden(res, message || '缺少範圍權限');
    next();
  };
}

function requirePermissionAndScope(permission, scopes, message) {
  return (req, res, next) => {
    if (!hasPermission(req.user, permission)) {
      return sendForbidden(res, message || '權限不足');
    }
    const profile = req.accessProfile || buildAccessProfile(req.user);
    const ok = (scopes || []).some((s) => hasScope(profile, s));
    if (!ok) return sendForbidden(res, message || '缺少範圍權限');
    next();
  };
}

function requireEventAccess(getEventTypeFromReq) {
  return async (req, res, next) => {
    try {
      const eventType = typeof getEventTypeFromReq === 'function' ? await getEventTypeFromReq(req) : undefined;
      if (!canAccessEventType(req.user, eventType)) {
        return sendForbidden(res, '無權限存取此活動類型');
      }
      next();
    } catch (error) {
      logError('INSUFFICIENT_PERMISSIONS', error, 'requireEventAccess');
      return sendForbidden(res, '無權限存取此活動類型');
    }
  };
}

function requireSurveyAccessBy(getSurveyIdFromReq, message) {
  return (req, res, next) => {
    const surveyId = typeof getSurveyIdFromReq === 'function' ? getSurveyIdFromReq(req) : req.params.surveyId;
    if (!canAccessSurvey(req.user, surveyId)) {
      return sendForbidden(res, message || '無權限存取此問卷');
    }
    next();
  };
}

function requirePermissionAndEventAccess(permission, getEventTypeFromReq, message) {
  return async (req, res, next) => {
    try {
      if (!hasPermission(req.user, permission)) {
        return sendForbidden(res, message || '權限不足');
      }
      const eventType = typeof getEventTypeFromReq === 'function' ? await getEventTypeFromReq(req) : undefined;
      if (!canAccessEventType(req.user, eventType)) {
        return sendForbidden(res, message || '無權限存取此活動類型');
      }
      next();
    } catch (error) {
      logError('INSUFFICIENT_PERMISSIONS', error, 'requirePermissionAndEventAccess');
      return sendForbidden(res, message || '權限不足');
    }
  };
}

// --- 相容層：舊名稱，內部改用權限中心 ---

function adminMiddleware(req, res, next) {
  // backward-compatible alias: adminMiddleware === adminOrExecutiveMiddleware
  return adminOrExecutiveMiddleware(req, res, next);
}

function workerMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      logError('INSUFFICIENT_PERMISSIONS', null, 'User role not found in request');
      return sendForbidden(res, '權限不足');
    }
    const { role } = req.user;
    if (role !== 'admin' && role !== 'worker' && role !== 'teacher') {
      logError('INSUFFICIENT_PERMISSIONS', null, `User role '${role}' is not admin, worker or teacher`);
      return sendForbidden(res, '權限不足');
    }
    next();
  } catch (error) {
    logError('INSUFFICIENT_PERMISSIONS', error, 'Worker middleware error');
    return sendForbidden(res, '權限不足');
  }
}

function workerOnlyMiddleware(req, res, next) {
  try {
    if (!req.user || !req.user.role) {
      return sendForbidden(res, '權限不足');
    }
    if (req.user.role !== 'worker') {
      return sendForbidden(res, '僅限工讀生帳號');
    }
    next();
  } catch (error) {
    logError('INSUFFICIENT_PERMISSIONS', error, 'Worker-only middleware error');
    return sendForbidden(res, '權限不足');
  }
}

function teacherMiddleware(req, res, next) {
  return requireTeacher(req, res, next);
}

module.exports = {
  authMiddleware,
  optionalAuthMiddleware,
  attachAccessProfile,
  buildAccessProfile,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSystemPermission,
  requireAdmin,
  requireAdminRights,
  adminOnlyMiddleware,
  adminOrExecutiveMiddleware,
  adminOrTeacherMiddleware,
  requireTeacher,
  requireScope,
  requireAnyScope,
  requirePermissionAndScope,
  requireEventTypeAccess,
  requireEventAccess,
  requirePermissionAndEventAccess,
  requireSurveyAccess,
  requireSurveyAccessBy,
  adminMiddleware,
  workerMiddleware,
  workerOnlyMiddleware,
  teacherMiddleware,
  canViewEventType: canAccessEventType,
  canViewSurvey: canAccessSurvey,
  canAccessEventType,
  canAccessSurvey,
  secretKey,
  getAccessProfileReadMode,
  shouldEnforceStaleForRequest,
  enforcePasswordResetMiddleware,
  P,
};
