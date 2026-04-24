import React, { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';

function ForceResetPassword() {
  const { token, mustResetPassword, setMustResetPassword } = useOutletContext();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const requireCurrent = !mustResetPassword;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('新密碼至少需 8 碼。');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不一致。');
      return;
    }

    if (requireCurrent && !currentPassword) {
      setError('請輸入目前密碼。');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/teachers/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || '更新密碼失敗');
      }
      setSuccess('密碼已更新，請使用新密碼重新登入。');
      localStorage.setItem('mustResetPassword', 'false');
      setMustResetPassword(false);
      setTimeout(() => {
        navigate('/admin');
      }, 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
      <Card style={{ maxWidth: '420px', width: '100%' }}>
        <Card.Body>
          <Card.Title className="mb-3">{mustResetPassword ? '首次登入，請變更密碼' : '變更密碼'}</Card.Title>
          <Card.Text className="text-muted">
            為保障帳號安全，請設定一組全新的密碼。密碼至少需 8 碼，建議混合大小寫與數字特殊符號。
          </Card.Text>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Form onSubmit={handleSubmit}>
            {requireCurrent && (
              <Form.Group className="mb-3">
                <Form.Label>目前密碼</Form.Label>
                <Form.Control
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </Form.Group>
            )}
            <Form.Group className="mb-3">
              <Form.Label>新密碼 *</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>確認新密碼 *</Form.Label>
              <Form.Control
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={loading}>
              {loading ? '送出中...' : '更新密碼'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
}

export default ForceResetPassword;


