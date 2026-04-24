import React from 'react';
import './skeletonCard.css';

/**
 * 統一 Skeleton 卡片（不影響商業邏輯）
 */
export default function SkeletonCard({ lines = 3, titleHeight = 14 }) {
  return (
    <div className="skeleton-card" aria-hidden>
      <div className="skeleton-line skeleton-title" style={{ height: titleHeight }} />
      {Array.from({ length: Math.max(1, lines) }).map((_, idx) => (
        <div
          // eslint-disable-next-line react/no-array-index-key
          key={idx}
          className="skeleton-line"
          style={{
            height: idx === 0 ? 12 : 10,
            opacity: 0.95 - idx * 0.08,
            width: idx === 0 ? '80%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

