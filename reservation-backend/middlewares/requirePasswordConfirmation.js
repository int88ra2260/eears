const bcrypt = require('bcryptjs');
const { Teacher } = require('../models');

async function requirePasswordConfirmation(req, res, next) {
  try {
    const plain =
      req.body?.currentPassword ||
      req.body?.confirmPassword ||
      req.headers['x-confirm-password'];

    if (!plain) {
      return res.status(400).json({ error: '請提供 currentPassword 進行操作確認' });
    }
    if (!req.user?.id) {
      return res.status(401).json({ error: '尚未登入' });
    }

    const teacher = await Teacher.findByPk(req.user.id, { attributes: ['id', 'password', 'isActive'] });
    if (!teacher || !teacher.isActive) {
      return res.status(403).json({ error: '帳號不可用' });
    }

    const ok = await bcrypt.compare(String(plain), String(teacher.password || ''));
    if (!ok) {
      return res.status(403).json({ error: '密碼驗證失敗' });
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requirePasswordConfirmation };
