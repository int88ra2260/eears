import React from 'react';

/**
 * 統一的 Empty State（低干擾、可加動作）
 */
export default function EmptyState({
  icon = 'ℹ️',
  title,
  description,
  actions,
}) {
  return (
    <div
      className="text-center py-4"
      role="status"
      aria-live="polite"
    >
      {icon && <div style={{ fontSize: '1.5rem' }} aria-hidden>{icon}</div>}
      {title && <div className="fw-bold mt-2">{title}</div>}
      {description && <div className="text-muted mt-2">{description}</div>}
      {actions && <div className="mt-3 d-flex flex-wrap justify-content-center gap-2">{actions}</div>}
    </div>
  );
}

