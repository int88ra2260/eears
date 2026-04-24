import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import './bentoCtaGrid.css';

const DEFAULT_ITEMS = [
  {
    titleKey: 'homePage.quickMyReservation',
    descKey: 'homePage.quickMyReservationDesc',
    to: '/my-reservations',
    icon: '🔍',
  },
  {
    titleKey: 'homePage.quickSurvey',
    descKey: 'homePage.quickSurveyDesc',
    to: '/survey/choice',
    icon: '📋',
  },
  {
    titleKey: 'homePage.quickRules',
    descKey: 'homePage.quickRulesDesc',
    to: '/rules',
    icon: '📌',
  },
];

/**
 * 首頁 Hero 下方「Bento Grid CTA」
 * - 不觸碰既有路由/API，只做視覺與入口結構升級
 */
export default function BentoCtaGrid({ items = DEFAULT_ITEMS }) {
  const { t } = useLanguage();

  return (
    <section className="bento-cta" aria-label={t('homePage.bentoSectionAria')}>
      <div className="bento-cta-grid" role="list">
        {items.map((item, idx) => (
          <div key={`${item.to}-${idx}`} role="listitem" className="bento-cta__cell">
            <Link
              to={item.to}
              className="bento-cta-card"
              aria-label={t(item.titleKey)}
            >
              <div className="bento-cta-card__top">
                <div className="bento-cta-card__icon" aria-hidden>
                  {item.icon}
                </div>
                <div className="bento-cta-card__title">{t(item.titleKey)}</div>
              </div>
              <div className="bento-cta-card__desc">{t(item.descKey)}</div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

