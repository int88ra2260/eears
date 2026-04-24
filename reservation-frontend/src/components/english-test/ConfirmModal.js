// 自訂確認框，取代 window.confirm，提升無障礙與一致性
import React from 'react';

export default function ConfirmModal({
  show,
  title = '確認',
  message,
  confirmLabel = '確定',
  cancelLabel = '取消',
  variant = 'primary',
  onConfirm,
  onCancel
}) {
  if (!show) return null;

  return (
    <div
      className="modal fade show"
      style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmModalTitle"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="confirmModalTitle">{title}</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onCancel}
              aria-label="關閉"
            />
          </div>
          <div className="modal-body">{message}</div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className={`btn btn-${variant}`}
              onClick={async () => {
                if (onConfirm) await Promise.resolve(onConfirm());
                onCancel && onCancel();
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
