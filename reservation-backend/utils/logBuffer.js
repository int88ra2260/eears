/**
 * 程序內最近 N 筆「系統／請求」摘要，供管理端 GET /api/admin/logs/system 查閱。
 * 程序重啟即清空；大量部署時可日後改寫入檔案或外部 log 聚合。
 */
const MAX = 500;
const buffer = [];

function push(entry) {
  const row = {
    at: new Date().toISOString(),
    ...entry,
  };
  buffer.push(row);
  if (buffer.length > MAX) {
    buffer.splice(0, buffer.length - MAX);
  }
}

function list({ limit = 100, offset = 0 } = {}) {
  const lim = Math.min(Math.max(parseInt(limit, 10) || 100, 1), MAX);
  const off = Math.max(parseInt(offset, 10) || 0, 0);
  const total = buffer.length;
  const end = Math.max(0, total - off);
  const start = Math.max(0, end - lim);
  const items = buffer.slice(start, end).reverse();
  return {
    items,
    total,
    limit: lim,
    offset: off,
  };
}

module.exports = { push, list, MAX };
