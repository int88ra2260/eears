// src/components/EventList.js
// 漸進式模組化：日曆、活動介紹、規則／通知已拆至 components/events/，此檔為 orchestration container
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

import EventDetail from './EventDetail';
import { calculateReservationTime } from '../utils/reservationTime';
import ReservationSearchModal from './ReservationSearchModal';
import { safeAPICall } from '../utils/errorHandler';
import { useLanguage } from '../context/LanguageContext';
import { RESERVATIONS } from '../constants/pageModes';
import { getEventListMode } from '../utils/eventModeHelpers';
import { fetchEvents } from '../services/eventService';
import useToast from './ui/useToast';
import EventCalendarSection from './events/EventCalendarSection';
import ActivityIntroModal from './events/ActivityIntroModal';
import EventAlertsBanner from './events/EventAlertsBanner';
import EventRulesNotice from './events/EventRulesNotice';
import EmptyState from './ui/EmptyState';
import {
  parseEventTypeQueryParam,
  eventTypeFilterToQueryParam,
  isInvalidEventTypeQueryParam,
} from '../utils/eventTypeQuery';
import './EventList.css';
import './events/eventTypeFilter.css';
import {
  createSimulatedApiError,
  createSimulatedNetworkError,
  createSimulatedTimeoutError,
  getReliabilityFault,
  makeDevRequestId,
} from '../utils/reliabilityFaults';

function getInitialEventFilter(initialTabProp) {
  if (typeof window === 'undefined') return 'all';
  if (window.location.pathname === '/events') {
    return parseEventTypeQueryParam(new URLSearchParams(window.location.search).get('type'));
  }
  if (initialTabProp) {
    const tabToType = {
      'english-table': 'English Table',
      'english-club': 'English Club',
      'international-forum': 'International Forum',
      'job-talk': 'Job Talk',
    };
    return tabToType[initialTabProp] || 'all';
  }
  return 'all';
}

