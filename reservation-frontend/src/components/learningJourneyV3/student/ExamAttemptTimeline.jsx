import React from 'react';

const EMPTY = '—';
const SKILLS = ['listening', 'reading', 'speaking', 'writing'];

function cellText(skills, key) {
  const v = skills?.[key];
  if (!v) return EMPTY;
  return `${v.score ?? EMPTY} / ${v.cefr ?? EMPTY}`;
}

export default function ExamAttemptTimeline({ examAttempts }) {
  if (!Array.isArray(examAttempts) || examAttempts.length === 0) {
    return <div className="alert alert-secondary mb-0">尚無考試紀錄。</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-striped align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>日期</th>
            <th>考試類別</th>
            <th>聽力</th>
            <th>閱讀</th>
            <th>口說</th>
            <th>寫作</th>
          </tr>
        </thead>
        <tbody>
          {examAttempts.map((row) => (
            <tr key={row.id}>
              <td>{row.examDate || EMPTY}</td>
              <td>{row.examType || EMPTY}</td>
              {SKILLS.map((sk) => <td key={sk}>{cellText(row.skills, sk)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
