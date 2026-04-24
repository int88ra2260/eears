import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { EVENT_TYPES } from '../constants/eventTypes';
import PageHeader from '../components/layout/PageHeader';
import './ActivitiesPage.css';

/** 可預約的活動類型（BESTEP 後端支援前不列入，改為 coming soon 卡） */
const ACTIVITY_CARDS = [
  { slug: 'english-table', titleKey: 'activities.englishTable', introKey: 'activities.etDesc', type: EVENT_TYPES.ENGLISH_TABLE },
  { slug: 'english-club', titleKey: 'activities.englishClub', introKey: 'activities.ecDesc', type: EVENT_TYPES.ENGLISH_CLUB },
  { slug: 'international-forum', titleKey: 'activities.internationalForum', introKey: 'activities.ifDesc', type: EVENT_TYPES.INTERNATIONAL_FORUM },
  { slug: 'job-talk', titleKey: 'activities.jobTalk', introKey: 'activities.jtDesc', type: EVENT_TYPES.JOB_TALK },
];

export default function ActivitiesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.activities') },
  ];

  return (
    <div className="activities-page">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={t('nav.activities')}
        lead={t('page.activitiesLead')}
      />
      <div className="activities-page-grid">
        {ACTIVITY_CARDS.map((card) => (
          <article key={card.slug} className="activity-card">
            <h2 className="activity-card-title">{t(card.titleKey)}</h2>
            <p className="activity-card-desc">{t(card.introKey)}</p>
            <Link to={`/activities/${card.slug}`} className="btn btn-primary activity-card-cta">
              {t('homePage.activityReserve')}
            </Link>
          </article>
        ))}
        <article key="bestep" className="activity-card activity-card-coming-soon">
          <h2 className="activity-card-title">{t('page.bestepLabel')}</h2>
          <p className="activity-card-desc">{t('page.bestepComingSoon')}</p>
          <span className="btn btn-outline-secondary disabled" aria-disabled="true">
            {t('page.comingSoon')}
          </span>
        </article>
      </div>
      <div className="activities-page-cta">
        <p className="activities-page-cta-label">{t('page.calendarBookingTitle')}</p>
        <button type="button" className="btn btn-outline-primary" onClick={() => navigate('/events')}>
          {t('page.calendarBookingTitle')} → /events
        </button>
      </div>
    </div>
  );
}
