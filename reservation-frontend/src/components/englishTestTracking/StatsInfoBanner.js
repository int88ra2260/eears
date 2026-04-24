import React from 'react';
import { formatCount } from './formatters';

export default function StatsInfoBanner({
  rosterActiveStudentCount,
  validBestScoreStudentCount,
  attainedStudentCount,
  filterDescription
}) {
  return (
    <div className="tracking-info-banner">
      <div className="tracking-info-banner__left">
        <div className="tracking-info-icon">i</div>
        <div>
          <div className="tracking-info-title">學期摘要指標（學生去重）</div>
          <div className="tracking-info-desc">{filterDescription}</div>
        </div>
      </div>
      <div className="tracking-info-banner__right">
        <span className="me-3">名冊在學總人數：<strong>{formatCount(rosterActiveStudentCount)}</strong></span>
        <span className="me-3">有有效英檢成績人數：<strong>{formatCount(validBestScoreStudentCount)}</strong></span>
        <span>達標人數：<strong>{formatCount(attainedStudentCount)}</strong></span>
      </div>
    </div>
  );
}

