import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="text-center py-5">
      <h1 className="display-4">404</h1>
      <p className="lead">找不到頁面</p>
      <Link to="/" className="btn btn-primary">{t('nav.home')}</Link>
    </div>
  );
}
