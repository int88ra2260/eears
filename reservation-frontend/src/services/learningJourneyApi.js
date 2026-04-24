import { fetchClient } from '../utils/fetchClient';

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function parseEnvelope(res) {
  const headerRid = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || '';
  const json = await res.json().catch(() => ({}));
  const bodyRid = json.requestId || json.meta?.traceId || '';
  const requestId = bodyRid || headerRid;
  if (!res.ok) {
    const msg = json.error || json.message || `HTTP ${res.status}`;
    const err = new Error(requestId ? `${msg}（Request-ID: ${requestId}）` : msg);
    err.requestId = requestId;
    err.status = res.status;
    throw err;
  }
  if (json && json.success === false) {
    const err = new Error(json.error || 'Request failed');
    err.requestId = requestId;
    throw err;
  }
  return json.data != null ? json.data : json;
}

export async function getLearningJourneyProfile(token, studentId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/students/${encodeURIComponent(studentId)}/profile`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyTimeline(token, studentId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/students/${encodeURIComponent(studentId)}/timeline`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneySemesterDashboard(token, semesterId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/semesters/${encodeURIComponent(semesterId)}/dashboard`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyReconciliation(token, semesterId) {
  const qs = new URLSearchParams();
  qs.set('semesterId', semesterId);
  const res = await fetchClient(`/api/v3/learning-journey/admin/reconciliation?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  return parseEnvelope(res);
}

export async function getLearningJourneyReadiness(token, semesterId) {
  const qs = new URLSearchParams();
  qs.set('semesterId', semesterId);
  const res = await fetchClient(`/api/v3/learning-journey/admin/readiness?${qs.toString()}`, {
    headers: authHeaders(token),
  });
  return parseEnvelope(res);
}

/**
 * @param {string} token
 * @param {{ semesterId: string, sections: string[], dryRun: boolean }} body
 */
export async function getLearningJourneyEnglishTestSummaryV3(token, semesterId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/semesters/${encodeURIComponent(semesterId)}/english-test-summary`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyEnglishTestStudentsCompare(token, semesterId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/semesters/${encodeURIComponent(semesterId)}/english-test-students/compare`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyEnglishTestStudentDetailCompare(token, semesterId, studentId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/semesters/${encodeURIComponent(semesterId)}/english-test-students/${encodeURIComponent(studentId)}/compare`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function getLearningJourneyEnglishTestSummaryCompare(token, semesterId) {
  const res = await fetchClient(
    `/api/v3/learning-journey/semesters/${encodeURIComponent(semesterId)}/english-test-summary/compare`,
    { headers: authHeaders(token) }
  );
  return parseEnvelope(res);
}

export async function postLearningJourneySync(token, body) {
  const res = await fetchClient('/api/v3/learning-journey/admin/sync', {
    method: 'POST',
    headers: {
      ...authHeaders(token),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return parseEnvelope(res);
}
