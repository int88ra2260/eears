import React from 'react';

export default function SectionCard({ children, className = '' }) {
  return <section className={`tracking-section-card ${className}`.trim()}>{children}</section>;
}

