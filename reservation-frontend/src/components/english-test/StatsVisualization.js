// components/english-test/StatsVisualization.js
import React from 'react';

export default function StatsVisualization({ 
  stats, 
  onFilterClick,
  todayNewCount = 0,
  currentStatusFilter = 'all' // 當前狀態篩選，用於特殊情況處理
}) {
  const handleCardClick = (filterType, filterValue) => {
    onFilterClick && onFilterClick(filterType, filterValue);
  };

  // 審核進度：僅在「總報名人數」（無篩選）時顯示
  // 分子：已通過 + 請修正 + 報名成功 + 報名失敗（已處理筆數）
  // 分母：總報名人數「排除不報考」
  const processedCount = (stats.approved ?? 0) + (stats.revision ?? 0) + (stats.success ?? 0) + (stats.failed ?? 0);
  const totalEligible = Math.max(0, (stats.total ?? 0) - (stats.nonExam ?? 0)); // 分母：排除不報考

  const calculateReviewProgress = () => {
    if (currentStatusFilter !== 'all') return null; // 僅在查詢總報名人數時顯示
    if (totalEligible === 0) return null;
    return Math.round((processedCount / totalEligible) * 100);
  };

  const reviewProgress = calculateReviewProgress();
  const shouldShowProgress = currentStatusFilter === 'all' && reviewProgress !== null;

  // 卡片主題色（個人報名頁統計卡片）
  const CARD_COLORS = {
    total: { border: '#0d6efd', text: '#0d6efd', bar: '#0d6efd' },           // 總報名人數：藍色
    pending: { border: '#ffc107', text: '#856404', bar: '#ffc107', bg: '#fff9e6' }, // 審核中：黃色
    approved: { border: '#0dcaf0', text: '#087990', bar: '#0dcaf0' },       // 已通過：水藍色
    revision: { border: '#6f42c1', text: '#6f42c1', bar: '#6f42c1' },       // 請修正：紫色
    success: { border: '#198754', text: '#198754', bar: '#198754' },        // 報名成功：綠色
    failed: { border: '#dc3545', text: '#dc3545', bar: '#dc3545' },        // 報名失敗：紅色
    nonExam: { border: '#212529', text: '#212529' },                        // 不報考：黑色
    examLR: { border: '#dee2e6', text: '#212529', bg: '#fff' },            // 報名聽讀：白色
    examSW: { border: '#dee2e6', text: '#212529', bg: '#fff' }             // 報名說寫：白色
  };

  return (
    <div className="row mb-4">
      {/* 總報名人數：藍色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className={`card text-center h-100 ${currentStatusFilter === 'all' ? 'shadow-sm' : ''}`}
          style={{ 
            cursor: 'pointer',
            borderWidth: currentStatusFilter === 'all' ? 2 : 1,
            borderColor: CARD_COLORS.total.border,
            borderStyle: 'solid'
          }}
          onClick={() => handleCardClick('status', 'all')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">總報名人數</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.total.text }}>{stats.total}</h3>
            {todayNewCount > 0 && (
              <small className="text-success">
                <i className="fas fa-arrow-up me-1" aria-hidden /> 今日新增 {todayNewCount}
              </small>
            )}
          </div>
        </div>
      </div>

      {/* 審核中：黃色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className={`card text-center h-100 ${currentStatusFilter === 'pending' ? 'shadow-sm' : ''}`}
          style={{ 
            cursor: 'pointer',
            borderWidth: currentStatusFilter === 'pending' ? 2 : 1,
            borderColor: CARD_COLORS.pending.border,
            borderStyle: 'solid',
            backgroundColor: currentStatusFilter === 'pending' ? CARD_COLORS.pending.bg : (stats.pending > 0 ? '#fffbf0' : 'white')
          }}
          onClick={() => handleCardClick('status', 'pending')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">審核中</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.pending.text }}>{stats.pending}</h3>
            {stats.total > 0 && (
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar"
                  style={{ width: `${(stats.pending / stats.total) * 100}%`, backgroundColor: CARD_COLORS.pending.bar }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 已通過：水藍色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className={`card text-center h-100 ${currentStatusFilter === 'approved' ? 'shadow-sm' : ''}`}
          style={{ 
            cursor: 'pointer',
            borderWidth: currentStatusFilter === 'approved' ? 2 : 1,
            borderColor: CARD_COLORS.approved.border,
            borderStyle: 'solid'
          }}
          onClick={() => handleCardClick('status', 'approved')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">已通過</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.approved.text }}>{stats.approved}</h3>
            {stats.total > 0 && (
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar"
                  style={{ width: `${(stats.approved / stats.total) * 100}%`, backgroundColor: CARD_COLORS.approved.bar }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 請修正：紫色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className={`card text-center h-100 ${currentStatusFilter === 'revision' ? 'shadow-sm' : ''}`}
          style={{ 
            cursor: 'pointer',
            borderWidth: currentStatusFilter === 'revision' ? 2 : 1,
            borderColor: CARD_COLORS.revision.border,
            borderStyle: 'solid'
          }}
          onClick={() => handleCardClick('status', 'revision')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">請修正</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.revision.text }}>{stats.revision ?? 0}</h3>
            {stats.total > 0 && (
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar"
                  style={{ width: `${((stats.revision ?? 0) / stats.total) * 100}%`, backgroundColor: CARD_COLORS.revision.bar }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 報名成功：綠色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className={`card text-center h-100 ${currentStatusFilter === 'success' ? 'shadow-sm' : ''}`}
          style={{ 
            cursor: 'pointer',
            borderWidth: currentStatusFilter === 'success' ? 2 : 1,
            borderColor: CARD_COLORS.success.border,
            borderStyle: 'solid'
          }}
          onClick={() => handleCardClick('status', 'success')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">報名成功</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.success.text }}>{stats.success ?? 0}</h3>
            {stats.total > 0 && (
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar"
                  style={{ width: `${((stats.success ?? 0) / stats.total) * 100}%`, backgroundColor: CARD_COLORS.success.bar }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 報名失敗：紅色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className={`card text-center h-100 ${currentStatusFilter === 'failed' ? 'shadow-sm' : ''}`}
          style={{ 
            cursor: 'pointer',
            borderWidth: currentStatusFilter === 'failed' ? 2 : 1,
            borderColor: CARD_COLORS.failed.border,
            borderStyle: 'solid'
          }}
          onClick={() => handleCardClick('status', 'failed')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">報名失敗</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.failed.text }}>{stats.failed ?? 0}</h3>
            {stats.total > 0 && (
              <div className="progress" style={{ height: '6px' }}>
                <div 
                  className="progress-bar"
                  style={{ width: `${((stats.failed ?? 0) / stats.total) * 100}%`, backgroundColor: CARD_COLORS.failed.bar }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 不報考：黑色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className="card text-center h-100"
          style={{ 
            cursor: 'pointer',
            borderWidth: 1,
            borderColor: CARD_COLORS.nonExam.border,
            borderStyle: 'solid'
          }}
          onClick={() => handleCardClick('examType', 'NON')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2">不報考</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.nonExam.text }}>{stats.nonExam}</h3>
          </div>
        </div>
      </div>

      {/* 報名聽讀：白色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className="card text-center h-100"
          style={{ 
            cursor: 'pointer',
            borderWidth: 1,
            borderColor: CARD_COLORS.examLR.border,
            borderStyle: 'solid',
            backgroundColor: CARD_COLORS.examLR.bg
          }}
          onClick={() => handleCardClick('examType', 'LR')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2" style={{ color: CARD_COLORS.examLR.text }}>報名聽讀</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.examLR.text }}>{stats.listeningReading}</h3>
          </div>
        </div>
      </div>

      {/* 報名說寫：白色 */}
      <div className="col-md-2 col-6 mb-3">
        <div 
          className="card text-center h-100"
          style={{ 
            cursor: 'pointer',
            borderWidth: 1,
            borderColor: CARD_COLORS.examSW.border,
            borderStyle: 'solid',
            backgroundColor: CARD_COLORS.examSW.bg
          }}
          onClick={() => handleCardClick('examType', 'SW')}
        >
          <div className="card-body">
            <h5 className="card-title mb-2" style={{ color: CARD_COLORS.examSW.text }}>報名說寫</h5>
            <h3 className="mb-1" style={{ color: CARD_COLORS.examSW.text }}>{stats.speakingWriting}</h3>
          </div>
        </div>
      </div>

      {/* 審核進度條：僅在「總報名人數」時顯示，分子 = 已通過+請修正+報名成功+報名失敗 */}
      {shouldShowProgress && (
        <div className="col-12 mt-3">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <strong>審核進度</strong>
                <span className={`badge bg-${reviewProgress === 100 ? 'success' : reviewProgress === 0 ? 'warning' : 'primary'}`}>
                  {reviewProgress}%
                </span>
              </div>
              <div className="progress" style={{ height: '20px' }}>
                <div 
                  className={`progress-bar ${reviewProgress === 100 ? 'bg-success' : reviewProgress === 0 ? 'bg-warning' : 'bg-success'}`}
                  role="progressbar"
                  style={{ width: `${reviewProgress}%` }}
                  aria-valuenow={reviewProgress}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  {reviewProgress}%
                </div>
              </div>
              <small className="text-muted">
                已處理 {processedCount} / {totalEligible} 筆（分母已排除不報考；已通過 + 請修正 + 報名成功 + 報名失敗）
              </small>
            </div>
          </div>
        </div>
      )}
      
      {/* 無資料提示 */}
      {!shouldShowProgress && stats.total === 0 && (
        <div className="col-12 mt-3">
          <div className="alert alert-info mb-0">
            <i className="fas fa-info-circle me-2"></i>
            目前沒有符合篩選條件的資料
          </div>
        </div>
      )}
    </div>
  );
}
