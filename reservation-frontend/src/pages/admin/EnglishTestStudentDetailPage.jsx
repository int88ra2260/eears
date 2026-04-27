import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getStudentDetail } from '../../services/englishTestService';

const EMPTY = '—';

function buildSkillMap(skillScores = []) {
  const map = { listening: null, reading: null, speaking: null, writing: null };
  skillScores.forEach((s) => {
    if (s && s.skill && Object.prototype.hasOwnProperty.call(map, s.skill)) {
      map[s.skill] = s;
    }
  });
  return map;
}

export default function EnglishTestStudentDetailPage() {
  const token = localStorage.getItem('token') || '';
  const { studentId } = useParams();
  const [search] = useSearchParams();
  const semesterId = search.get('semesterId') || '';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!studentId || !semesterId) return;
      setLoading(true);
      setError('');
      try {
        const detail = await getStudentDetail(token, semesterId, studentId);
        if (mounted) setData(detail);
      } catch (e) {
        if (mounted) {
          setData(null);
          setError(e.message || '載入學生詳細資料失敗');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token, studentId, semesterId]);

  const attempts = useMemo(() => (Array.isArray(data?.attempts) ? data.attempts : []), [data]);

  return (
    <div className="container-fluid py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">學生英檢詳細 V2</h4>
        <div className="d-flex align-items-center gap-2">
          {data?.source ? (
            <span className={`badge ${String(data.source).includes('learning_journey_v3') ? 'bg-info text-dark' : 'bg-secondary'}`}>
              source: {data.source}
            </span>
          ) : null}
          <Link className="btn btn-outline-secondary" to={`/admin/english-test-v2/students?semesterId=${encodeURIComponent(semesterId)}`}>
            返回列表
          </Link>
        </div>
      </div>

      {!semesterId && <div className="alert alert-warning">缺少 semesterId，請從學生列表進入。</div>}
      {error && <div className="alert alert-danger">{error}</div>}
      {loading && <div className="alert alert-info">載入中...</div>}
      {!loading && !error && !data && <div className="alert alert-secondary">無資料</div>}

      {!loading && data && (
        <>
          <div className="card mb-3">
            <div className="card-header">Roster 基本資料</div>
            <div className="card-body">
              <div>學號：{data.roster?.studentId || studentId}</div>
              <div>姓名：{data.roster?.studentName || EMPTY}</div>
              <div>年級：{data.roster?.grade || EMPTY}</div>
              <div>系所：{data.roster?.department || EMPTY}</div>
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">Best Skills</div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-3">Listening: {data.bestSkills?.bestListeningCefr || EMPTY}</div>
                <div className="col-md-3">Reading: {data.bestSkills?.bestReadingCefr || EMPTY}</div>
                <div className="col-md-3">Speaking: {data.bestSkills?.bestSpeakingCefr || EMPTY}</div>
                <div className="col-md-3">Writing: {data.bestSkills?.bestWritingCefr || EMPTY}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">Attempts</div>
            <div className="card-body">
              {!attempts.length ? (
                <div className="text-muted">尚無英檢紀錄</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>examType</th>
                        <th>examDate</th>
                        <th>Listening</th>
                        <th>Reading</th>
                        <th>Speaking</th>
                        <th>Writing</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attempts.map((attempt) => {
                        const m = buildSkillMap(attempt.skillScores || []);
                        return (
                          <tr key={attempt.id}>
                            <td>{attempt.examType || EMPTY}</td>
                            <td>{attempt.examDate || EMPTY}</td>
                            <td>{m.listening ? `${m.listening.rawScore ?? EMPTY} / ${m.listening.cefr || EMPTY}` : EMPTY}</td>
                            <td>{m.reading ? `${m.reading.rawScore ?? EMPTY} / ${m.reading.cefr || EMPTY}` : EMPTY}</td>
                            <td>{m.speaking ? `${m.speaking.rawScore ?? EMPTY} / ${m.speaking.cefr || EMPTY}` : EMPTY}</td>
                            <td>{m.writing ? `${m.writing.rawScore ?? EMPTY} / ${m.writing.cefr || EMPTY}` : EMPTY}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

