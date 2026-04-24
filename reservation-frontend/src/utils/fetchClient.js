/**
 * 與 axiosClient 對齊：自動帶 x-request-id，便於與後端 system_logs / audit 串聯。
 * 預設 same-origin；回傳原生 Response，由呼叫端決定是否檢查 ok（相容既有 fetch 用法）。
 */

function nextRequestId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `rid:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

/**
 * 合併 headers 並確保帶有 x-request-id
 * @param {RequestInit} init
 * @returns {{ headers: Headers, clientRequestId: string }}
 */
export function mergeRequestIdHeaders(init = {}) {
  const headers = new Headers();
  const raw = init.headers;
  if (raw instanceof Headers) {
    raw.forEach((v, k) => headers.set(k, v));
  } else if (raw && typeof raw === 'object') {
    Object.entries(raw).forEach(([k, v]) => {
      if (v != null) headers.set(k, String(v));
    });
  }
  let clientRequestId = headers.get('x-request-id') || headers.get('X-Request-Id');
  if (!clientRequestId) {
    clientRequestId = nextRequestId();
    headers.set('x-request-id', clientRequestId);
  } else {
    clientRequestId = String(clientRequestId).slice(0, 64);
  }
  return { headers, clientRequestId };
}

/**
 * @param {RequestInfo} input
 * @param {RequestInit} [init]
 * @returns {Promise<Response>}
 */
export async function fetchClient(input, init = {}) {
  const { headers } = mergeRequestIdHeaders(init);
  const nextInit = {
    ...init,
    headers,
    credentials: init.credentials ?? 'same-origin',
  };
  const res = await fetch(input, nextInit);
  await handleStaleAccessResponse(res);
  return res;
}

/**
 * 失敗時拋錯並附 requestId（與 axiosClient 錯誤訊息風格一致）
 * @param {RequestInfo} input
 * @param {RequestInit} [init]
 */
export async function fetchClientThrow(input, init = {}) {
  const { headers, clientRequestId } = mergeRequestIdHeaders(init);
  const nextInit = {
    ...init,
    headers,
    credentials: init.credentials ?? 'same-origin',
  };
  const res = await fetch(input, nextInit);
  await handleStaleAccessResponse(res);
  if (res.ok) return res;
  const serverRid = res.headers.get('x-request-id') || res.headers.get('X-Request-Id');
  const requestId = serverRid || clientRequestId || null;

  let apiMessage = `HTTP ${res.status}`;
  try {
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) {
      const j = await res.json();
      apiMessage =
        (j && (j.error || j.message)) ||
        (typeof j === 'string' ? j : apiMessage);
    } else {
      const text = (await res.text()).trim().slice(0, 200);
      if (text) apiMessage = text;
    }
  } catch (_) {
    /* ignore */
  }

  const nextMessage = requestId ? `${apiMessage} (requestId: ${requestId})` : apiMessage;
  const err = new Error(nextMessage);
  err.requestId = requestId;
  err.status = res.status;
  throw err;
}

let staleHandledAt = 0;
let staleHandledRequestId = null;

export async function handleStaleAccessResponse(res) {
  if (!res || res.status !== 401) return;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  if (!ct.includes('application/json')) return;

  let payload = null;
  try {
    payload = await res.clone().json();
  } catch (_) {
    return;
  }
  if (!payload || payload.code !== 'ACCESS_PROFILE_STALE') return;

  const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
  const now = Date.now();
  if (requestId && requestId === staleHandledRequestId && now - staleHandledAt < 5000) return;
  if (now - staleHandledAt < 2000) return;
  staleHandledAt = now;
  staleHandledRequestId = requestId;

  try {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    localStorage.removeItem('teacherName');
    localStorage.removeItem('mustResetPassword');
  } catch (_) {
    // ignore
  }
  try {
    window.dispatchEvent(new CustomEvent('eears:access-stale', { detail: payload }));
  } catch (_) {
    // ignore
  }
}
