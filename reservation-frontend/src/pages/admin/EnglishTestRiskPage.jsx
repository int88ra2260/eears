import React from 'react';
import { Link } from 'react-router-dom';

/** 英檢風險分析頁（預留）：先提供返回連結，避免建置失敗。 */
export default function EnglishTestRiskPage() {
  return (
    <div className="container-fluid py-3">
      <h5 className="mb-3">英檢風險分析</h5>
      <p className="text-muted">此功能尚在規劃中。請先使用英檢長期追蹤 V2 儀表與學生列表。</p>
      <Link className="btn btn-outline-primary btn-sm" to="/admin/english-test-tracking">
        前往英檢長期追蹤
      </Link>
    </div>
  );
}
