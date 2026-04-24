const express = require('express');
const { sequelize } = require('../models');
const { transporter } = require('../config/email');

const router = express.Router();

router.get('/health', async (req, res) => {
  const timestamp = new Date().toISOString();

  let db = 'error';
  let dbLatencyMs = null;
  try {
    const start = Date.now();
    await sequelize.authenticate();
    dbLatencyMs = Date.now() - start;
    db = 'ok';
  } catch (_) {
    db = 'error';
    dbLatencyMs = dbLatencyMs == null ? 0 : dbLatencyMs;
  }

  let email = transporter ? 'ok' : 'error';
  let emailLatencyMs = 0;
  try {
    if (transporter && typeof transporter.verify === 'function') {
      const start = Date.now();
      let verificationFailed = false;
      // 保持最小且避免過久；驗證失敗代表 SMTP/認證可能異常
      await Promise.race([
        transporter.verify().catch(() => {
          verificationFailed = true;
          return null;
        }),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      emailLatencyMs = Date.now() - start;
      // 若 verify 在 timeout 前就失敗，標記 error；若只是 timeout，維持 ok（但前端會看 latency 判斷偏慢/異常）
      email = verificationFailed ? 'error' : 'ok';
      // 若 verify 沒擲錯就標記為 ok（即使超時也算 ok，避免健康檢查過度敏感）
    }
  } catch (_) {
    email = 'error';
    emailLatencyMs = emailLatencyMs == null ? 0 : emailLatencyMs;
  }

  const status = db === 'ok' ? 'ok' : 'error';

  res.json({
    status,
    timestamp,
    services: {
      db: { status: db, latencyMs: dbLatencyMs },
      email: { status: email, latencyMs: emailLatencyMs },
    },
  });
});

module.exports = router;

