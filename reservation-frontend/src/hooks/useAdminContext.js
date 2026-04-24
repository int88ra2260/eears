// hooks/useAdminContext.js
// 從 AdminLayout Outlet context 取得 token、角色與衍生權限旗標，供 admin 子頁共用。

import { useOutletContext } from 'react-router-dom';

/**
 * 取得 admin 頁面共用的 Outlet context 與衍生權限。
 * 來源為 AdminLayout 傳入的 context，不修改 AdminLayout。
 *
 * @returns {Object}
 *   - token, userRole, teacherLevel, username, mustResetPassword, setMustResetPassword
 *   - isAdmin, isTeacher, isExecutive, hasAdminRights
 */
export function useAdminContext() {
  const ctx = useOutletContext() || {};
  const {
    token,
    userRole,
    teacherLevel,
    username,
    mustResetPassword,
    setMustResetPassword
  } = ctx;

  const actualUserRole = userRole || 'worker';
  const actualTeacherLevel = teacherLevel || 'regular';
  const isAdmin = actualUserRole === 'admin';
  const isTeacher = actualUserRole === 'teacher';
  const isExecutive = isTeacher && actualTeacherLevel === 'executive';
  const hasAdminRights = isAdmin || isExecutive;

  return {
    token,
    userRole: actualUserRole,
    teacherLevel: actualTeacherLevel,
    username,
    mustResetPassword,
    setMustResetPassword,
    isAdmin,
    isTeacher,
    isExecutive,
    hasAdminRights
  };
}
