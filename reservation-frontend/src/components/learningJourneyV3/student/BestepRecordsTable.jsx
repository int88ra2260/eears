import React from 'react';

const EMPTY = '—';

function scoreText(score) {
  if (!score) return EMPTY;
  return `L:${score.listening ?? '-'} R:${score.reading ?? '-'} S:${score.speaking ?? '-'} W:${score.writing ?? '-'} / ${score.overallLevel ?? '-'}`;
}

export default function BestepRecordsTable({ bestepRecords }) {
  const rows = Array.isArray(bestepRecords) ? bestepRecords : [];
  if (rows.length === 0) return <div className="alert alert-secondary mb-0">尚無培力英檢紀錄。</div>;
  return (
    <div className="table-responsive">
      <table className="table table-sm table-striped align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>學期</th>
            <th>報考項目</th>
            <th>報名狀態</th>
            <th>出席狀況</th>
            <th>成績</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={`${row.semesterId}-${row.examScope}-${idx}`}>
              <td>{row.semesterId || EMPTY}</td>
              <td>{row.examScope || EMPTY}</td>
              <td>{row.registrationStatus || EMPTY}</td>
              <td>{row.attendanceStatus || EMPTY}</td>
              <td>{scoreText(row.score)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
