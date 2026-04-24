import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Form, Pagination, Badge, Row, Col, Button } from 'react-bootstrap';
import { useLanguage } from '../context/LanguageContext';
import useAnnouncements from '../hooks/useAnnouncements';
import PageHeader from '../components/layout/PageHeader';
import { announcementDetailPath } from '../services/announcementApi';
import './AnnouncementsPage.css';
import EmptyState from '../components/ui/EmptyState';
import SkeletonCard from '../components/ui/SkeletonCard';
import { ANNOUNCEMENT_CATEGORY_LABELS } from '../constants/announcementLabels';

const PAGE_SIZE = 20;

/** 依發布月份分組（列表 API 已新→舊排序，分組內順序不變） */
function groupByYearMonth(items) {
  const order = [];
  const map = new Map();
  for (const item of items) {
    const raw = item.date || item.publishedAt;
    const d = raw ? new Date(raw) : null;
    let key;
    let label;
    if (!d || Number.isNaN(d.getTime())) {
      key = '_other';
      label = '其他';
    } else {
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      key = `${y}-${String(m).padStart(2, '0')}`;
      label = `${y} 年 ${m} 月`;
    }
    if (!map.has(key)) {
      map.set(key, { key, label, items: [] });
      order.push(key);
    }
    map.get(key).items.push(item);
  }
  return order.map((k) => map.get(k));
}

export default function AnnouncementsPage() {
  const { t } = useLanguage();
  const [qInput, setQInput] = useState('');
  const [catInput, setCatInput] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ q: '', category: '', tag: '' });

  const hookOpts = useMemo(
    () => ({
      limit: PAGE_SIZE,
      page,
      q: applied.q || undefined,
      category: applied.category || undefined,
      tag: applied.tag || undefined,
      sliceMax: null,
    }),
    [page, applied]
  );

  const { items, loading, error, retry, pagination } = useAnnouncements(hookOpts);

  const grouped = useMemo(() => groupByYearMonth(items), [items]);

  const breadcrumbs = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.announcements') },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  const onApplyFilters = (e) => {
    e?.preventDefault?.();
    setApplied({
      q: qInput.trim(),
      category: catInput.trim(),
      tag: tagInput.trim(),
    });
    setPage(1);
  };

  const onResetFilters = () => {
    setQInput('');
    setCatInput('');
    setTagInput('');
    setApplied({ q: '', category: '', tag: '' });
    setPage(1);
  };

  return (
    <div className="announcements-page">
      <PageHeader breadcrumbs={breadcrumbs} title={t('homePage.announcementsTitle')} />

      <Form className="announcements-toolbar mb-4 p-3 border rounded bg-light" onSubmit={onApplyFilters}>
        <Row className="g-2 align-items-end">
          <Col md={4}>
            <Form.Label className="small mb-1">搜尋</Form.Label>
            <Form.Control
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="標題、摘要、slug…"
            />
          </Col>
          <Col md={3}>
            <Form.Label className="small mb-1">分類</Form.Label>
            <Form.Select value={catInput} onChange={(e) => setCatInput(e.target.value)}>
              <option value="">全部分類</option>
              {Object.entries(ANNOUNCEMENT_CATEGORY_LABELS).map(([k, lab]) => (
                <option key={k} value={k}>
                  {lab}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={3}>
            <Form.Label className="small mb-1">標籤</Form.Label>
            <Form.Control
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="單一標籤關鍵字"
            />
          </Col>
          <Col md={2} className="d-flex gap-1">
            <Button type="submit" variant="primary" size="sm">
              套用
            </Button>
            <Button type="button" variant="outline-secondary" size="sm" onClick={onResetFilters}>
              重設
            </Button>
          </Col>
        </Row>
      </Form>

      {loading && (
        <div className="announcements-page-loading" aria-busy="true" aria-live="polite">
          <div className="announcements-page-skeleton-list">
            {Array.from({ length: 6 }).map((_, idx) => (
              <SkeletonCard key={idx} lines={3} titleHeight={16} />
            ))}
          </div>
          <p className="mt-2 text-muted">{t('home.loading')}</p>
        </div>
      )}
      {!loading && error && (
        <EmptyState
          icon="⚠️"
          title={t('homePage.announcementsError')}
          description={error}
          actions={
            <>
              <button type="button" className="btn btn-outline-secondary btn-sm" onClick={retry}>
                重新嘗試
              </button>
              <Link to="/" className="btn btn-outline-primary btn-sm">
                {t('homePage.announcementsEmptyBack')}
              </Link>
            </>
          }
        />
      )}
      {!loading && !error && items.length > 0 && (
        <div className="announcements-grouped">
          {grouped.map((block) => (
            <section key={block.key} className="announcements-time-block" aria-labelledby={`announcements-block-${block.key}`}>
              <h2 id={`announcements-block-${block.key}`} className="announcements-time-block-title">
                {block.label}
              </h2>
              <ul className="announcements-list">
                {block.items.map((item) => (
                  <li key={item.id}>
                    <article className="announcement-card">
                      <div className="d-flex flex-column flex-md-row gap-3">
                        {item.coverImage ? (
                          <Link to={announcementDetailPath(item)} className="announcement-list-cover flex-shrink-0">
                            <img
                              src={item.coverImage}
                              alt={item.coverImageAlt || ''}
                              className="rounded border"
                              onError={(e) => {
                                e.currentTarget.src =
                                  'data:image/svg+xml,' +
                                  encodeURIComponent(
                                    '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect fill="#eee" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="12">圖片</text></svg>'
                                  );
                              }}
                            />
                          </Link>
                        ) : null}
                        <div className="flex-grow-1">
                          <p className="announcement-meta">
                            {formatDate(item.date)}{' '}
                            {item.category ? (
                              <Badge bg="light" text="dark" className="ms-1">
                                {ANNOUNCEMENT_CATEGORY_LABELS[item.category] || item.category}
                              </Badge>
                            ) : null}
                            {item.isPinned ? (
                              <Badge bg="warning" text="dark" className="ms-1">
                                置頂
                              </Badge>
                            ) : null}
                          </p>
                          <h2 className="announcement-title">{item.title}</h2>
                          {item.summary && <p className="announcement-summary">{item.summary}</p>}
                          {Array.isArray(item.tags) && item.tags.length > 0 ? (
                            <p className="small text-muted mb-2">
                              {item.tags.map((tg) => (
                                <Badge key={tg} bg="secondary" className="me-1 fw-normal">
                                  {tg}
                                </Badge>
                              ))}
                            </p>
                          ) : null}
                          <Link to={announcementDetailPath(item)} className="btn btn-sm btn-outline-primary">
                            {t('homePage.readMore')}
                          </Link>
                        </div>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="🗞️"
          title={t('homePage.noAnnouncements')}
          actions={
            <>
              <Link to="/" className="btn btn-outline-primary btn-sm">
                {t('homePage.announcementsEmptyBack')}
              </Link>
              <Link to="/activities" className="btn btn-primary btn-sm ms-2">
                {t('homePage.announcementsEmptyActivities')}
              </Link>
            </>
          }
        />
      )}

      {!loading && !error && pagination.totalPages > 1 && (
        <Pagination className="justify-content-center mt-4 flex-wrap">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} />
          <Pagination.Item active>
            {pagination.page} / {pagination.totalPages}
          </Pagination.Item>
          <Pagination.Next
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          />
        </Pagination>
      )}
    </div>
  );
}
