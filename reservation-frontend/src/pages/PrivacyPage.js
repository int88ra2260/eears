import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/layout/PageHeader';
import './PrivacyPage.css';

export default function PrivacyPage() {
  const { t } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('homePage.footerPrivacy') },
  ];

  const sections = [
    { titleKey: 'section1Title', bodyKey: 'section1Body' },
    { titleKey: 'section2Title', bodyKey: 'section2Body' },
    { titleKey: 'section3Title', bodyKey: 'section3Body' },
    { titleKey: 'section4Title', bodyKey: 'section4Body' },
    { titleKey: 'section5Title', bodyKey: 'section5Body' },
  ];

  return (
    <div className="privacy-page">
      <PageHeader breadcrumbs={breadcrumbs} title={t('privacyPage.title')} lead={t('privacyPage.lastUpdated')} />
      <div className="privacy-page-content">
        <p className="privacy-page-intro">{t('privacyPage.intro')}</p>
        {sections.map(({ titleKey, bodyKey }) => (
          <section key={titleKey} className="privacy-page-section">
            <h2>{t(`privacyPage.${titleKey}`)}</h2>
            <p>{t(`privacyPage.${bodyKey}`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
