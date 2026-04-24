import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { siteAuthor } from '../config/author';
import './Footer.css';

const EMI_CENTER_URL = 'https://emicenter.siwan.nsysu.edu.tw/';

export default function Footer() {
  const { t } = useLanguage();
  const showAuthor = siteAuthor.name && siteAuthor.name.trim() !== '';
  const [views, setViews] = useState({ total: null, today: null });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stats/views')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (!cancelled) setViews({ total: data.total, today: data.today });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-main">
          <div className="footer-brand">
            <h3 className="footer-title">{t('footer.centerNameShort')}</h3>
            <p className="footer-subtitle">{t('footer.reservationSystem')}</p>
          </div>
          <nav className="footer-links" aria-label="Footer navigation">
            <Link to="/" className="footer-link">{t('nav.home')}</Link>
            <span className="footer-divider">|</span>
            <Link to="/activities" className="footer-link">{t('nav.activities')}</Link>
            <span className="footer-divider">|</span>
            <Link to="/announcements" className="footer-link">{t('nav.announcements')}</Link>
            <span className="footer-divider">|</span>
            <Link to="/faq" className="footer-link">{t('nav.faq')}</Link>
            <span className="footer-divider">|</span>
            <Link to="/contact" className="footer-link">{t('nav.contact')}</Link>
            <span className="footer-divider">|</span>
            <a
              href={EMI_CENTER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              <i className="fas fa-external-link-alt me-2" aria-hidden />
              {t('footer.linkToCenter')}
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          {(views.total !== null || views.today !== null) && (
            <p className="footer-views">
              <span className="footer-views-item">
                <i className="fas fa-eye me-1" aria-hidden />
                {t('footer.totalViews')}: <strong>{views.total !== null ? views.total.toLocaleString() : '—'}</strong>
              </span>
              <span className="footer-views-divider">|</span>
              <span className="footer-views-item">
                <i className="fas fa-calendar-day me-1" aria-hidden />
                {t('footer.todayViews')}: <strong>{views.today !== null ? views.today.toLocaleString() : '—'}</strong>
              </span>
            </p>
          )}
          <p className="footer-copyright">{t('footer.copyright')}</p>
          {showAuthor && (
            <p className="footer-author">
              {t('footer.developedBy')}
              {siteAuthor.url ? (
                <a
                  href={siteAuthor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-author-link"
                >
                  {siteAuthor.name.trim()}
                </a>
              ) : (
                <span>{siteAuthor.name.trim()}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
