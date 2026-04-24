import React from 'react';
import './statusBadge.css';

/**
 * 全站統一狀態 pill（藍白學術風、低對比動效）
 * variant：success | neutral | warning | danger | info
 */
export default function StatusBadge({
  variant = 'neutral',
  size = 'sm',
  children,
  ariaLabel,
  className = '',
  ...rest
}) {
  const rootClass = [
    'status-badge',
    `status-badge--${variant}`,
    size === 'sm' ? 'status-badge--sm' : '',
    size === 'md' ? 'status-badge--md' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={rootClass} aria-label={ariaLabel || undefined} {...rest}>
      {children}
    </span>
  );
}
