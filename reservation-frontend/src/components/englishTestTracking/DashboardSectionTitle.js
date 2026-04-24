import React from 'react';

export default function DashboardSectionTitle({ title, accent = 'purple' }) {
  return (
    <div className={`tracking-section-title tracking-section-title--${accent}`}>
      {title}
    </div>
  );
}

