// components/admin/home/DeleteEventConfirmModal.js
// 刪除活動確認 Modal：密碼輸入與按鈕，API 與驗證保留在 AdminHome。

import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import ErrorAlert from '../shared/ErrorAlert';

/**
 * @param {Object} props
 * @param {boolean} props.show
 * @param {string} props.eventName - 活動名稱（用於顯示）
 * @param {string} props.password
 * @param {(value: string) => void} props.onPasswordChange
 * @param {boolean} props.loading
 * @param {string} props.error - 表單/API 錯誤，由 parent 設定（可選）
 * @param {() => void} props.onClose
 * @param {() => void} props.onSubmit - 點「確認刪除」時呼叫
 */
export default function DeleteEventConfirmModal({
  show,
  eventName,
  password,
  onPasswordChange,
  loading,
  error,
  onClose,
  onSubmit
}) {
  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>確認刪除活動</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>您確定要刪除活動「<strong>{eventName}</strong>」嗎？</p>
        <p className="text-danger">此操作無法復原，且會刪除所有相關的預約記錄。</p>
        {error && <ErrorAlert error={error} />}
        <Form.Group className="mb-3">
          <Form.Label>請輸入管理員密碼確認：</Form.Label>
          <Form.Control
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="請輸入管理員密碼"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          取消
        </Button>
        <Button
          variant="danger"
          onClick={onSubmit}
          disabled={loading || !password}
        >
          {loading ? '刪除中...' : '確認刪除'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
