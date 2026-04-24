import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function ForbiddenPage() {
  const { t } = useLanguage();

  return (
    <div className="text-center py-5">
      <h1 className="display-4">403</h1>
      <p className="lead">{t('nav.adminEntry')} 或權限不足</p>
      <Link to="/" className="btn btn-primary">返回首頁</Link>
    </div>
  );
}
