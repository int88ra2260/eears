import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SITE_CONTACT, EMI_CENTER_URL } from '../../config/siteContact';
import './home.css';

export default function ContactSection() {
  const { t } = useLanguage();
  const c = SITE_CONTACT;

  return (
    <section id="contact" className="home-section" aria-labelledby="contact-title">
      <h2 id="contact-title" className="home-section-title">
        {t('homePage.contactTitle')}
      </h2>
      <div className="home-contact-box">
        <h3>{c.name}</h3>
        <ul className="home-contact-list">
          <li><strong>{t('homePage.contactAddress')}</strong> {c.address}</li>
          <li><strong>{t('homePage.contactPhone')}</strong> {c.phone}</li>
          <li><strong>{t('homePage.contactEmail')}</strong> {c.email}</li>
          <li><strong>{t('homePage.contactHours')}</strong> {c.hours}</li>
        </ul>
        <div className="home-contact-cta">
          <a href={`mailto:${c.email}`} className="btn btn-primary">
            {t('homePage.contactUs')}
          </a>
          <a
            href={EMI_CENTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline-primary"
          >
            {t('homePage.goToCenter')}
          </a>
        </div>
      </div>
    </section>
  );
}
