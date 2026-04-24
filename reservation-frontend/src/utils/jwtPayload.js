/**
 * 解碼 JWT payload。JWT 使用 base64url，必須轉成標準 base64 並補齊 padding 才能用 atob。
 * @param {string|null|undefined} token
 * @returns {object|null}
 */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64Url = parts[1];
  try {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (base64.length % 4)) % 4;
    const padded = base64 + '='.repeat(padLen);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}
