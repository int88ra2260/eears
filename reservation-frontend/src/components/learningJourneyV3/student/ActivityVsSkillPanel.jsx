import React from 'react';

function sumActivity(activitySummary) {
  const byType = Array.isArray(activitySummary?.byType) ? activitySummary.byType : [];
  return byType.reduce((acc, row) => {
    acc.signedIn += Number(row.signedIn || 0);
    acc.absent += Number(row.absent || 0);
    acc.cancelled += Number(row.cancelled || 0);
    return acc;
  }, { signedIn: 0, absent: 0, cancelled: 0 });
}

export default function ActivityVsSkillPanel({ activitySummary, bestSkills }) {
  const activity = sumActivity(activitySummary);
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <div className="border rounded p-3 h-100">
          <div className="text-muted small">活動簽到</div>
          <div className="h5 mb-0">{activity.signedIn}</div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="border rounded p-3 h-100">
          <div className="text-muted small">活動缺席</div>
          <div className="h5 mb-0">{activity.absent}</div>
        </div>
      </div>
      <div className="col-md-4">
        <div className="border rounded p-3 h-100">
          <div className="text-muted small">活動取消</div>
          <div className="h5 mb-0">{activity.cancelled}</div>
        </div>
      </div>
      <div className="col-12">
        <div className="border rounded p-3">
          <div className="text-muted small mb-2">四技能目前最佳 CEFR</div>
          <div className="d-flex flex-wrap gap-3">
            <span>聽力：{bestSkills?.listening?.cefr || '—'}</span>
            <span>閱讀：{bestSkills?.reading?.cefr || '—'}</span>
            <span>口說：{bestSkills?.speaking?.cefr || '—'}</span>
            <span>寫作：{bestSkills?.writing?.cefr || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
