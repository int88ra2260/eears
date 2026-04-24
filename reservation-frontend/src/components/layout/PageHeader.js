import React from 'react';
import Breadcrumbs from './Breadcrumbs';
import './PageHeader.css';

/**
 * 統一頁面標題區：麵包屑 + 標題 + 選填說明
 * @param {Array<{ label: string, path?: string }>} breadcrumbs
 * @param {string} title
 * @param {string} [lead] - 副標／說明
 */
export default function PageHeader({ breadcrumbs, title, lead }) {
  return (
    <header className="page-header">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} />
      )}
      <h1 className="page-header-title">{title}</h1>
      {lead && <p className="page-header-lead">{lead}</p>}
    </header>
  );
}
