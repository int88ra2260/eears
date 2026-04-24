const { EmailLog } = require('../models');
const logger = require('../utils/logger');
const { sendEmail, emailTemplates } = require('../config/email');
const { maskEmail, sanitizeErrorMessage } = require('../utils/logSanitizer');

async function logEmail(payload) {
  const {
    to,
    subject,
    template,
    status,
    errorMessage = null,
    relatedEntityType = null,
    relatedEntityId = null,
    requestId,
  } = payload || {};

  if (!template || !requestId) {
    logger.warn('emailLogService：缺少 template 或 requestId，跳過寫入', { template, requestId });
    return;
  }

  try {
    await EmailLog.create({
      to: maskEmail(to) ?? null,
      subject: subject ? String(subject).slice(0, 500) : null,
      template: String(template).slice(0, 120),
      status: String(status || 'success'),
      errorMessage: sanitizeErrorMessage(errorMessage),
      relatedEntityType: relatedEntityType ? String(relatedEntityType).slice(0, 80) : null,
      relatedEntityId: relatedEntityId != null ? String(relatedEntityId).slice(0, 64) : null,
      requestId: String(requestId).slice(0, 64),
      createdAt: new Date(),
    });
  } catch (e) {
    logger.error('emailLogService 寫入失敗', e);
  }
}

function logEmailAsync(payload) {
  setImmediate(() => {
    logEmail(payload).catch(() => {});
  });
}

async function sendEmailWithLog(template, data, meta = {}) {
  const { requestId, relatedEntityType = null, relatedEntityId = null } = meta || {};

  let mailMeta = { to: null, subject: null };
  try {
    const fn = emailTemplates && emailTemplates[template];
    if (typeof fn === 'function') {
      const opts = fn(data) || {};
      mailMeta.to = opts.to || data?.studentEmail || data?.email || null;
      mailMeta.subject = opts.subject || null;
    }
  } catch (e) {
    // ignore
  }

  const rid = requestId || (meta && meta.requestId) || `emailjob:${Date.now()}`;

  try {
    await sendEmail(template, data);
    await logEmail({
      to: mailMeta.to,
      subject: mailMeta.subject,
      template,
      status: 'success',
      errorMessage: null,
      relatedEntityType,
      relatedEntityId,
      requestId: rid,
    });
  } catch (err) {
    await logEmail({
      to: mailMeta.to,
      subject: mailMeta.subject,
      template,
      status: 'failed',
      errorMessage: err && err.message ? err.message : String(err),
      relatedEntityType,
      relatedEntityId,
      requestId: rid,
    });
    throw err;
  }
}

module.exports = {
  logEmail,
  logEmailAsync,
  sendEmailWithLog,
};

