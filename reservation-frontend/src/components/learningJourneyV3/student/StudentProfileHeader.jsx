import React from 'react';

const EMPTY = '—';

export default function StudentProfileHeader({ student }) {
  if (!student) return null;
  return (
    <div className="card mb-3">
      <div className="card-body">
        <div className="row g-3">
          <div className="col-md-4"><div className="text-muted small">學號</div><div className="fw-semibold">{student.studentId || EMPTY}</div></div>
          <div className="col-md-4"><div className="text-muted small">姓名</div><div className="fw-semibold">{student.studentName || EMPTY}</div></div>
          <div className="col-md-4"><div className="text-muted small">學期</div><div className="fw-semibold">{student.currentSemester || EMPTY}</div></div>
          <div className="col-md-3"><div className="text-muted small">學院</div><div>{student.college || EMPTY}</div></div>
          <div className="col-md-3"><div className="text-muted small">系所</div><div>{student.department || EMPTY}</div></div>
          <div className="col-md-3"><div className="text-muted small">班級</div><div>{student.className || EMPTY}</div></div>
          <div className="col-md-3"><div className="text-muted small">年級</div><div>{student.grade || EMPTY}</div></div>
        </div>
      </div>
    </div>
  );
}
