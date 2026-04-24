import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from 'react-bootstrap';
import { useLanguage } from '../../context/LanguageContext';
import useAnnouncements from '../../hooks/useAnnouncements';
import { announcementDetailPath, truncateAnnouncementPreview } from '../../services/announcementApi';
import { ANNOUNCEMENT_CATEGORY_LABELS } from '../../constants/announcementLabels';
import './home.css';

export default function AnnouncementPreview() {
  const { t } = useLanguage();
  const { items, loading, error } = useAnnouncements(3);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  return (
    <section id="announcements" className="home-section" aria-labelledby="announcements-title">
      <h2 id="announcements-title" className="home-section-title">
        {t('homePage.announcementsTitle')}
      </h2>

      {loading && (
        <div className="home-announcements-loading" aria-busy="true" aria-live="polite">
          <div className="home-announcements-skeleton">
            {[1, 2, 3].map((i) => (
              <div key={i} className="home-announcement-card home-announcement-skeleton-card">
                <div className="skeleton-line skeleton-meta" />
                <div className="skeleton-line skeleton-title" />
                <div className="skeleton-line skeleton-summary" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="home-announcements-error">
          <p className="home-announcements-error-text">{t('homePage.announcementsError')}</p>
          <div className="home-announcements-error-actions">
            <Link to="/" className="btn btn-outline-primary">{t('homePage.announcementsEmptyBack')}</Link>
            <Link to="/activities" className="btn btn-primary">{t('homePage.announcementsEmptyActivities')}</Link>
          </div>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <div className="home-announcements-grid">
            {items.map((item) => (
              <article key={item.id} className="home-announcement-card">
                {item.coverImage ? (
                  <Link to={announcementDetailPath(item)} className="home-announcement-cover-link d-block mb-2">
                    <img
                      src={item.coverImage}
                      alt={item.coverImageAlt || ''}
                      className="home-announcement-cover img-fluid rounded"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </Link>
                ) : null}
                <p className="meta d-flex flex-wrap align-items-center gap-1">
                  <span>{formatDate(item.date)}</span>
                  {item.category ? (
                    <Badge bg="light" text="dark" className="fw-normal">
                      {ANNOUNCEMENT_CATEGORY_LABELS[item.category] || item.category}
                    </Badge>
                  ) : null}
                  {item.isPinned ? (
                    <Badge bg="warning" text="dark" className="fw-normal">
                      置頂
                    </Badge>
                  ) : null}
                </p>
                <h4>
                  <Link to={announcementDetailPath(item)} className="text-decoration-none text-dark">
                    {item.title}
                  </Link>
                </h4>
                {item.summary && (
                  <p className="summary">{truncateAnnouncementPreview(item.summary, 80)}</p>
                )}
                <Link to={announcementDetailPath(item)} className="btn btn-sm btn-outline-primary mt-2">
                  {t('homePage.readMore')}
                </Link>
              </article>
            ))}
          </div>
          <div className="text-center mt-3">
            <Link to="/announcements" className="btn btn-outline-primary">
              {t('homePage.viewAllAnnouncements')}
            </Link>
          </div>
        </>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="home-announcements-empty">
          <p className="home-announcements-empty-text">{t('homePage.noAnnouncements')}</p>
          <div className="home-announcements-empty-actions">
            <Link to="/" className="btn btn-outline-primary">{t('homePage.announcementsEmptyBack')}</Link>
            <Link to="/activities" className="btn btn-primary">{t('homePage.announcementsEmptyActivities')}</Link>
          </div>
        </div>
      )}
    </section>
  );
}
