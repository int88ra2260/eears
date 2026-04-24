import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { FAQ_IDS } from '../data/faqs';
import PageHeader from '../components/layout/PageHeader';
import './FAQPage.css';

export default function FAQPage() {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState(null);

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.faq') },
  ];

  return (
    <div className="faq-page">
      <PageHeader breadcrumbs={breadcrumbs} title={t('faq.title')} />
      <div className="faq-page-list">
        {FAQ_IDS.map((id) => {
          const isOpen = openId === id;
          return (
            <div key={id} className="faq-page-item">
              <button
                type="button"
                className="faq-page-question"
                aria-expanded={isOpen}
                aria-controls={`faq-${id}-answer`}
                id={`faq-${id}-q`}
                onClick={() => setOpenId(isOpen ? null : id)}
              >
                <span>{t(`homePage.${id}Q`)}</span>
                <span className="faq-page-icon" aria-hidden>{isOpen ? '▲' : '▼'}</span>
              </button>
              <div
                id={`faq-${id}-answer`}
                role="region"
                aria-labelledby={`faq-${id}-q`}
                className="faq-page-answer"
                hidden={!isOpen}
              >
                {t(`homePage.${id}A`)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
