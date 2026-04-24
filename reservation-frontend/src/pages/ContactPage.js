import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SITE_CONTACT, EMI_CENTER_URL } from '../config/siteContact';
import PageHeader from '../components/layout/PageHeader';
import './ContactPage.css';

export default function ContactPage() {
  const { t } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.contact') },
  ];

  return (
    <div className="contact-page">
      <PageHeader breadcrumbs={breadcrumbs} title={t('homePage.contactTitle')} />
      <div className="contact-page-card">
        <h2 className="contact-page-name">{SITE_CONTACT.name}</h2>
        <dl className="contact-page-dl">
          <dt>{t('homePage.contactAddress')}</dt>
          <dd>{SITE_CONTACT.address}</dd>
          <dt>{t('homePage.contactPhone')}</dt>
          <dd>{SITE_CONTACT.phone}</dd>
          <dt>{t('homePage.contactEmail')}</dt>
          <dd><a href={`mailto:${SITE_CONTACT.email}`}>{SITE_CONTACT.email}</a></dd>
          <dt>{t('homePage.contactHours')}</dt>
          <dd>{SITE_CONTACT.hours}</dd>
        </dl>
        <a href={EMI_CENTER_URL} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
          {t('homePage.goToCenter')}
        </a>
      </div>
    </div>
  );
}
