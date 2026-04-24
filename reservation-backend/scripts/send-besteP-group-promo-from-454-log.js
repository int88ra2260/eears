/**
 * 批次發送「培力英檢團體推廣信」給 454 錯誤收件人（自終端機紀錄.txt 自動抽名單）
 *
 * 預設為 dry-run（只列出將寄送的名單，不會真的寄出）。
 *
 * 使用方式（在 reservation-backend 目錄）：
 *   node scripts/send-besteP-group-promo-from-454-log.js
 *
 * 真的要寄：
 *   node scripts/send-besteP-group-promo-from-454-log.js --send
 *
 * 自訂 log 路徑：
 *   node scripts/send-besteP-group-promo-from-454-log.js --log "F:\\EEARS_backup_20251211\\終端機紀錄.txt"
 *
 * 自訂活動連結：
 *   node scripts/send-besteP-group-promo-from-454-log.js --link "http://.../register/english-test/group"
 *
 * 調整節流（毫秒，預設 5000）：
 *   node scripts/send-besteP-group-promo-from-454-log.js --delay 8000
 *
 * 限制本次只處理前 N 位收件人（降低單次批次風險）：
 *   node scripts/send-besteP-group-promo-from-454-log.js --limit 50
 *
 * 重試策略：
 *   451（包含 451-4.3.0）也會視為暫時性失敗並進行指數退避重試
 */

const fs = require('fs');
const path = require('path');
const emailLogService = require('../services/emailLogService');