function EventList({ initialTab: initialTabProp }) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const toast = useToast();

  const pageMode = getEventListMode(location.pathname);
  const isMyReservations = pageMode === RESERVATIONS;
  // 注意：/my-reservations 現由 MyReservationsPage 專用 UI 呈現，不再渲染 EventList

  const [events, setEvents]                         = useState([]);
  const [loading, setLoading]                       = useState(true);
  const [loadError, setLoadError]                   = useState('');
  const [showSearchModal, setShowSearchModal]       = useState(false);
  const [showIntroductionModal, setShowIntroductionModal] = useState(false);
  const [selectedEvent, setSelectedEvent]           = useState(null);
  // 後台啟用中的活動問卷（用於顯示重要通知與問卷連結）
  const [enabledSurveys, setEnabledSurveys] = useState([]);

  const INITIAL_FILTER_FROM_TAB = useMemo(() => {
    const tabToType = {
      'english-table': 'English Table',
      'english-club': 'English Club',
      'international-forum': 'International Forum',
      'job-talk': 'Job Talk',
    };
    return tabToType[initialTabProp] || 'all';
  }, [initialTabProp]);

  const isEventsRoute = location.pathname === '/events';
  const recoveredQueryFlag = searchParams.get('recovered');
  const clearRecoveredQuery = useCallback(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('recovered');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const urlDerivedFilter = useMemo(
    () => parseEventTypeQueryParam(searchParams.get('type')),
    [searchParams],
  );

  const [eventTypeFilter, setEventTypeFilter] = useState(() => getInitialEventFilter(initialTabProp));

  useEffect(() => {
    if (isEventsRoute) {
      setEventTypeFilter(urlDerivedFilter);
    } else {
      setEventTypeFilter(INITIAL_FILTER_FROM_TAB);
    }
  }, [isEventsRoute, urlDerivedFilter, INITIAL_FILTER_FROM_TAB]);

  useEffect(() => {
    if (!isEventsRoute) return;
    const raw = searchParams.get('type');
    if (!isInvalidEventTypeQueryParam(raw)) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('type', 'all');
        return next;
      },
      { replace: true },
    );
  }, [isEventsRoute, searchParams, setSearchParams]);

  const filterOptions = useMemo(() => {
    return [
      { value: 'all', labelKey: 'nav.activities', tabId: null },
      { value: 'English Table', labelKey: 'activities.englishTable', tabId: 'english-table' },
      { value: 'English Club', labelKey: 'activities.englishClub', tabId: 'english-club' },
      { value: 'Job Talk', labelKey: 'activities.jobTalk', tabId: 'job-talk' },
      { value: 'International Forum', labelKey: 'activities.internationalForum', tabId: 'international-forum' },
    ];
  }, []);

  // Phase 2.3：問卷完成後自動承接預約成功（自動開啟 booking modal）
  useEffect(() => {
    if (!isEventsRoute) return;
    if (!recoveredQueryFlag) return;
    const recoveredStr = sessionStorage.getItem('pendingReservationRecoveredSuccess');
    if (!recoveredStr) {
      toast.warning('已完成問卷，但找不到可承接的預約資料。請重新選擇活動。');
      clearRecoveredQuery();
      return;
    }
    if (!events || events.length === 0) return;
    try {
      const recovered = JSON.parse(recoveredStr);
      const eventId = recovered?.eventId;
      if (!eventId) {
        toast.warning('預約承接資料不完整，請重新選擇活動。');
        sessionStorage.removeItem('pendingReservationRecoveredSuccess');
        clearRecoveredQuery();
        return;
      }
      const found = events.find((evt) => String(evt.id) === String(eventId));
      if (found) {
        setSelectedEvent(found);
        clearRecoveredQuery(); // 承接成功後清掉 query，避免 refresh 重播
      } else {
        toast.warning('找不到對應活動，可能已下架或時段已更新，請重新選擇活動。');
        sessionStorage.removeItem('pendingReservationRecoveredSuccess');
        clearRecoveredQuery();
      }
    } catch (_) {
      toast.warning('承接資料格式異常，請重新選擇活動。');
      sessionStorage.removeItem('pendingReservationRecoveredSuccess');
      clearRecoveredQuery();
    }
  }, [isEventsRoute, recoveredQueryFlag, events, toast, clearRecoveredQuery]);

  const filteredEvents = useMemo(() => {
    if (eventTypeFilter === 'all') return events;
    return events.filter((evt) => evt.eventType === eventTypeFilter);
  }, [events, eventTypeFilter]);

  const introTabForFilter = useMemo(() => {
    const selected = filterOptions.find((o) => o.value === eventTypeFilter);
    if (!selected) return initialTabProp;
    if (selected.value === 'all') return initialTabProp;
    return selected.tabId || initialTabProp;
  }, [eventTypeFilter, filterOptions, initialTabProp]);

  // 依 URL ?section=activities 開啟活動介紹模態（保留其餘 query，例如 /events?type=）
  useEffect(() => {
    const section = searchParams.get('section');
    if (section === 'activities') {
      setShowIntroductionModal(true);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete('section');
          return next;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams]);

  const applyEventTypeFilter = useCallback(
    (value) => {
      setEventTypeFilter(value);
      if (location.pathname === '/events') {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set('type', eventTypeFilterToQueryParam(value));
            return next;
          },
          { replace: true },
        );
      }
    },
    [location.pathname, setSearchParams],
  );

  const closeIntroductionModal = () => {
    setShowIntroductionModal(false);
    navigate('/', { replace: true });
  };

  // 載入後台啟用中的活動問卷（僅在啟用時顯示問卷通知）
  useEffect(() => {
    const fetchEnabledSurveys = async () => {
      try {
        const res = await fetch('/api/surveys/enabled');
        if (res.ok) {
          const data = await res.json();
          setEnabledSurveys(Array.isArray(data) ? data : []);
        }
      } catch (_) {
        setEnabledSurveys([]);
      }
    };
    fetchEnabledSurveys();
  }, []);

  const loadEvents = useCallback(async () => {
    setLoadError('');
    const fault = getReliabilityFault();
    let apiFn = fetchEvents;
    const devRid = makeDevRequestId('DEV');
    if (fault === 'eventsApi500') {
      apiFn = async () => {
        throw createSimulatedApiError({ status: 500, requestId: devRid, message: 'test 500' });
      };
    } else if (fault === 'eventsNetworkError') {
      apiFn = async () => {
        throw createSimulatedNetworkError({ requestId: devRid, message: 'test network error' });
      };
    } else if (fault === 'eventsTimeout') {
      apiFn = async () => {
        throw createSimulatedTimeoutError({ requestId: devRid, message: 'test timeout' });
      };
    }

    const result = await safeAPICall(apiFn);
    if (result.success) {
      setEvents(result.data);
    } else {
      setEvents([]);
      const msg = result.error?.display || result.error?.zh || result.error?.message || '載入活動失敗';
      setLoadError(msg);
      toast.error(msg);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const fillTemplate = useCallback((tpl, vars) => {
    return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  }, []);

  const canReserveAndReason = useCallback(
    (evt) => {
      if (evt.availableSpots === 0) {
        return {
          canReserve: false,
          reasonCode: 'FULL',
          reasonMessage: t('home.calendarAlertFull'),
        };
      }
      const now = dayjs();
      const start = dayjs(`${evt.date}T${evt.startTime}`);
      if (now.isAfter(start)) {
        return {
          canReserve: false,
          reasonCode: 'STARTED',
          reasonMessage: t('home.calendarAlertStarted'),
        };
      }
      const { openStart, openEnd } = calculateReservationTime(evt);
      if (now.isBefore(openStart)) {
        return {
          canReserve: false,
          reasonCode: 'NOT_YET_OPEN',
          reasonMessage: fillTemplate(t('home.calendarAlertNotOpen'), {
            start: openStart.format('YYYY/MM/DD HH:mm'),
            end: openEnd.format('YYYY/MM/DD HH:mm'),
          }),
        };
      }
      if (now.isAfter(openEnd)) {
        return {
          canReserve: false,
          reasonCode: 'PAST_DEADLINE',
          reasonMessage: t('home.calendarAlertPastDeadline'),
        };
      }
      return { canReserve: true, reasonCode: 'OK', reasonMessage: '' };
    },
    [t, fillTemplate],
  );

  const handleEventClick = (evt) => {
    setSelectedEvent(evt);
  };

  const filterBtnRefs = useRef([]);
  const activeFilterIndex = useMemo(() => {
    const i = filterOptions.findIndex((o) => o.value === eventTypeFilter);
    return i >= 0 ? i : 0;
  }, [filterOptions, eventTypeFilter]);

  const onFilterKeyDown = useCallback(
    (e, index) => {
      const len = filterOptions.length;
      let next = index;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = (index + 1) % len;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = (index - 1 + len) % len;
      } else if (e.key === 'Home') {
        e.preventDefault();
        next = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        next = len - 1;
      } else {
        return;
      }
      const opt = filterOptions[next];
      applyEventTypeFilter(opt.value);
      queueMicrotask(() => filterBtnRefs.current[next]?.focus());
    },
    [filterOptions, applyEventTypeFilter],
  );

  if (loading) {
    return (
      <div className="text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">{t('home.loading')}</span>
        </div>
        <p className="mt-2">{t('home.loadingEvents')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-center py-4">
        <EmptyState
          icon="⚠️"
          title="載入活動失敗"
          description={loadError}
          actions={
            <button type="button" className="btn btn-primary btn-sm" onClick={() => { setLoading(true); loadEvents(); }}>
              重新嘗試
            </button>
          }
        />
      </div>
    );
  }

  // 移除errorMsg相關的錯誤頁面顯示

  return (
    <div className="container-fluid mt-4">
      <EventAlertsBanner enabledSurveys={enabledSurveys} t={t} />
      <EventRulesNotice t={t} />

      <div className="event-type-filter mb-3">
        <div
          className="event-type-filter__segmented"
          role="group"
          aria-label={t('page.eventTypeFilterGroupAria')}
        >
          {filterOptions.map((opt, i) => {
            const isActive = eventTypeFilter === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                ref={(el) => {
                  filterBtnRefs.current[i] = el;
                }}
                className={`event-type-filter__btn ${isActive ? 'is-active' : ''}`}
                aria-pressed={isActive}
                aria-label={`${t(opt.labelKey)}${isActive ? t('page.eventTypeFilterCurrentSuffix') : ''}`}
                tabIndex={activeFilterIndex === i ? 0 : -1}
                onKeyDown={(e) => onFilterKeyDown(e, i)}
                onClick={() => applyEventTypeFilter(opt.value)}
              >
                {isActive && (
                  <span className="event-type-filter__btn-check" aria-hidden="true">
                    ✓
                  </span>
                )}
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="d-flex flex-wrap justify-content-end gap-2 mb-3">
        <button className="btn btn-primary" onClick={() => setShowSearchModal(true)}>
          {t('home.checkReservation')}
        </button>
        <button className="btn btn-info" onClick={() => setShowIntroductionModal(true)}>
          {t('home.activityIntro')}
        </button>
      </div>

      {events.length === 0 && (
        <div className="event-list-empty border rounded-3 bg-light mb-3 p-3">
          <EmptyState
            icon="📅"
            title={t('activities.noEventsTitle')}
            description={t('activities.noEventsDesc')}
          />
        </div>
      )}

      {events.length > 0 && filteredEvents.length === 0 && (
        <div className="event-list-empty border rounded-3 bg-light mb-3 p-3">
          <EmptyState
            icon="🔍"
            title={t('activities.filterEmptyTitle')}
            description={t('activities.filterEmptyDesc')}
            actions={
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={() => applyEventTypeFilter('all')}
              >
                {t('activities.showAllActivities')}
              </button>
            }
          />
        </div>
      )}

      <EventCalendarSection
        events={filteredEvents}
        canReserveAndReason={canReserveAndReason}
        onEventClick={handleEventClick}
        t={t}
        surveyActive={enabledSurveys.length > 0}
      />

      {showSearchModal && (
        <ReservationSearchModal
          show={showSearchModal}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {selectedEvent && (
        <EventDetail
          show={true}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {/* 移除errorMsg modal，改用系統提示 */}

      <ActivityIntroModal
        show={showIntroductionModal}
        onClose={closeIntroductionModal}
        initialTab={introTabForFilter}
        t={t}
      />
    </div>
  );
}

export default EventList;