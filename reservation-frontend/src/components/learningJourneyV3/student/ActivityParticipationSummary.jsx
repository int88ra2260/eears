import React from 'react';

export default function ActivityParticipationSummary({ activitySummary }) {
  const rows = Array.isArray(activitySummary?.byType) ? activitySummary.byType : [];
  if (rows.length === 0) {
    return <div className="alert alert-secondary mb-0">尚無活動參與紀錄。</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-sm table-bordered align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>活動類別</th>
            <th>已簽到</th>
            <th>缺席</th>
            <th>取消</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.activityType}>
              <td>{row.activityType}</td>
              <td>{Number(row.signedIn || 0)}</td>
              <td>{Number(row.absent || 0)}</td>
              <td>{Number(row.cancelled || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