function parseArgs(argv) {
  const out = {
    send: false,
    logPath: 'F:\\EEARS_backup_20251211\\終端機紀錄.txt',
    registrationShortLink: undefined,
    // Gmail 對大量/自動寄送可能會做暫時性節流；預設拉長降低風控觸發機率
    delayMs: 5000,
    maxRetries: 4,
    // 限制本次只處理前 N 個收件人（降低單次批次風險）
    limit: undefined,
    outDir: path.resolve(process.cwd(), 'scripts', 'out'),
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--send') out.send = true;
    else if (a === '--dry-run') out.send = false;
    else if (a === '--log') out.logPath = argv[++i];
    else if (a === '--link') out.registrationShortLink = argv[++i];
    else if (a === '--delay') out.delayMs = Number(argv[++i]);
    else if (a === '--retries') out.maxRetries = Number(argv[++i]);
    else if (a === '--limit') out.limit = Number(argv[++i]);
    else if (a === '--out') out.outDir = path.resolve(argv[++i]);
  }

  if (!Number.isFinite(out.delayMs) || out.delayMs < 0) out.delayMs = 5000;
  if (!Number.isFinite(out.maxRetries) || out.maxRetries < 0) out.maxRetries = 4;
  if (!Number.isFinite(out.limit) || out.limit <= 0) out.limit = undefined;
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function extractUnique454RecipientsFromLog(logText) {
  // 依 email.js 的錯誤輸出格式：「❌ Failed to send email: <template> ... 收件人: xxx」
  // 以 marker 切割成區塊，找出含 454 的區塊，再擷取「收件人:」
  const marker = 'Failed to send email:';
  const blocks = logText.includes(marker) ? logText.split(marker).slice(1) : [logText];
  const recipients = [];
  const recRe = /收件人\s*:\s*([^\s]+)/;

  for (const b of blocks) {
    if (/\b454\b/.test(b) || /454-4\.7\.0/i.test(b)) {
      const m = b.match(recRe);
      if (m && m[1]) recipients.push(m[1].trim());
    }
  }

  // 去重（不做大小寫正規化，避免意外改變原始地址；排序時才用 lower-case）
  const uniq = Array.from(new Set(recipients));
  uniq.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  return { uniqRecipients: uniq, totalEvents: recipients.length };
}

function isRetryableEmailSoftReject(err) {
  const rawCode = err && (err.responseCode || err.code);
  const codeNum = typeof rawCode === 'string' ? Number(rawCode) : rawCode;

  // 454：你既有邏輯允許重試
  if (codeNum === 454) return true;

  // 451：Gmail 常見暫時拒絕類型（包含 451-4.3.0）
  if (codeNum === 451) return true;

  // nodemailer 有時候資訊出現在 message/response 文字中
  const msg = String((err && (err.message || err.response)) || '');
  return (
    /\b454\b/.test(msg) ||
    /\b451\b/.test(msg) ||
    /\b4\.3\.0\b/.test(msg) ||
    /Too many login attempts/i.test(msg)
  );
}

async function sendWithRetries({ email, registrationShortLink }, maxRetries) {
  let attempt = 0;
  // 指數退避 + 抖動，避免連續觸發
  while (true) {
    try {
      await emailLogService.sendEmailWithLog(
        'englishTestRegistrationGroupPromo',
        {
        email,
        // 名單只有 email，姓名可留空；模板會 fallback 成空字串
        name: '',
        studentNameZh: '',
        registrationShortLink,
        },
        {
          requestId: `script:promo454:${email}`,
          relatedEntityType: 'english_test',
          relatedEntityId: 'bulk_454',
        }
      );
      return { ok: true };
    } catch (err) {
      attempt++;
      if (attempt > maxRetries || !isRetryableEmailSoftReject(err)) {
        return { ok: false, error: err };
      }
      // 451/4.3.0 也屬於暫時拒絕，縮短第一次重試間隔更符合「很快恢復」的情境
      const base = 5_000; // 5 秒起跳
      const backoff = base * Math.pow(2, attempt - 1);
      const jitter = Math.floor(Math.random() * 1000);
      await sleep(backoff + jitter);
    }
  }
}

function toCsvRow(fields) {
  // very small CSV writer (escape quotes)
  return fields
    .map((v) => {
      const s = String(v ?? '');
      const escaped = s.replace(/\"/g, '""');
      return `"${escaped}"`;
    })
    .join(',');
}

async function main() {
  const opts = parseArgs(process.argv);
  const logAbs = path.resolve(opts.logPath);
  const outDir = opts.outDir;
  ensureDir(outDir);

  if (!fs.existsSync(logAbs)) {
    console.error(`找不到 log 檔：${logAbs}`);
    process.exitCode = 1;
    return;
  }

  const logText = fs.readFileSync(logAbs, 'utf8');
  const { uniqRecipients, totalEvents } = extractUnique454RecipientsFromLog(logText);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const limitSuffix = opts.limit ? `-limit-${opts.limit}` : '';
  const listPath = path.join(outDir, `group-promo-454-recipients-${ts}${limitSuffix}.txt`);
  const reportCsvPath = path.join(outDir, `group-promo-454-report-${ts}${limitSuffix}.csv`);

  const recipientsToProcess = opts.limit ? uniqRecipients.slice(0, opts.limit) : uniqRecipients;

  fs.writeFileSync(listPath, recipientsToProcess.join('\n') + '\n', 'utf8');
  fs.writeFileSync(
    reportCsvPath,
    [
      toCsvRow(['timestamp', 'mode', 'total_454_events', 'unique_recipients', 'delay_ms', 'max_retries']),
      toCsvRow([new Date().toISOString(), opts.send ? 'send' : 'dry-run', totalEvents, recipientsToProcess.length, opts.delayMs, opts.maxRetries]),
      '',
      toCsvRow(['email', 'result', 'error']),
    ].join('\n') + '\n',
    'utf8'
  );

  console.log(`✅ 解析完成：454 事件數=${totalEvents}，收件人（去重）=${uniqRecipients.length}`);
  if (recipientsToProcess.length !== uniqRecipients.length) {
    console.log(`ℹ️  本次只處理前 ${recipientsToProcess.length} 位收件人（--limit ${opts.limit}）`);
  }
  console.log(`📄 名單輸出：${listPath}`);
  console.log(`📄 報表輸出：${reportCsvPath}`);
  console.log(opts.send ? '⚠️ 目前模式：SEND（真的寄信）' : 'ℹ️ 目前模式：DRY-RUN（不寄信）');

  const link = opts.registrationShortLink; // 若不給，模板會自帶預設連結

  let ok = 0;
  let fail = 0;

  for (let idx = 0; idx < recipientsToProcess.length; idx++) {
    const email = recipientsToProcess[idx];
    const label = `[${idx + 1}/${recipientsToProcess.length}] ${email}`;

    if (!opts.send) {
      console.log(`(dry-run) ${label}`);
      continue;
    }

    // 節流：每封之間固定延遲
    if (idx > 0 && opts.delayMs > 0) await sleep(opts.delayMs);

    const r = await sendWithRetries({ email, registrationShortLink: link }, opts.maxRetries);
    if (r.ok) {
      ok++;
      fs.appendFileSync(reportCsvPath, toCsvRow([email, 'ok', '']) + '\n', 'utf8');
      console.log(`✅ ${label}`);
    } else {
      fail++;
      const msg = String((r.error && (r.error.message || r.error.response)) || r.error || 'unknown error');
      fs.appendFileSync(reportCsvPath, toCsvRow([email, 'fail', msg]) + '\n', 'utf8');
      console.log(`❌ ${label}`);
    }
  }

  if (opts.send) {
    console.log(`完成：成功 ${ok}、失敗 ${fail}（詳見報表：${reportCsvPath}）`);
  } else {
    console.log('dry-run 完成。若要真的寄送，請加上參數 --send');
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

