import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import EventList from '../components/EventList';
import PageHeader from '../components/layout/PageHeader';
import { getReliabilityFault } from '../utils/reliabilityFaults';

/**
 * 日曆預約入口：/events = 依日曆選擇場次、預約或查詢／取消。
 * 與 /activities（活動總覽／分類導覽）互為導流。
 */
export default function EventsPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (getReliabilityFault() === 'renderCrash') {
    throw new Error('test crash (reliabilityFault=renderCrash)');
  }

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('page.calendarBookingTitle') },
  ];

  return (
    <div className="events-page">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={t('page.calendarBookingTitle')}
        lead={t('page.calendarBookingLead')}
      />
      <div className="events-page-cta mb-3">
        <button type="button" className="btn btn-outline-primary btn-sm" onClick={() => navigate('/activities')}>
          {t('page.calendarCtaToActivities')}
        </button>
      </div>
      <EventList />
    </div>
  );
}
