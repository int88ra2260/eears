import React from 'react';
import { formatCount, formatPercent } from './formatters';

function iconForSkill(skill) {
  switch (skill) {
    case 'LISTENING':
      return '🎧';
    case 'READING':
      return '📘';
    case 'SPEAKING':
      return '🎤';
    case 'WRITING':
      return '✍️';
    default:
      return '•';
  }
}

export default function SkillRateCard({ item, theme = 'purple', loading = false }) {
  if (loading) {
    return (
      <div className="skill-rate-card skill-rate-card--loading">
        <div className="skeleton skeleton-circle" />
        <div className="skeleton skeleton-line" />
        <div className="skeleton skeleton-line skeleton-line--short" />
      </div>
    );
  }

  return (
    <article className={`skill-rate-card skill-rate-card--${theme}`}>
      <div className="skill-rate-card__icon">{iconForSkill(item.skill)}</div>
      <div className="skill-rate-card__body">
        <div className="skill-rate-card__label">{item.label} (B2以上)</div>
        <div className="skill-rate-card__percent">{formatPercent(item.percentage)}</div>
        <div className="skill-rate-card__meta">
          ({formatCount(item.passed)}/{formatCount(item.total)})
        </div>
      </div>
    </article>
  );
}

