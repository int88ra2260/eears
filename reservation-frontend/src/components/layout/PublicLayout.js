import React from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../Header';
import HomeFooter from '../home/HomeFooter';

/**
 * 公開前台共用版面：Header + Main container + HomeFooter（全站統一頁尾）
 * 非公開路徑（/login、/admin）僅渲染 main 容器，不顯示 Header/Footer。
 */
export default function PublicLayout({ children }) {
  const location = useLocation();
  const isPublic = location.pathname !== '/login' && !location.pathname.startsWith('/admin');

  if (!isPublic) {
    return (
      <main id="main-content" className="app-main container mt-3 mb-4" style={{ flex: '1 1 auto' }} tabIndex={-1}>
        {children}
      </main>
    );
  }

  return (
    <>
      <Header />
      <main id="main-content" className="app-main container mt-3 mb-4" style={{ flex: '1 1 auto' }} tabIndex={-1}>
        {children}
      </main>
      <HomeFooter />
    </>
  );
}
