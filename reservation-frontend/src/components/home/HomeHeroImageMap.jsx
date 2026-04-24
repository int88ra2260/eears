import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getHeroImageUrl, IMAGES } from '../../constants/imagePaths';
import './home.css';

/**
 * Hero 圖上可點擊熱區設定（定位在 home.css 的 .hotspot-* 中，以 % 維護）
 */
const HERO_HOTSPOTS = [
  { key: 'book', to: '/activities', ariaLabel: '立即預約活動', className: 'hero-hotspot hotspot-book' },
  { key: 'my-reservations', to: '/my-reservations', ariaLabel: '查詢或取消我的預約', className: 'hero-hotspot hotspot-my-reservations' },
  { key: 'survey', to: '/survey/choice', ariaLabel: '本學期問卷', className: 'hero-hotspot hotspot-survey' },
  { key: 'rules', to: '/rules', ariaLabel: '活動規則與違規說明', className: 'hero-hotspot hotspot-rules' },
];

export default function HomeHeroImageMap() {
  const [heroImageFailed, setHeroImageFailed] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(getHeroImageUrl());

  const handleHeroImageError = () => {
    if (currentSrc !== IMAGES.heroFallback) {
      setCurrentSrc(IMAGES.heroFallback);
    } else {
      setHeroImageFailed(true);
    }
  };

  if (heroImageFailed) {
    return (
      <section className="home-hero home-hero--image-map" aria-label="首頁主視覺">
        <div className="home-hero__container">
          <div className="home-hero__image-wrapper">
            <div className="home-hero__fallback" aria-hidden>
              <span className="home-hero__fallback-text">EEARS</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="home-hero home-hero--image-map" aria-label="首頁主視覺">
      <div className="home-hero__container">
        <div className="home-hero__image-wrapper">
          <img
            src={currentSrc}
            alt="英語增能活動預約系統首頁主視覺"
            className="home-hero__image"
            fetchPriority="high"
            onError={handleHeroImageError}
          />
          {HERO_HOTSPOTS.map((spot) => (
            <Link
              key={spot.key}
              to={spot.to}
              className={spot.className}
              aria-label={spot.ariaLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
