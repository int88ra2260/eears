// src/components/StudentLearningProfileSearchPage.js
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form } from 'react-bootstrap';

export default function StudentLearningProfileSearchPage() {
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [fromSemester, setFromSemester] = useState('');
  const [toSemester, setToSemester] = useState('');
  const [error, setError] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (fromSemester.trim()) params.set('fromSemester', fromSemester.trim());
    if (toSemester.trim()) params.set('toSemester', toSemester.trim());
    const s = params.toString();
    return s ? `?${s}` : '';
  }, [fromSemester, toSemester]);

  const onSubmit = () => {
    setError('');
    const sid = studentId.trim();
    if (!sid) {
      setError('請輸入學號才能查詢學生學習歷程。');
      return;
    }

    // Phase 1：目前核心 API 以 studentId 為查詢 key
    // 若未來支援姓名搜尋，可在此擴充（不在本次 Phase 1 範圍內）
    navigate(`/admin/analytics/student/${encodeURIComponent(sid)}${queryString}`);
  };

  return (
    <div className="container-fluid px-2 px-md-3">
      <p className="text-muted small mb-3">以學號查詢學生學習歷程。</p>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4">
        <Card.Header>查詢條件</Card.Header>
        <Card.Body>
          <Form onSubmit={(e) => (e.preventDefault(), onSubmit())}>
            <Form.Group className="mb-3" controlId="studentId">
              <Form.Label>學號</Form.Label>
              <Form.Control
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="例如：114xxxx"
                autoComplete="off"
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="name">
              <Form.Label>姓名（目前未啟用姓名搜尋）</Form.Label>
              <Form.Control
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="可留空"
                autoComplete="off"
              />
            </Form.Group>

            <div className="d-flex gap-3 flex-wrap">
              <Form.Group className="mb-3" controlId="fromSemester" style={{ minWidth: 220 }}>
                <Form.Label>fromSemester（可選）</Form.Label>
                <Form.Control
                  value={fromSemester}
                  onChange={(e) => setFromSemester(e.target.value)}
                  placeholder="例如：114-1"
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="toSemester" style={{ minWidth: 220 }}>
                <Form.Label>toSemester（可選）</Form.Label>
                <Form.Control
                  value={toSemester}
                  onChange={(e) => setToSemester(e.target.value)}
                  placeholder="例如：114-2"
                />
              </Form.Group>
            </div>

            <Button type="submit" variant="primary">
              搜尋並查看學習歷程
            </Button>
          </Form>
        </Card.Body>
      </Card>

      <Alert variant="info" className="mb-0">
        本 Phase 1 的查詢入口以 `studentId` 為主。
      </Alert>
    </div>
  );
}

