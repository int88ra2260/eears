import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const EMPTY = '—';

function renderSkill(bestSkills, key) {
  return bestSkills?.[key]?.cefr || EMPTY;
}

export default function StudentTable({ loading, error, students, semesterId }) {
  const navigate = useNavigate();
  if (loading) {
    return (
      <div className="alert alert-light d-flex align-items-center gap-2 mb-0">
        <span className="spinner-border spinner-border-sm" aria-hidden="true" />
        <span>正在載入學生清單...</span>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger mb-0">學生清單載入失敗：{error}</div>;
  }

  if (!Array.isArray(students) || students.length === 0) {
    return <div className="alert alert-secondary mb-0">此學期尚無學生資料。</div>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-hover align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>學號</th>
            <th>姓名</th>
            <th>年級</th>
            <th>系所</th>
            <th>聽力</th>
            <th>閱讀</th>
            <th>口說</th>
            <th>寫作</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {students.map((row) => (
            <tr
              key={row.studentId}
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/admin/learning-journey/students/${encodeURIComponent(row.studentId)}${semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ''}`)}
            >
              <td className="font-monospace">{row.studentId}</td>
              <td>{row.studentName || EMPTY}</td>
              <td>{row.grade || EMPTY}</td>
              <td>{row.department || EMPTY}</td>
              <td>{renderSkill(row.bestSkills, 'listening')}</td>
              <td>{renderSkill(row.bestSkills, 'reading')}</td>
              <td>{renderSkill(row.bestSkills, 'speaking')}</td>
              <td>{renderSkill(row.bestSkills, 'writing')}</td>
              <td>
                <Link
                  className="btn btn-outline-primary btn-sm"
                  to={`/admin/learning-journey/students/${encodeURIComponent(row.studentId)}${semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : ''}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  查看
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
