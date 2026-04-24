// routes/loginRouter.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { secretKey } = require('../middlewares/auth'); // 確保此檔案 export secretKey
const { Teacher } = require('../models');
const auditLogService = require('../services/auditLogService');
const logger = require('../utils/logger');

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: '缺少帳號或密碼' });
    }

    const teacher = await Teacher.findOne({ where: { username } });

    if (!teacher || !teacher.isActive) {
      auditLogService.queueAuthLoginFailure(req, username);
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const isValidPassword = await bcrypt.compare(password, teacher.password);
    if (!isValidPassword) {
      auditLogService.queueAuthLoginFailure(req, username, teacher.id);
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const payload = {
      id: teacher.id,
      role: teacher.role,
      user: teacher.username,
      name: teacher.name,
      mustResetPassword: teacher.mustResetPassword,
      teacherLevel: teacher.teacherLevel || 'regular',
      accessVersion: teacher.accessVersion || 1,
      // 第二階段：下發 per-user overrides（注意：變更後需重新登入才會生效）
      permissions: teacher.permissions || null,
      scopes: Array.isArray(teacher.scopes) ? teacher.scopes : null
    };

    const token = jwt.sign(payload, secretKey, { expiresIn: '4h' });

    await teacher.update({ lastLoginAt: new Date() });

    auditLogService.logAuditAsync({
      module: 'auth',
      action: 'login_success',
      entityType: 'Teacher',
      entityId: teacher.id,
      targetSummary: teacher.username,
      afterData: { id: teacher.id, role: teacher.role, username: teacher.username },
      operatorId: teacher.id,
      operatorRole: teacher.role,
      operatorName: teacher.name,
      req,
    });

    return res.json({
      message: '登入成功',
      token,
      role: teacher.role,
      teacherLevel: teacher.teacherLevel || 'regular',
      mustResetPassword: teacher.mustResetPassword,
      teacher: {
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        email: teacher.email,
        role: teacher.role,
        teacherLevel: teacher.teacherLevel || 'regular',
        accessVersion: teacher.accessVersion || 1,
        permissions: teacher.permissions || null,
        scopes: Array.isArray(teacher.scopes) ? teacher.scopes : null
      }
    });
  } catch (error) {
    logger.error('登入錯誤', error);
    return res.status(500).json({ error: "登入過程中發生錯誤" });
  }
});

module.exports = router;
