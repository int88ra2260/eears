import { fetchClient } from '../utils/fetchClient';

const BASE_URL = '/api/admin/learning-journey-v3';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseEnvelope(res) {
  const json = await res.json().catch(() => ({}));
  const requestId = json.requestId || res.headers.get('x-request-id') || '';
  if (!res.ok || json.success === false) {
    const msg = json.error || json.message || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.requestId = requestId;
    err.status = res.status;
    throw err;
  }
  return json.data != null ? json.data : json;
}

export async function getLearningJourneyV3B2Report(token, semesterId) {
  const res = await fetchClient(
    `${BASE_URL}/semesters/${encodeURIComponent(semesterId)}/b2-report`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyV3Students(token, semesterId, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  });
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetchClient(
    `${BASE_URL}/semesters/${encodeURIComponent(semesterId)}/students${query}`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyV3Breakdown(token, semesterId, groupBy) {
  const qs = new URLSearchParams();
  qs.set('groupBy', groupBy);
  const res = await fetchClient(
    `${BASE_URL}/semesters/${encodeURIComponent(semesterId)}/breakdown?${qs.toString()}`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyV3StudentProfile(token, studentId, semesterId) {
  const qs = new URLSearchParams();
  if (semesterId) qs.set('semesterId', semesterId);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetchClient(
    `${BASE_URL}/students/${encodeURIComponent(studentId)}/profile${query}`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyV3StudentTrends(token, studentId, semesterId) {
  const qs = new URLSearchParams();
  if (semesterId) qs.set('semesterId', semesterId);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const res = await fetchClient(
    `${BASE_URL}/students/${encodeURIComponent(studentId)}/trends${query}`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}
