import React from 'react';
import { Link } from 'react-router-dom';
import BestepImportPageComponent from '../../components/BestepImportPage';

/**
 * BESTEP 與相關匯入入口（/admin/english-test/import）。
 * 不重複實作匯入 UI，沿用既有 BestepImportPage。
 */
export default function EnglishTestImportHubPage() {
  return (
    <div className="container-fluid py-2">
      <p className="small text-muted mb-2">
        全校英檢長期追蹤名冊／成績 Excel 匯入請至{' '}
        <Link to="/admin/english-test-tracking/legacy">英檢長期追蹤（匯入）</Link>
        。
      </p>
      <BestepImportPageComponent />
    </div>
  );
}
