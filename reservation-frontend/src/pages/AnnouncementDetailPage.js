import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Badge, Button } from 'react-bootstrap';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/layout/PageHeader';
import { fetchPublicAnnouncement, normalizeAnnouncementItem } from '../services/announcementApi';
import './AnnouncementDetailPage.css';
import { ANNOUNCEMENT_CATEGORY_LABELS } from '../constants/announcementLabels';

export default function AnnouncementDetailPage() {
  const { idOrSlug } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    setItem(null);

    fetchPublicAnnouncement(idOrSlug)
      .then((data) => {
        if (!cancelled) {
          setItem(normalizeAnnouncementItem(data));
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.code === 'NOT_FOUND') {
          setNotFound(true);
        } else {
          setError(err.message || t('homePage.announcementsError'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [idOrSlug, t]);

  useEffect(() => {
    if (!item) return;
    if (item.canonicalSlug && String(idOrSlug) !== String(item.canonicalSlug)) {
      navigate(`/announcements/${encodeURIComponent(item.canonicalSlug)}`, { replace: true });
    }
  }, [item, idOrSlug, navigate]);

  useEffect(() => {
    if (!item) return;
    const slugSeg = item.slug != null && item.slug !== '' ? item.slug : item.id;
    const path = `/announcements/${encodeURIComponent(String(slugSeg))}`;
    const pageTitle = `${item.title} | EEARS`;
    document.title = pageTitle;
    const desc = item.seoDescription || item.summary || '';
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && desc) metaDesc.setAttribute('content', String(desc).slice(0, 300));
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && desc) ogDesc.setAttribute('content', String(desc).slice(0, 300));
    const ogImg = document.querySelector('meta[property="og:image"]');
    const img = item.ogImageUrl || item.coverImage;
    if (ogImg && img) ogImg.setAttribute('content', img);
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', `${window.location.origin}${path}`);
    return () => {
      document.title = 'EEARS｜英語增能活動預約系統';
    };
  }, [item]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  };

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.announcements'), path: '/announcements' },
    { label: item ? item.title : t('homePage.readMore') },
  ];

  if (loading) {
    return (
      <div className="announcement-detail-page">
        <div className="announcement-detail-loading">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2">{t('home.loading')}</p>
        </div>
      </div>
    );
  }

  if (notFound || (!item && !error)) {
    return (
      <div className="announcement-detail-page">
        <PageHeader
          breadcrumbs={[
            { label: t('nav.home'), path: '/' },
            { label: t('nav.announcements'), path: '/announcements' },
          ]}
          title={t('nav.announcements')}
        />
        <div className="announcement-detail-error">
          <p>{t('homePage.announcementNotFound')}</p>
          <Link to="/announcements" className="btn btn-primary">
            {t('homePage.backToAnnouncementsList')}
          </Link>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="announcement-detail-page">
        <PageHeader
          breadcrumbs={[
            { label: t('nav.home'), path: '/' },
            { label: t('nav.announcements'), path: '/announcements' },
          ]}
          title={t('nav.announcements')}
        />
        <div className="announcement-detail-error">
          <p>{error || t('homePage.announcementsError')}</p>
          <Link to="/announcements" className="btn btn-outline-primary btn-sm">
            {t('homePage.backToAnnouncementsList')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="announcement-detail-page">
      <PageHeader breadcrumbs={breadcrumbs} title={item.title} />
      <div className="announcement-detail-toolbar d-flex flex-wrap gap-2 align-items-center">
        <Link to="/announcements" className="btn btn-sm btn-outline-primary">
          ← {t('homePage.backToAnnouncementsList')}
        </Link>
        <Button type="button" size="sm" variant="outline-secondary" onClick={copyLink}>
          {copyDone ? '已複製連結' : '複製連結'}
        </Button>
      </div>
      <article className="announcement-detail-article">
        <p className="announcement-detail-meta d-flex flex-wrap align-items-center gap-2">
          <span>{formatDate(item.date || item.publishedAt)}</span>
          {item.readingMinutes ? <span className="text-muted">· 約 {item.readingMinutes} 分鐘閱讀</span> : null}
          {item.authorName ? <span className="text-muted">· {item.authorName}</span> : null}
          {item.category ? (
            <Badge bg="light" text="dark">
              {ANNOUNCEMENT_CATEGORY_LABELS[item.category] || item.category}
            </Badge>
          ) : null}
          {item.isPinned ? (
            <Badge bg="warning" text="dark">
              置頂
            </Badge>
          ) : null}
        </p>
        {Array.isArray(item.tags) && item.tags.length > 0 ? (
          <p className="mb-3">
            {item.tags.map((tg) => (
              <Badge key={tg} bg="secondary" className="me-1 fw-normal">
                {tg}
              </Badge>
            ))}
          </p>
        ) : null}
        {item.coverImage ? (
          <div className="announcement-detail-cover mb-3">
            <img
              src={item.coverImage}
              alt={item.coverImageAlt || item.title || ''}
              className="img-fluid rounded border"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        ) : null}
        <div className="announcement-detail-body">{item.content || item.summary || ''}</div>
        <div className="announcement-detail-back mt-4">
          <Link to="/announcements" className="btn btn-outline-secondary">
            ← {t('homePage.backToAnnouncementsList')}
          </Link>
        </div>
      </article>
    </div>
  );
}
