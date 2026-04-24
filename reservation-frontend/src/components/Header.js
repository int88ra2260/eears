import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { LANG_ZH, LANG_EN } from '../context/LanguageContext';
import useMediaQuery from '../hooks/useMediaQuery';
import './Header.css';

const EMI_CENTER_URL = 'https://emicenter.siwan.nsysu.edu.tw/';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [menuOpen, setMenuOpen] = useState(false);

  const showEnglishTest = location.pathname !== '/login' && !location.pathname.startsWith('/admin');

  const handleNavClick = (action) => {
    setMenuOpen(false);
    if (action === 'home') {
      navigate('/');
      return;
    }
    if (action === 'activities') {
      navigate('/activities');
      return;
    }
    if (action === 'announcements') {
      navigate('/announcements');
      return;
    }
    if (action === 'faq') {
      navigate('/faq');
      return;
    }
    if (action === 'about') {
      navigate('/about');
      return;
    }
    if (action === 'contact') {
      navigate('/contact');
      return;
    }
    if (action === 'book') {
      navigate('/activities');
      return;
    }
    if (action === 'english-test') {
      navigate('/register/english-test');
      return;
    }
  };

  const toggleLang = () => {
    setLang(lang === LANG_ZH ? LANG_EN : LANG_ZH);
  };

  useEffect(() => {
    if (!menuOpen || !isMobile) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen, isMobile]);

  return (
    <header className="site-header">
      <div className="header-container">
        <a
          href={EMI_CENTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="header-logo"
          aria-label={t('footer.linkToCenter')}
        >
          <img
            src="/EMILEGO.png"
            alt="EMI Center Logo"
            className="header-logo-img"
          />
        </a>

        {isMobile ? (
          <>
            <div className="header-actions-mobile">
              {showEnglishTest && (
                <button
                  type="button"
                  className="btn-english-test-mobile"
                  onClick={() => handleNavClick('english-test')}
                >
                  🎓 {t('nav.englishTest')}
                </button>
              )}
              <button
                type="button"
                className="lang-toggle"
                onClick={toggleLang}
                title={lang === LANG_ZH ? 'Switch to English' : '切換至中文'}
                aria-label={lang === LANG_ZH ? 'English' : '中文'}
              >
                {lang === LANG_ZH ? 'EN' : '中文'}
              </button>
              <button
                type="button"
                className="hamburger"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-expanded={menuOpen}
                aria-label="Menu"
              >
                <span />
                <span />
                <span />
              </button>
            </div>
            {menuOpen && (
              <>
                <button
                  type="button"
                  className="header-drawer-backdrop"
                  aria-label="關閉選單"
                  onClick={() => setMenuOpen(false)}
                />
                <nav className="header-nav-mobile" aria-label="Main navigation">
                <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('home')}>
                  {t('nav.home')}
                </button>
                <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('activities')}>
                  {t('nav.activities')}
                </button>
                <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('announcements')}>
                  {t('nav.announcements')}
                </button>
                <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('faq')}>
                  {t('nav.faq')}
                </button>
                <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('about')}>
                  {t('nav.about')}
                </button>
                <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('contact')}>
                  {t('nav.contact')}
                </button>
                <button type="button" className="nav-link-mobile nav-link-cta" onClick={() => handleNavClick('book')}>
                  {t('homePage.heroCtaBook')}
                </button>
                {showEnglishTest && (
                  <button type="button" className="nav-link-mobile" onClick={() => handleNavClick('english-test')}>
                    🎓 {t('nav.englishTest')}
                  </button>
                )}
              </nav>
              </>
            )}
          </>
        ) : (
          <nav className="header-nav" aria-label="Main navigation">
            <button type="button" className="nav-link" onClick={() => handleNavClick('home')}>
              {t('nav.home')}
            </button>
            <button type="button" className="nav-link" onClick={() => handleNavClick('activities')}>
              {t('nav.activities')}
            </button>
            <button type="button" className="nav-link" onClick={() => handleNavClick('announcements')}>
              {t('nav.announcements')}
            </button>
            <button type="button" className="nav-link" onClick={() => handleNavClick('faq')}>
              {t('nav.faq')}
            </button>
            <button type="button" className="nav-link" onClick={() => handleNavClick('about')}>
              {t('nav.about')}
            </button>
            <button type="button" className="nav-link" onClick={() => handleNavClick('contact')}>
              {t('nav.contact')}
            </button>
            <button
              type="button"
              className="btn-english-test"
              onClick={() => handleNavClick('book')}
            >
              {t('homePage.heroCtaBook')}
            </button>
            {showEnglishTest && (
              <button
                type="button"
                className="nav-link"
                onClick={() => handleNavClick('english-test')}
              >
                🎓 {t('nav.englishTest')}
              </button>
            )}
            <button
              type="button"
              className="lang-toggle"
              onClick={toggleLang}
              title={lang === LANG_ZH ? 'Switch to English' : '切換至中文'}
              aria-label={lang === LANG_ZH ? 'English' : '中文'}
            >
              {lang === LANG_ZH ? 'EN' : '中文'}
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
