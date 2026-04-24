import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/layout/PageHeader';
import './TermsPage.css';

export default function TermsPage() {
  const { t } = useLanguage();

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('homePage.footerTerms') },
  ];

  const sections = [
    { titleKey: 'section1Title', bodyKey: 'section1Body' },
    { titleKey: 'section2Title', bodyKey: 'section2Body' },
    { titleKey: 'section3Title', bodyKey: 'section3Body' },
    { titleKey: 'section4Title', bodyKey: 'section4Body' },
    { titleKey: 'section5Title', bodyKey: 'section5Body' },
  ];

  return (
    <div className="terms-page">
      <PageHeader breadcrumbs={breadcrumbs} title={t('termsPage.title')} lead={t('termsPage.lastUpdated')} />
      <div className="terms-page-content">
        <p className="terms-page-intro">{t('termsPage.intro')}</p>
        {sections.map(({ titleKey, bodyKey }) => (
          <section key={titleKey} className="terms-page-section">
            <h2>{t(`termsPage.${titleKey}`)}</h2>
            <p>{t(`termsPage.${bodyKey}`)}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
