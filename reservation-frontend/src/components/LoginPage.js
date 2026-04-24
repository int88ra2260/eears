// ===== LoginPage.js（後台登入） =====
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      console.log('Login response:', data); // 調試信息
      if (res.ok) {
        console.log('Login successful, role:', data.role); // 調試信息
        localStorage.setItem('token', data.token);
        localStorage.setItem('userRole', data.role);
        localStorage.setItem('username', username);
        localStorage.setItem('mustResetPassword', data.mustResetPassword ? 'true' : 'false');
        let teacherName = null;
        if (data.teacher && data.teacher.name) {
          teacherName = data.teacher.name;
          localStorage.setItem('teacherName', teacherName);
        }
        onLoginSuccess(data.token, data.role, username, teacherName, data.mustResetPassword);
        navigate('/admin');
      } else {
        setError(data.error || '登入失敗');
      }
    } catch (err) {
      setError('與伺服器連線發生錯誤');
    }
  };

  return (
    <div className="container d-flex justify-content-center mt-5">
      <div className="card p-4" style={{ width: '400px' }}>
        <h2 className="card-title mb-4">後台登入</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">帳號：</label>
            <input className="form-control" value={username} onChange={(e) => setUsername(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">密碼：</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary w-100" type="submit">登入</button>
        </form>
        {error && <p className="text-danger mt-3">{error}</p>}
      </div>
    </div>
  );
}

export default LoginPage;
