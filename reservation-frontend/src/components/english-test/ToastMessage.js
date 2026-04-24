// 簡單 Toast 回饋（Bootstrap 5 樣式）
import React, { useEffect } from 'react';

export default function ToastMessage({ show, message, variant = 'success', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!show || !onClose || !duration) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [show, onClose, duration]);

  if (!show || !message) return null;

  const bgClass = {
    success: 'bg-success text-white',
    danger: 'bg-danger text-white',
    warning: 'bg-warning text-dark',
    info: 'bg-info text-white'
  }[variant] || 'bg-success text-white';

  return (
    <div
      className={`position-fixed bottom-0 end-0 p-3 ${bgClass}`}
      style={{
        zIndex: 9999,
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        minWidth: '200px',
        maxWidth: '360px'
      }}
      role="alert"
      aria-live="polite"
    >
      <div className="d-flex align-items-center">
        <span className="flex-grow-1">{message}</span>
        <button
          type="button"
          className="btn-close btn-close-white btn-sm ms-2"
          onClick={onClose}
          aria-label="關閉"
        />
      </div>
    </div>
  );
}
