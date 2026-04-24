// components/LearningPartnerManagement.js
// 學習有伴團體報名管理頁面（管理端）
import React, { useState, useEffect, useCallback } from 'react';
import { Form } from 'react-bootstrap';
import { getCurrentSemester, SEMESTER_OPTIONS } from '../utils/semesterUtils';

export default function LearningPartnerManagement({ token }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [semesterFilter, setSemesterFilter] = useState(getCurrentSemester() || '');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // 載入團體列表
  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { q: searchTerm }),
        ...(semesterFilter && { semester: semesterFilter })
      });

      const response = await fetch(`/api/admin/learning-partner/teams?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      } else {
        alert('載入團體列表失敗');
      }
    } catch (error) {
      console.error('載入團體列表錯誤:', error);
      alert('載入團體列表時發生錯誤');
    } finally {
      setLoading(false);
    }
  }, [currentPage, statusFilter, searchTerm, semesterFilter, token]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  // 查看團體詳情
  const handleViewDetail = async (teamId) => {
    try {
      const response = await fetch(`/api/admin/learning-partner/teams/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTeam(data.team);
        setShowDetailModal(true);
      } else {
        alert('載入團體詳情失敗');
      }
    } catch (error) {
      console.error('載入團體詳情錯誤:', error);
      alert('載入團體詳情時發生錯誤');
    }
  };

  // 匯出資料
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch('/api/admin/learning-partner/export?format=csv', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `learning-partner-teams-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('匯出失敗');
      }
    } catch (error) {
      console.error('匯出錯誤:', error);
      alert('匯出時發生錯誤');
    } finally {
      setExporting(false);
    }
  };

  // 狀態對應
  const statusMap = {
    'pending_approval': { text: '待同意', color: 'warning', bgColor: '#fff3cd' },
    'approved': { text: '已完成', color: 'success', bgColor: '#d1e7dd' },
    'expired': { text: '已失效', color: 'danger', bgColor: '#f8d7da' },
    'cancelled': { text: '已取消', color: 'secondary', bgColor: '#e2e3e5' }
  };

  // 取得狀態統計
  const getStatusCounts = () => {
    const counts = { all: total };
    teams.forEach(team => {
      counts[team.status] = (counts[team.status] || 0) + 1;
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  // 卡片顏色（循環使用，符合附圖的顏色）
  const cardColors = [
    { header: '#17a2b8', bg: '#e7f3f5' }, // teal (隊伍1, 5, 9, 13, 17)
    { header: '#007bff', bg: '#e7f0ff' }, // blue (隊伍2, 6, 10, 14, 18)
    { header: '#6f42c1', bg: '#f0e7ff' }, // purple (隊伍3, 7, 11, 15, 19)
    { header: '#dc3545', bg: '#ffe7e7' }, // red (隊伍4, 8, 12, 16, 20)
    { header: '#fd7e14', bg: '#fff4e7' }, // orange
    { header: '#28a745', bg: '#e7f5e7' }, // green
    { header: '#ffc107', bg: '#fffbe7' }  // yellow
  ];

  if (loading && teams.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
        <p className="mt-3 text-muted">載入團體列表中...</p>
      </div>
    );
  }

  return (
    <div>
      {/* 篩選與搜尋區 */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <div className="d-flex gap-2 flex-wrap align-items-center">
          {/* 學期篩選 */}
          <Form.Select
            value={semesterFilter}
            onChange={(e) => {
              setSemesterFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ minWidth: '150px' }}
          >
            <option value="">全部學期</option>
            {SEMESTER_OPTIONS.filter(opt => opt.value !== '').map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>

          {/* 狀態篩選 */}
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => { setStatusFilter('all'); setCurrentPage(1); }}
            >
              全部 <span className="badge bg-secondary">{statusCounts.all || 0}</span>
            </button>
            {Object.keys(statusMap).map(status => (
              <button
                key={status}
                type="button"
                className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              >
                {statusMap[status].text} <span className="badge bg-secondary">{statusCounts[status] || 0}</span>
              </button>
            ))}
          </div>

          {/* 搜尋框 */}
          <div className="input-group" style={{ minWidth: '250px' }}>
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="搜尋團體編號、學號、姓名..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
        </div>

        {/* 匯出按鈕 */}
        <button
          className="btn btn-success"
          onClick={handleExport}
          disabled={exporting || teams.length === 0}
        >
          {exporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status"></span>
              匯出中...
            </>
          ) : (
            <>
              <i className="fas fa-download me-2"></i>
              匯出 CSV
            </>
          )}
        </button>
      </div>

      {/* 團體卡片網格 */}
      {teams.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-5 text-muted">
            <p className="mb-0">目前沒有團體報名記錄</p>
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {teams.map((team, index) => {
            const statusInfo = statusMap[team.status] || statusMap['pending_approval'];
            const cardColor = cardColors[index % cardColors.length];
            const members = team.members || [];

            return (
              <div key={team.id} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                <div
                  className="card h-100 shadow-sm"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    border: 'none',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                  onClick={() => handleViewDetail(team.id)}
                >
                  {/* 卡片標題 */}
                  <div
                    className="card-header text-white fw-bold text-center py-2"
                    style={{
                      backgroundColor: cardColor.header,
                      border: 'none',
                      fontSize: '1rem'
                    }}
                  >
                    隊伍{team.semesterSequence !== null && team.semesterSequence !== undefined ? team.semesterSequence : team.id}
                  </div>

                  {/* 卡片內容 */}
                  <div className="card-body p-3" style={{ backgroundColor: cardColor.bg, minHeight: '180px' }}>
                    {/* 成員列表 */}
                    <div className="member-list">
                      {members.map((member, memberIndex) => (
                        <div
                          key={memberIndex}
                          className="d-flex align-items-center mb-2"
                          style={{ padding: '4px 0' }}
                        >
                          {/* 成員圖標 */}
                          <div className="me-2" style={{ fontSize: '1.1rem', flexShrink: 0, width: '24px', textAlign: 'center' }}>
                            {member.isRepresentative ? (
                              <span title="代表者" style={{ fontSize: '1.15rem' }}>👑</span>
                            ) : (
                              <span title="成員" style={{ fontSize: '1rem' }}>🖥️</span>
                            )}
                          </div>

                          {/* 成員資訊 */}
                          <div className="flex-grow-1" style={{ minWidth: 0, flex: 1 }}>
                            <div className="text-truncate fw-semibold" style={{ fontSize: '0.85rem', lineHeight: '1.4', marginBottom: '2px' }}>
                              {member.name}
                            </div>
                            <div className="text-truncate text-muted" style={{ fontSize: '0.75rem', lineHeight: '1.2' }}>
                              {member.studentId}
                            </div>
                          </div>

                          {/* 同意狀態圖標 */}
                          <div className="ms-2" style={{ flexShrink: 0, width: '16px', textAlign: 'center' }}>
                            {member.approvalStatus === 'approved' ? (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: '#4caf50',
                                  cursor: 'help',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }}
                                title="已同意"
                              ></span>
                            ) : member.approvalStatus === 'pending' ? (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ff9800',
                                  color: 'white',
                                  fontSize: '9px',
                                  fontWeight: 'bold',
                                  cursor: 'help',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }}
                                title="待同意"
                              >C</span>
                            ) : (
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f44336',
                                  cursor: 'help',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                }}
                                title="已過期"
                              ></span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分頁 */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav>
            <ul className="pagination">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  上一頁
                </button>
              </li>
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 2 && page <= currentPage + 2)
                ) {
                  return (
                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setCurrentPage(page)}>
                        {page}
                      </button>
                    </li>
                  );
                } else if (
                  page === currentPage - 3 ||
                  page === currentPage + 3
                ) {
                  return (
                    <li key={page} className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  );
                }
                return null;
              })}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  下一頁
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* 詳情 Modal */}
      {showDetailModal && selectedTeam && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="modal-dialog modal-lg modal-dialog-centered"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  團體詳情 - 隊伍{selectedTeam.semesterSequence !== null && selectedTeam.semesterSequence !== undefined ? selectedTeam.semesterSequence : selectedTeam.id}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDetailModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>隊伍編號：</strong>
                    {selectedTeam.semesterSequence !== null && selectedTeam.semesterSequence !== undefined 
                      ? `${selectedTeam.semesterSequence}（${semesterFilter || '全部學期'}）`
                      : selectedTeam.id}
                  </div>
                  <div className="col-md-6">
                    <strong>狀態：</strong>
                    <span className={`badge bg-${statusMap[selectedTeam.status]?.color || 'secondary'} ms-2`}>
                      {statusMap[selectedTeam.status]?.text || selectedTeam.status}
                    </span>
                  </div>
                </div>
                {selectedTeam.teamName && (
                  <div className="row mb-3">
                    <div className="col-12">
                      <strong>團體名稱：</strong>{selectedTeam.teamName}
                    </div>
                  </div>
                )}
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>代表者學號：</strong>{selectedTeam.representativeStudentId}
                  </div>
                  <div className="col-md-6">
                    <strong>團體人數：</strong>{selectedTeam.teamSize} 人
                  </div>
                </div>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <strong>建立時間：</strong>
                    {new Date(selectedTeam.createdAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                  </div>
                  {selectedTeam.approvedAt && (
                    <div className="col-md-6">
                      <strong>完成時間：</strong>
                      {new Date(selectedTeam.approvedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                    </div>
                  )}
                </div>
                {selectedTeam.expiresAt && (
                  <div className="row mb-3">
                    <div className="col-12">
                      <strong>過期時間：</strong>
                      {new Date(selectedTeam.expiresAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })}
                    </div>
                  </div>
                )}

                <hr />

                <h6 className="mb-3">成員列表</h6>
                <div className="table-responsive">
                  <table className="table table-bordered">
                    <thead>
                      <tr>
                        <th>身份</th>
                        <th>姓名</th>
                        <th>學號</th>
                        <th>Email</th>
                        <th>同意狀態</th>
                        <th>同意時間</th>
                        <th>IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTeam.members?.map((member, index) => (
                        <tr key={index}>
                          <td>
                            {member.isRepresentative ? (
                              <span className="badge bg-warning">👑 代表者</span>
                            ) : (
                              <span className="text-muted">成員</span>
                            )}
                          </td>
                          <td>{member.name}</td>
                          <td>{member.studentId}</td>
                          <td>{member.email}</td>
                          <td>
                            <span className={`badge bg-${
                              member.approvalStatus === 'approved' ? 'success' :
                              member.approvalStatus === 'pending' ? 'warning' :
                              'danger'
                            }`}>
                              {member.approvalStatus === 'approved' ? '已同意' :
                               member.approvalStatus === 'pending' ? '待同意' :
                               '已過期'}
                            </span>
                          </td>
                          <td>
                            {member.approvedAt
                              ? new Date(member.approvedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
                              : '-'}
                          </td>
                          <td>
                            <small className="text-muted">{member.approvalIp || '-'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDetailModal(false)}
                >
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
