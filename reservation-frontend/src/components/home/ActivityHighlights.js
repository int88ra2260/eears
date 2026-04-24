import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { HOME_ACTIVITIES } from '../../data/homeActivities';
import './home.css';

export default function ActivityHighlights() {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section id="activities" className="home-section" aria-labelledby="activities-title">
      <h2 id="activities-title" className="home-section-title">
        {t('homePage.activitiesTitle')}
      </h2>
      <div className="home-activities-grid">
        {HOME_ACTIVITIES.map((activity) => (
          <div key={activity.id} className="home-activity-card card">
            <h3>{t(activity.titleKey)}</h3>
            <p className="intro">{t(activity.introKey)}</p>
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => navigate('/activities')}
            >
              {t('homePage.activityLearnMore')}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
