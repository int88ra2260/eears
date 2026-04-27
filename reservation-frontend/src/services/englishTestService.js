import { fetchClient } from '../utils/fetchClient';

// TODO (Phase Next):
// englishTestService 與 learningJourneyApi 存在部分領域重疊（學期摘要、學生資料）。
// 未來可考慮統一為單一 read model API（Learning Journey）。
// 本階段不進行重構，以避免影響既有功能。

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function parseOrThrow(res) {
  const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error || json?.message || `HTTP ${res.status}`;
    const err = new Error(requestId ? `${msg}（錯誤識別碼：${requestId}）` : msg);
    err.status = res.status;
    err.requestId = requestId;
    throw err;
  }
  return json;
}

export async function getSemesters(token) {
  const res = await fetchClient('/api/admin/english-tests/semesters', {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
}

export async function getSemesterSummary(token, semesterId) {
  const res = await fetchClient(`/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/summary`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
}

export async function getSemesterDepartmentStats(token, semesterId) {
  const res = await fetchClient(`/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/departments`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
}

export async function getSemesterCefrDistribution(token, semesterId) {
  const res = await fetchClient(`/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/cefr-distribution`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
}

export async function getSemesterDataQuality(token, semesterId) {
  const res = await fetchClient(`/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/data-quality`, {
    headers: authHeaders(token),
  });
  return parseOrThrow(res);
}

export async function getSemesterImportHistories(token, semesterId, params = {}) {
  const qs = new URLSearchParams();
  if (params.limit != null && params.limit !== '') qs.set('limit', String(params.limit));
  const res = await fetchClient(
    `/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/import-histories?${qs.toString()}`,
    {
      headers: authHeaders(token),
    }
  );
  return parseOrThrow(res);
}

export async function getSemesterStudents(token, semesterId, params = {}) {
  const normalized = { ...params };
  if (normalized.limit !== undefined) {
    const n = Number(normalized.limit);
    normalized.limit = Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), MAX_LIMIT) : DEFAULT_LIMIT;
  }
  if (normalized.offset !== undefined) {
    const n = Number(normalized.offset);
    normalized.offset = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }
  if (normalized.attained !== 'true' && normalized.attained !== 'false') {
    delete normalized.attained;
  }

  const qs = new URLSearchParams();
  Object.entries(normalized).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') qs.set(key, String(value));
  });
  const res = await fetchClient(
    `/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/students?${qs.toString()}`,
    {
      headers: authHeaders(token),
    }
  );
  return parseOrThrow(res);
}

export async function getStudentDetail(token, semesterId, studentId) {
  const res = await fetchClient(
    `/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/students/${encodeURIComponent(studentId)}`,
    {
      headers: authHeaders(token),
    }
  );
  return parseOrThrow(res);
}

export async function rebuildSemesterBestSkills(token, semesterId) {
  const res = await fetchClient(`/api/admin/english-tests/semesters/${encodeURIComponent(semesterId)}/rebuild`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({}),
  });
  return parseOrThrow(res);
}

