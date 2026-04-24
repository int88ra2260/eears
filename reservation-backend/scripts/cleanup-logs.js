/**
 * Cleanup retention logs job
 *
 * 預設策略（可調整）：
 *  - system_logs：保留 60 天
 *  - email_logs：保留 180 天
 *  - audit_logs：預設不刪除，只在到期後做 archive（可選擇刪除）
 *
 * 使用方式（範例）：
 *  - node scripts/cleanup-logs.js --dry-run
 *  - node scripts/cleanup-logs.js --system-days=90 --email-days=180
 *  - node scripts/cleanup-logs.js --archive-audit --audit-archive-days=730 --audit-delete-after-archive
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { AuditLog, EmailLog, SystemLog } = require('../models');

function getArg(name, defaultValue) {
  const key = `--${name}=`;
  const found = process.argv.find((a) => a.startsWith(key));
  if (!found) return defaultValue;
  return found.slice(key.length);
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function daysToMs(days) {
  return Number(days) * 24 * 60 * 60 * 1000;
}

async function archiveAuditLogs({ beforeDate, outFile, batchSize = 1000, dryRun }) {
  const where = { createdAt: { [Op.lt]: beforeDate } };
  const total = await AuditLog.count({ where });
  if (!total) return { total: 0, archived: 0 };

  if (dryRun) {
    return { total, archived: 0 };
  }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

  let lastId = 0;
  let archived = 0;

  // JSONL：每行一筆，便於後續匯入/審計
  while (true) {
    const rows = await AuditLog.findAll({
      where: {
        ...where,
        id: { [Op.gt]: lastId },
      },
      order: [['id', 'ASC']],
      limit: batchSize,
    });

    if (!rows.length) break;

    const lines = rows.map((r) => JSON.stringify(r.get({ plain: true }))).join('\n') + '\n';
    fs.appendFileSync(outFile, lines, 'utf8');

    archived += rows.length;
    lastId = rows[rows.length - 1].id;
  }

  return { total, archived };
}

async function deleteOldModelRows({ model, beforeDate, dryRun, label }) {
  const where = { createdAt: { [Op.lt]: beforeDate } };
  const total = await model.count({ where });
  if (!total) return { total: 0, deleted: 0 };

  if (dryRun) return { total, deleted: 0 };

  const deleted = await model.destroy({ where });
  return { total, deleted };
}

async function main() {
  const dryRun = hasFlag('dry-run');

  const systemDays = Number(getArg('system-days', 60));
  const emailDays = Number(getArg('email-days', 180));
  const auditArchiveDays = Number(getArg('audit-archive-days', 730));

  const archiveAudit = hasFlag('archive-audit') || hasFlag('audit-archive');
  const auditDeleteAfterArchive = hasFlag('audit-delete-after-archive');

  const now = new Date();

  const systemBefore = new Date(now.getTime() - daysToMs(systemDays));
  const emailBefore = new Date(now.getTime() - daysToMs(emailDays));
  const auditBefore = new Date(now.getTime() - daysToMs(auditArchiveDays));

  console.log('[cleanup-logs] dryRun=', dryRun);
  console.log('[cleanup-logs] systemBefore=', systemBefore.toISOString());
  console.log('[cleanup-logs] emailBefore=', emailBefore.toISOString());
  console.log('[cleanup-logs] auditBefore=', auditBefore.toISOString());

  const [systemRes, emailRes] = await Promise.all([
    deleteOldModelRows({ model: SystemLog, beforeDate: systemBefore, dryRun, label: 'system_logs' }),
    deleteOldModelRows({ model: EmailLog, beforeDate: emailBefore, dryRun, label: 'email_logs' }),
  ]);

  let auditRes = null;
  if (archiveAudit) {
    const outFile = path.join(
      __dirname,
      '../archives/audit-logs',
      `audit-logs-before-${auditBefore.toISOString().slice(0, 10)}.jsonl`
    );

    auditRes = await archiveAuditLogs({
      beforeDate: auditBefore,
      outFile,
      dryRun,
    });

    console.log('[cleanup-logs] audit archive:', auditRes);

    if (auditDeleteAfterArchive && !dryRun) {
      const del = await deleteOldModelRows({
        model: AuditLog,
        beforeDate: auditBefore,
        dryRun: false,
        label: 'audit_logs',
      });
      auditRes.deleteRes = del;
    }
  }

  console.log('[cleanup-logs] system_logs:', systemRes);
  console.log('[cleanup-logs] email_logs:', emailRes);
  console.log('[cleanup-logs] audit_logs:', auditRes);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('cleanup-logs failed:', e);
      process.exit(1);
    });
}

