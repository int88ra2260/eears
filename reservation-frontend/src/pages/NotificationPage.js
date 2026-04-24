import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { fetchClient } from '../utils/fetchClient';
import { useLanguage } from '../context/LanguageContext';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import ToastMessage from '../components/ui/ToastMessage';

export default function NotificationPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const token = localStorage.getItem('token');

  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState({ show: false, message: '', variant: 'success' });

  const showToast = useCallback((message, variant = 'success') => {
    setToast({ show: true, message, variant });
  }, []);

  const fetchNotifications = useCallback(async () => {
    const tk = localStorage.getItem('token');
    if (!tk) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchClient('/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${tk}` },
      });
      if (!res.ok) throw new Error('載入通知失敗');
      const data = await res.json();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount || 0));
    } catch (e) {
      setItems([]);
      setUnreadCount(0);
      setError(e?.message || '載入通知失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }
    fetchNotifications();
  }, [token, fetchNotifications, navigate]);

  // 輕量輪詢：不使用 websocket，讓通知在一段時間後能更新
  useEffect(() => {
    if (!token) return;
    const tId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(tId);
  }, [token, fetchNotifications]);

  const markAsRead = useCallback(
    async (id) => {
      const tk = localStorage.getItem('token');
      if (!tk) return;
      try {
        const res = await fetchClient(`/api/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${tk}` },
        });
        if (!res.ok) throw new Error('標記已讀失敗');
        showToast('已標記為已讀');
        await fetchNotifications();
      } catch (e) {
        showToast(e?.message || '標記已讀失敗', 'danger');
      }
    },
    [fetchNotifications, showToast]
  );

  const breadcrumbs = useMemo(
    () => [
      { label: t('nav.home'), path: '/' },
      { label: '通知' },
    ],
    [t]
  );

  return (
    <div className="notification-page">
      <PageHeader breadcrumbs={breadcrumbs} title="通知" lead={unreadCount > 0 ? `你有 ${unreadCount} 則未讀通知` : undefined} />

      {loading && (
        <div className="text-center py-4" role="status" aria-busy="true">
          載入中...
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon="⚠️"
          title="通知載入失敗"
          description={error}
          actions={
            <button type="button" className="btn btn-outline-primary btn-sm" onClick={fetchNotifications}>
              重新嘗試
            </button>
          }
        />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon="🔔"
          title="目前沒有通知"
          description="當有預約、取消、違規或公告事件發生時，通知會顯示在這裡。"
        />
      )}

      {!loading && !error && items.length > 0 && (
        <div className="list-group notification-list">
          {items.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div key={n.id} className="list-group-item list-group-item-action notification-item">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="fw-bold">{n.title}</div>
                      {isUnread && <span className="badge text-bg-danger">未讀</span>}
                    </div>
                    {n.content && <div className="mt-2 text-muted">{n.content}</div>}
                    {n.createdAt && (
                      <div className="mt-2 text-muted small">
                        建立時間：{dayjs(n.createdAt).format('YYYY/MM/DD HH:mm')}
                      </div>
                    )}
                  </div>
                  {isUnread && (
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => markAsRead(n.id)}
                    >
                      標記已讀
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToastMessage
        show={toast.show}
        message={toast.message}
        variant={toast.variant}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />
    </div>
  );
}

