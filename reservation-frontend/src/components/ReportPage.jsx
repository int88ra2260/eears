import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, Form, Button, Alert } from 'react-bootstrap';
import { SEMESTER_OPTIONS } from '../utils/semesterUtils';
import { handleAPIError } from '../utils/errorHandler';
import { fetchClient } from '../utils/fetchClient';

export default function ReportPage() {
  const outlet = useOutletContext() || {};
  const token = outlet.token || localStorage.getItem('token');

  const [scope, setScope] = useState('overview'); // overview | class | teacher
  const [classId, setClassId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [semester, setSemester] = useState('114-1');
  const [format, setFormat] = useState('pdf');
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const getUrl = () => {
    const qs = `semester=${encodeURIComponent(semester)}&format=${encodeURIComponent(format)}`;
    if (scope === 'class') return `/api/reports/class/${encodeURIComponent(classId)}?${qs}`;
    if (scope === 'teacher') return `/api/reports/teacher/${encodeURIComponent(teacherId)}?${qs}`;
    return `/api/reports/overview?${qs}`;
  };

  const onDownload = async () => {
    setError('');
    if (scope === 'class' && !classId.trim()) return setError('請輸入 classId');
    if (scope === 'teacher' && !teacherId.trim()) return setError('請輸入 teacherId');
    setDownloading(true);
    try {
      const url = getUrl();
      const res = await fetchClient(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const requestId = res.headers.get('x-request-id') || res.headers.get('X-Request-Id') || null;
        const json = await res.json().catch(() => ({}));
        const msg = json?.error || json?.message || '下載失敗';
        const err = new Error(msg);
        err.requestId = requestId;
        err.status = res.status;
        if (requestId) err.message = `${msg}（錯誤識別碼：${requestId}）`;
        throw err;
      }
      const blob = await res.blob();
      const a = document.createElement('a');
      const objectUrl = URL.createObjectURL(blob);
      a.href = objectUrl;
      a.download = `dss-report-${scope}-${semester}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      const errMsg = handleAPIError(e);
      setError(errMsg?.display || errMsg?.zh || '下載失敗');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="container-fluid px-2 px-md-3">
      {error && <Alert variant="danger">{error}</Alert>}
      <Card>
        <Card.Body>
          <div className="d-flex gap-2 flex-wrap align-items-end">
            <Form.Group>
              <Form.Label>Scope</Form.Label>
              <Form.Select value={scope} onChange={(e) => setScope(e.target.value)}>
                <option value="overview">Overview</option>
                <option value="class">Class</option>
                <option value="teacher">Teacher</option>
              </Form.Select>
            </Form.Group>
            {scope === 'class' && (
              <Form.Group>
                <Form.Label>Class ID</Form.Label>
                <Form.Control value={classId} onChange={(e) => setClassId(e.target.value)} />
              </Form.Group>
            )}
            {scope === 'teacher' && (
              <Form.Group>
                <Form.Label>Teacher ID</Form.Label>
                <Form.Control value={teacherId} onChange={(e) => setTeacherId(e.target.value)} />
              </Form.Group>
            )}
            <Form.Group>
              <Form.Label>Semester</Form.Label>
              <Form.Select value={semester} onChange={(e) => setSemester(e.target.value)}>
                {SEMESTER_OPTIONS.filter((o) => o.value).map((o) => (
                  <option key={o.value} value={o.value}>{o.value}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group>
              <Form.Label>Format</Form.Label>
              <Form.Select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="xlsx">Excel</option>
              </Form.Select>
            </Form.Group>
            <Button onClick={onDownload} disabled={downloading}>
              {downloading ? '下載中...' : '下載報表'}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

