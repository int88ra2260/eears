// controllers/teacherController.js
const { Teacher, Class, ClassMembership, sequelize } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const auditLogService = require('../services/auditLogService');
const {
  syncPermissionOverrides,
  syncUserScopes,
  bumpAccessVersion,
} = require('../services/accessControl/writeService');
const {
  getUserOverrides,
  getUserScopes,
} = require('../services/accessControl/readService');

const ALLOWED_ROLES = ['admin', 'worker', 'teacher'];

function generateTempPassword(length = 12) {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@$!';
  let password = '';
  for (let i = 0; i < length; i += 1) {
    const index = Math.floor(Math.random() * charset.length);
    password += charset[index];
  }
  return password;
}

function isFlagEnabled(name, defaultValue = false) {
  const val = process.env[name];
  if (val == null || val === '') return defaultValue;
  return String(val).toLowerCase() === 'true' || String(val) === '1';
}

function mapTeacherResponse(teacher, accessData = null) {
  const resolvedPermissions = accessData && accessData.permissions !== undefined
    ? accessData.permissions
    : (teacher.permissions || null);
  const resolvedScopes = accessData && accessData.scopes !== undefined
    ? accessData.scopes
    : (Array.isArray(teacher.scopes) ? teacher.scopes : null);
  return {
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    username: teacher.username,
    role: teacher.role,
    teacherLevel: teacher.teacherLevel || null,
    department: teacher.department,
    phone: teacher.phone,
    isActive: teacher.isActive,
    mustResetPassword: teacher.mustResetPassword,
    disabledReason: teacher.disabledReason || null,
    permissions: resolvedPermissions,
    scopes: resolvedScopes,
    accessVersion: teacher.accessVersion || 1,
    lastLoginAt: teacher.lastLoginAt,
    createdAt: teacher.createdAt,
    updatedAt: teacher.updatedAt
  };
}

function isSystemAdminReq(req) {
  return !!(req && req.user && req.user.role === 'admin');
}

function forbidIfManagingAdminByNonAdmin(req, targetTeacher, nextRole) {
  // executive 可管理 teacher/worker，但不可管理 admin（含重設密碼）
  if (isSystemAdminReq(req)) return null;
  if (targetTeacher && targetTeacher.role === 'admin') return '僅系統管理員可管理 admin 帳號';
  if (nextRole === 'admin') return '僅系統管理員可建立或升級為 admin';
  return null;
}

