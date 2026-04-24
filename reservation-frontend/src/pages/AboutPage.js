import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/layout/PageHeader';
import './AboutPage.css';

export default function AboutPage() {
  const { t } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.about') },
  ];

  return (
    <div className="about-page">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={`EEARS ${t('footer.reservationSystem')}`}
        lead={t('homePage.heroDesc')}
      />
      <section className="about-page-section">
        <h2>{t('footer.centerNameShort')}</h2>
        <p>
          {t('footer.centerName')}，整合英語桌、英語社群、講座與學習資源，提供學生快速報名與參與管道。
        </p>
      </section>
      <section className="about-page-section">
        <h2>{t('nav.activities')}</h2>
        <ul className="about-activity-list">
          <li><strong>{t('activities.englishTable')}</strong> — {t('activities.etDesc')}</li>
          <li><strong>{t('activities.englishClub')}</strong> — {t('activities.ecDesc')}</li>
          <li><strong>{t('activities.internationalForum')}</strong> — {t('activities.ifDesc')}</li>
          <li><strong>{t('activities.jobTalk')}</strong> — {t('activities.jtDesc')}</li>
        </ul>
        <Link to="/events" className="btn btn-primary">{t('homePage.activityReserve')}</Link>
      </section>
    </div>
  );
}
