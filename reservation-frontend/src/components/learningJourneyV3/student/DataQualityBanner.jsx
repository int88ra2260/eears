import React from 'react';

export default function DataQualityBanner({ warnings }) {
  const rows = Array.isArray(warnings) ? warnings : [];
  if (!rows.length) return null;
  return (
    <div className="bg-warning-subtle border border-warning-subtle text-warning-emphasis rounded p-3 mb-3">
      <div className="fw-semibold mb-2">資料品質提醒</div>
      <ul className="mb-0 ps-3">
        {rows.map((w, idx) => (
          <li key={`${w.section || 'section'}-${w.code || 'code'}-${idx}`}>
            {w.message || '資料來源暫時不可用'}
          </li>
        ))}
      </ul>
    </div>
  );
}
