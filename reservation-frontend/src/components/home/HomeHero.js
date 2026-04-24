import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import BentoCtaGrid from '../magic/BentoCtaGrid';
import './home.css';

export default function HomeHero() {
  const { t } = useLanguage();

  return (
    <section className="home-hero" aria-labelledby="home-hero-title">
      <div className="home-hero__container">
        <div className="home-hero-inner">
          <div className="home-hero-content">
            <h1 id="home-hero-title" className="home-hero-title">
                <span className="home-hero-title__shiny">
                  {t('homePage.heroTitle')}
                </span>
            </h1>
            <p className="home-hero-subtitle">{t('homePage.heroSubtitle')}</p>
            <p className="home-hero-desc">{t('homePage.heroDesc')}</p>

            <div className="home-hero-cta" role="group" aria-label={t('homePage.heroCtaGroupAria')}>
                <Link
                  to="/events"
                  className="btn btn-primary home-hero__btn home-hero__btn--shimmer"
                >
                {t('homePage.heroCtaBook')}
              </Link>
            </div>

            <BentoCtaGrid />
          </div>
        </div>
      </div>
    </section>
  );
}