function shouldBumpAccessVersion(before, after) {
  const fields = ['role', 'teacherLevel', 'permissions', 'scopes', 'isActive'];
  return fields.some((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

/**
 * 創建老師帳號
 * POST /api/admin/teachers
 */
async function createTeacher(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const {
      name,
      email,
      username,
      password,
      department,
      phone,
      role = 'teacher',
      teacherLevel = 'regular',
      isActive = true,
      permissions = null,
      scopes = null,
      disabledReason = null,
    } = req.body;

    if (!name || !email || !username) {
      await transaction.rollback();
      return res.status(400).json({
        error: '缺少必要欄位',
        required: ['name', 'email', 'username']
      });
    }

    const normalizedRole = ALLOWED_ROLES.includes(role) ? role : 'teacher';
    const forbidCreate = forbidIfManagingAdminByNonAdmin(req, null, normalizedRole);
    if (forbidCreate) {
      await transaction.rollback();
      return res.status(403).json({ error: forbidCreate });
    }

    const existingTeacher = await Teacher.findOne({
      where: {
        [Op.or]: [
          { email },
          { username }
        ]
      },
      transaction,
      lock: transaction.LOCK.UPDATE
    });

    if (existingTeacher) {
      await transaction.rollback();
      return res.status(409).json({
        error: '帳號或信箱已存在',
        field: existingTeacher.email === email ? 'email' : 'username'
      });
    }

    const tempPassword = password || generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);
    const jsonMirrorWrite = isFlagEnabled('ACCESS_PROFILE_JSON_MIRROR_WRITE', false);
    const permissionOverrides = permissions && typeof permissions === 'object' ? permissions : null;
    const scopeOverrides = Array.isArray(scopes) ? scopes : null;

    const teacher = await Teacher.create({
      name,
      email,
      username,
      password: hashedPassword,
      department: department || null,
      phone: phone || null,
      role: normalizedRole,
      teacherLevel: normalizedRole === 'teacher' ? (teacherLevel || 'regular') : null,
      isActive: !!isActive,
      disabledReason: !!isActive ? null : (disabledReason || null),
      mustResetPassword: true,
      passwordChangedAt: null,
      permissions: jsonMirrorWrite ? permissionOverrides : null,
      scopes: jsonMirrorWrite ? scopeOverrides : null,
      createdBy: req.user?.username || null
    }, { transaction });

    await syncPermissionOverrides(teacher.id, permissionOverrides, req.user, { transaction });
    await syncUserScopes(teacher.id, scopeOverrides, req.user, { transaction });

    await transaction.commit();

    auditLogService.logAccessGovernanceAudit({
      action: 'create_teacher',
      entityId: teacher.id,
      targetSummary: `${teacher.username} / ${teacher.role}`,
      beforeData: null,
      afterData: {
        id: teacher.id,
        username: teacher.username,
        role: teacher.role,
        teacherLevel: teacher.teacherLevel,
        permissions: permissionOverrides,
        scopes: scopeOverrides,
        isActive: teacher.isActive,
        accessVersion: teacher.accessVersion || 1,
      },
      req,
      changeReason: 'create_teacher_account',
    });

    res.status(201).json({
      success: true,
      data: {
        ...mapTeacherResponse(teacher),
        permissions: permissionOverrides,
        scopes: scopeOverrides,
        temporaryPassword: password ? undefined : tempPassword
      }
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}

/**
 * 獲取老師列表
 * GET /api/admin/teachers
 */
async function getTeachers(req, res, next) {
  try {
    const { page = 1, pageSize = 20, search = '', role, status } = req.query;
    const offset = (page - 1) * pageSize;

    const whereClause = {};
    if (role && ALLOWED_ROLES.includes(role)) {
      whereClause.role = role;
    }
    if (status === 'active') {
      whereClause.isActive = true;
    } else if (status === 'inactive') {
      whereClause.isActive = false;
    }
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { department: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: teachers } = await Teacher.findAndCountAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'username', 'role', 'teacherLevel', 'department', 'phone', 'isActive', 'disabledReason', 'mustResetPassword', 'permissions', 'scopes', 'accessVersion', 'lastLoginAt', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset)
    });

    const accessRows = await Promise.all(
      teachers.map(async (t) => {
        const [permissions, scopes] = await Promise.all([
          getUserOverrides(t.id),
          getUserScopes(t.id),
        ]);
        return [t.id, { permissions, scopes }];
      })
    );
    const accessByTeacherId = new Map(accessRows);

    res.json({
      success: true,
      data: teachers.map((t) => mapTeacherResponse(t, accessByTeacherId.get(t.id))),
      pagination: {
        total: count,
        totalPages: Math.ceil(count / pageSize),
        currentPage: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });

  } catch (error) {
    next(error);
  }
}

/**
 * 獲取老師負責的班級
 * GET /api/admin/teachers/:teacherId/classes
 */
async function getTeacherClasses(req, res, next) {
  try {
    const { teacherId } = req.params;
    const { semester = '114-1' } = req.query;

    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: '老師不存在' });
    }

    const classes = await Class.findAll({
      include: [{
        model: ClassMembership,
        as: 'ClassMemberships',
        attributes: ['studentId']
      }],
      where: {
        semester,
        teacherName: teacher.name
      },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department
      },
      classes: classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        department: cls.department,
        studentCount: cls.ClassMemberships.length
      }))
    });

  } catch (error) {
    next(error);
  }
}

/**
 * 老師查看學生參與狀況
 * GET /api/teachers/students/participation
 */
async function getStudentParticipation(req, res, next) {
  try {
    const { semester = '114-1', classId } = req.query;
    const teacherId = req.user.id; // 從 JWT 中獲取

    // 獲取老師負責的班級
    const classes = await Class.findAll({
      where: {
        semester,
        teacherName: req.user.name // 使用 JWT 中的老師姓名
      }
    });

    if (classes.length === 0) {
      return res.status(404).json({
        error: '沒有找到您負責的班級'
      });
    }

    // 如果指定了特定班級，只查詢該班級
    let targetClasses = classes;
    if (classId) {
      targetClasses = classes.filter(cls => cls.id === parseInt(classId));
      if (targetClasses.length === 0) {
        return res.status(404).json({
          error: '您沒有權限查看此班級'
        });
      }
    }

    // 獲取班級統計
    const classStats = await Promise.all(targetClasses.map(async (classRecord) => {
      const studentIds = await ClassMembership.findAll({
        where: { classId: classRecord.id, semester },
        attributes: ['studentId']
      }).then(memberships => memberships.map(m => m.studentId));

      // 這裡可以添加參與統計邏輯
      // 暫時返回基本資訊
      return {
        classId: classRecord.id,
        className: classRecord.name,
        department: classRecord.department,
        studentCount: studentIds.length
      };
    }));

    res.json({
      success: true,
      data: classStats
    });

  } catch (error) {
    next(error);
  }
}

