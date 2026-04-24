import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { HOME_FAQ_IDS } from '../../data/homeFaqs';
import './home.css';

export default function FAQSection() {
  const { t } = useLanguage();
  const [openId, setOpenId] = useState(null);

  return (
    <section id="faq" className="home-section" aria-labelledby="faq-title">
      <h2 id="faq-title" className="home-section-title">
        {t('homePage.faqTitle')}
      </h2>
      <div className="home-faq-list">
        {HOME_FAQ_IDS.map((id) => {
          const isOpen = openId === id;
          return (
            <div key={id} className="home-faq-item">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`${id}-answer`}
                id={`${id}-q`}
                onClick={() => setOpenId(isOpen ? null : id)}
              >
                <span>{t(`homePage.${id}Q`)}</span>
                <span className="faq-icon" aria-hidden>▼</span>
              </button>
              <div
                id={`${id}-answer`}
                role="region"
                aria-labelledby={`${id}-q`}
                className="faq-answer"
                hidden={!isOpen}
              >
                {t(`homePage.${id}A`)}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
