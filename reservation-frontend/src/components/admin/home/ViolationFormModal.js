// components/admin/home/ViolationFormModal.js
// 違規登記 Modal：表單 UI 與 callbacks，API、違規資料刷新與 business logic 保留在 AdminHome。

import React from 'react';
import { Modal, Form, Button } from 'react-bootstrap';
import ErrorAlert from '../shared/ErrorAlert';

const VIOLATION_TYPE_OPTIONS = [
  { value: '擾亂秩序', label: '擾亂秩序' },
  { value: '未遵守規定', label: '未遵守規定' },
  { value: '預約未到', label: '預約未到' },
  { value: '其他', label: '其他' }
];

/**
 * @param {Object} props
 * @param {boolean} props.show
 * @param {{ studentId: string, violationType: string, description: string }} props.fields
 * @param {boolean} props.loading
 * @param {string} props.error
 * @param {(next: Object) => void} props.onFieldsChange
 * @param {() => void} props.onClose
 * @param {() => void} props.onSubmit
 */
export default function ViolationFormModal({
  show,
  fields = { studentId: '', violationType: '擾亂秩序', description: '' },
  loading,
  error,
  onFieldsChange,
  onClose,
  onSubmit
}) {
  const setField = (key, value) => {
    onFieldsChange({ ...fields, [key]: value });
  };

  return (
    <Modal show={show} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>登記違規</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <ErrorAlert error={error} />}
        <Form.Group className="mb-3">
          <Form.Label>學號 *</Form.Label>
          <Form.Control
            type="text"
            value={fields.studentId || ''}
            onChange={(e) => setField('studentId', e.target.value)}
            placeholder="請輸入學號"
          />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>違規類型 *</Form.Label>
          <Form.Select
            value={fields.violationType || '擾亂秩序'}
            onChange={(e) => setField('violationType', e.target.value)}
          >
            {VIOLATION_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Form.Select>
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>違規描述</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={fields.description || ''}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="請描述違規詳情（選填）"
          />
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          取消
        </Button>
        <Button variant="danger" onClick={onSubmit} disabled={loading}>
          {loading ? '提交中...' : '登記違規'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
