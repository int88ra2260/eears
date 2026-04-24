/**
 * 活動預約表單區塊：學號／姓名／Email + 違規提醒 + 訊息 Alert
 */
import React from 'react';
import { Form, Alert } from 'react-bootstrap';

export default function EventBookingFormSection({
  studentId,
  studentName,
  studentEmail,
  onStudentIdChange,
  onStudentNameChange,
  onStudentEmailChange,
  violationWarning,
  msg,
  variant,
  isMobile,
  disabled = false,
}) {
  const inputStyle = isMobile ? { fontSize: '16px' } : {};
  const groupClass = isMobile ? 'mb-3' : 'mb-2';

  return (
    <>
      <Form.Group className={groupClass}>
        <Form.Label>學號 Student ID *</Form.Label>
        <Form.Control
          type="text"
          value={studentId}
          disabled={disabled}
          onChange={(e) => onStudentIdChange(e.target.value)}
          required={!disabled}
          style={inputStyle}
        />
      </Form.Group>

      <Form.Group className={groupClass}>
        <Form.Label>姓名 Name *</Form.Label>
        <Form.Control
          type="text"
          value={studentName}
          disabled={disabled}
          onChange={(e) => onStudentNameChange(e.target.value)}
          required={!disabled}
          style={inputStyle}
        />
      </Form.Group>

      <Form.Group className={groupClass}>
        <Form.Label>Email *</Form.Label>
        <Form.Control
          type="email"
          value={studentEmail}
          disabled={disabled}
          onChange={(e) => onStudentEmailChange(e.target.value)}
          required={!disabled}
          style={inputStyle}
        />
      </Form.Group>

      {violationWarning && (
        <Alert variant="warning" className="mt-3">
          <i className="fas fa-exclamation-triangle me-2" />
          <strong>提醒：</strong>
          {violationWarning.message}
          <br />
          <small className="text-muted">您仍可繼續預約，但請注意遵守活動規範。</small>
        </Alert>
      )}

      {msg && (
        <Alert variant={variant} className="mt-3">
          {msg}
        </Alert>
      )}
    </>
  );
}
