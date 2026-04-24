import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import './home.css';

export default function ReservationSteps() {
  const { t } = useLanguage();
  const steps = [
    { key: 'homePage.step1' },
    { key: 'homePage.step2' },
    { key: 'homePage.step3' },
    { key: 'homePage.step4' },
  ];

  return (
    <section className="home-section" aria-labelledby="steps-title">
      <h2 id="steps-title" className="home-section-title">
        {t('homePage.stepsTitle')}
      </h2>
      <div className="home-steps">
        {steps.map((step) => (
          <div key={step.key} className="home-step">
            <strong>{t(step.key)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