/**
 * 更新老師帳號資訊
 * PATCH /api/admin/teachers/:teacherId
 */
async function updateTeacher(req, res, next) {
  const transaction = await sequelize.transaction();
  try {
    const { teacherId } = req.params;
    const { name, email, department, phone, role, teacherLevel, isActive, permissions, scopes, disabledReason, mustResetPassword } = req.body;

    const teacher = await Teacher.findByPk(teacherId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!teacher) {
      await transaction.rollback();
      return res.status(404).json({ error: '找不到指定帳號' });
    }

    const nextRole = role || teacher.role;
    const forbid = forbidIfManagingAdminByNonAdmin(req, teacher, nextRole);
    if (forbid) {
      await transaction.rollback();
      return res.status(403).json({ error: forbid });
    }
    const before = {
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      department: teacher.department,
      phone: teacher.phone,
      role: teacher.role,
      teacherLevel: teacher.teacherLevel || null,
      isActive: teacher.isActive,
      mustResetPassword: teacher.mustResetPassword,
      disabledReason: teacher.disabledReason || null,
      permissions: null,
      scopes: null,
      accessVersion: teacher.accessVersion || 1,
    };
    const beforeAccess = {
      permissions: await getUserOverrides(teacher.id, { transaction }),
      scopes: await getUserScopes(teacher.id, { transaction }),
    };
    before.permissions = beforeAccess.permissions;
    before.scopes = beforeAccess.scopes;

    if (email && email !== teacher.email) {
      const emailTaken = await Teacher.findOne({ where: { email }, transaction });
      if (emailTaken) {
        await transaction.rollback();
        return res.status(409).json({ error: 'Email 已被使用', field: 'email' });
      }
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      await transaction.rollback();
      return res.status(400).json({ error: '角色不合法', allowed: ALLOWED_ROLES });
    }

    const nextIsActive = typeof isActive === 'boolean' ? isActive : teacher.isActive;
    const nextDisabledReason = nextIsActive ? null : (disabledReason ?? teacher.disabledReason ?? null);

    const updatePayload = {
      name: name ?? teacher.name,
      email: email ?? teacher.email,
      department: department ?? teacher.department,
      phone: phone ?? teacher.phone,
      role: nextRole,
      teacherLevel: nextRole === 'teacher' ? (teacherLevel ?? teacher.teacherLevel ?? 'regular') : null,
      isActive: nextIsActive,
      disabledReason: nextDisabledReason,
    };
    const jsonMirrorWrite = isFlagEnabled('ACCESS_PROFILE_JSON_MIRROR_WRITE', false);
    const nextPermissionOverrides = permissions !== undefined
      ? (permissions && typeof permissions === 'object' ? permissions : null)
      : beforeAccess.permissions;
    const nextScopes = scopes !== undefined
      ? (Array.isArray(scopes) ? scopes : null)
      : beforeAccess.scopes;

    // permission overrides/scopes：null 代表清除覆寫（回到 base）
    if (permissions !== undefined) {
      updatePayload.permissions = jsonMirrorWrite ? nextPermissionOverrides : null;
    }
    if (scopes !== undefined) {
      updatePayload.scopes = jsonMirrorWrite ? nextScopes : null;
    }
    if (typeof mustResetPassword === 'boolean') {
      updatePayload.mustResetPassword = mustResetPassword;
    }

    await teacher.update(updatePayload, { transaction });

    const afterForVersion = {
      role: teacher.role,
      teacherLevel: teacher.teacherLevel || null,
      permissions: nextPermissionOverrides,
      scopes: nextScopes,
      isActive: teacher.isActive,
    };

    if (permissions !== undefined) {
      await syncPermissionOverrides(teacher.id, nextPermissionOverrides, req.user, { transaction });
    }
    if (scopes !== undefined) {
      await syncUserScopes(teacher.id, nextScopes, req.user, { transaction });
    }

    if (shouldBumpAccessVersion(before, afterForVersion)) {
      await bumpAccessVersion(teacher.id, 'teacher_access_fields_updated', { transaction });
      await teacher.reload({ transaction });
    }

    await transaction.commit();

    auditLogService.logAccessGovernanceAudit({
      action: 'update_teacher',
      entityId: teacher.id,
      targetSummary: `${teacher.username || teacher.email || ''} / ${teacher.role}`,
      beforeData: {
        ...before,
        permissions: beforeAccess.permissions,
        scopes: beforeAccess.scopes,
      },
      afterData: {
        id: teacher.id,
        name: teacher.name,
        email: teacher.email,
        department: teacher.department,
        phone: teacher.phone,
        role: teacher.role,
        teacherLevel: teacher.teacherLevel || null,
        isActive: teacher.isActive,
        disabledReason: teacher.disabledReason || null,
        permissions: nextPermissionOverrides,
        scopes: nextScopes,
        mustResetPassword: teacher.mustResetPassword,
        accessVersion: teacher.accessVersion || 1,
      },
      req,
      changeReason: 'update_teacher_access_governance',
    });

    res.json({
      success: true,
      data: mapTeacherResponse(teacher, {
        permissions: nextPermissionOverrides,
        scopes: nextScopes,
      })
    });
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}

/**
 * 重設老師密碼
 * POST /api/admin/teachers/:teacherId/reset-password
 */
async function resetTeacherPassword(req, res, next) {
  try {
    const { teacherId } = req.params;
    const teacher = await Teacher.findByPk(teacherId);
    if (!teacher) {
      return res.status(404).json({ error: '找不到指定帳號' });
    }

    const forbid = forbidIfManagingAdminByNonAdmin(req, teacher, teacher.role);
    if (forbid) {
      return res.status(403).json({ error: forbid });
    }

    const before = {
      id: teacher.id,
      mustResetPassword: teacher.mustResetPassword,
      passwordChangedAt: teacher.passwordChangedAt || null,
    };

    const newPassword = generateTempPassword();
    const hashed = await bcrypt.hash(newPassword, 12);

    await teacher.update({
      password: hashed,
      mustResetPassword: true,
      passwordChangedAt: null
    });

    auditLogService.logAuditAsync({
      module: 'accounts',
      action: 'reset_teacher_password',
      entityType: 'Teacher',
      entityId: teacher.id,
      targetSummary: `teacherId=${teacher.id}`,
      beforeData: before,
      afterData: {
        mustResetPassword: true,
        passwordChangedAt: null,
      },
      req,
    });

    res.json({
      success: true,
      data: {
        ...mapTeacherResponse(teacher),
        temporaryPassword: newPassword
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * 使用者自行變更密碼
 * POST /api/teachers/change-password
 */
async function changeOwnPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: '新密碼長度至少 8 碼' });
    }

    const teacher = await Teacher.findByPk(req.user.id);
    if (!teacher || !teacher.isActive) {
      return res.status(404).json({ error: '帳號不存在或已停用' });
    }

    const before = {
      id: teacher.id,
      mustResetPassword: teacher.mustResetPassword,
      passwordChangedAt: teacher.passwordChangedAt || null,
    };

    if (!teacher.mustResetPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: '請提供目前密碼' });
      }
      const match = await bcrypt.compare(currentPassword, teacher.password);
      if (!match) {
        return res.status(401).json({ error: '目前密碼不正確' });
      }
    }

    const duplicated = await bcrypt.compare(newPassword, teacher.password);
    if (duplicated) {
      return res.status(400).json({ error: '新密碼不可與舊密碼相同' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    const now = new Date();

    await teacher.update({
      password: hashed,
      mustResetPassword: false,
      passwordChangedAt: now
    });

    auditLogService.logAuditAsync({
      module: 'accounts',
      action: 'change_own_password',
      entityType: 'Teacher',
      entityId: teacher.id,
      targetSummary: `teacherId=${teacher.id}`,
      beforeData: before,
      afterData: {
        mustResetPassword: false,
        passwordChangedAt: now,
      },
      req,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTeacher,
  getTeachers,
  getTeacherClasses,
  getStudentParticipation,
  updateTeacher,
  resetTeacherPassword,
  changeOwnPassword
};
