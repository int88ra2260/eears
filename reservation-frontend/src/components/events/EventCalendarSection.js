/**
 * 活動日曆區塊：FullCalendar 顯示與單一活動點擊
 * 不負責資料取得，由父層傳入 events、canReserveAndReason、onEventClick
 */
import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import { getEventAbbreviation } from '../../constants/eventTypes';
import { getEventLocationDisplay } from '../../utils/eventLocation';
import StatusBadge from '../ui/StatusBadge';
import useToast from '../ui/useToast';
import './eventHoverCard.css';

/** 日曆可預約狀態 → StatusBadge variant（與預約卡語意對齊） */
function calendarAvailabilityVariant(canReserve, reasonCode) {
  if (canReserve) return 'success';
  if (reasonCode === 'FULL') return 'danger';
  return 'neutral';
}

function hoverBadgeLabel(reasonCode, t) {
  switch (reasonCode) {
    case 'FULL':
      return t('home.eventHoverBadgeFull');
    case 'NOT_YET_OPEN':
      return t('home.eventHoverBadgeNotOpenYet');
    case 'PAST_DEADLINE':
      return t('home.eventHoverBadgeReservationEnded');
    case 'STARTED':
      return t('home.eventHoverBadgeEventStarted');
    default:
      return t('home.eventHoverBadgeUnavailable');
  }
}

export default function EventCalendarSection({
  events,
  canReserveAndReason,
  onEventClick,
  t,
  surveyActive = false,
}) {
  const toast = useToast();
  const enableHover = useMemo(() => {
    if (typeof window === 'undefined') return false;
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    }
    return window.innerWidth >= 768;
  }, []);

  const [hoverPreview, setHoverPreview] = useState(null);
  /** 手機／窄螢幕清單檢視：展開列內摘要（不依賴 hover） */
  const [expandedEventId, setExpandedEventId] = useState(null);

  const calendarEvents = events.map((evt) => ({
    id: evt.id,
    title: evt.name,
    start: `${evt.date}T${evt.startTime}`,
    end: `${evt.date}T${evt.endTime}`,
    extendedProps: { originalEvent: evt },
  }));

  const handleClick = (info) => {
    const evt = info.event.extendedProps.originalEvent;
    const { canReserve, reasonMessage } = canReserveAndReason(evt);
    if (!canReserve) {
      toast.warning(reasonMessage);
      return;
    }
    onEventClick(evt);
  };

  const handleMouseEnter = (info) => {
    if (!enableHover) return;
    const evt = info.event.extendedProps.originalEvent;
    const rect = info.el?.getBoundingClientRect?.();
    if (!evt || !rect) return;
    const { canReserve, reasonCode, reasonMessage } = canReserveAndReason(evt);

    const surveyRequired =
      surveyActive &&
      (evt.eventType === 'English Table' || evt.eventType === 'English Club');

    const statusLabel = canReserve ? t('home.eventHoverBadgeOpen') : hoverBadgeLabel(reasonCode, t);

    const reasonShort = (() => {
      if (!reasonMessage || canReserve) return '';
      const withoutParen = reasonMessage.split('(')[0]?.trim() || reasonMessage;
      return withoutParen.length > 44 ? `${withoutParen.slice(0, 44)}…` : withoutParen;
    })();

    const locationLine = getEventLocationDisplay(evt);

    // Clamp card position to viewport（寬度與 .event-hover-card 一致）
    const cardWidth = 300;
    const rawX = rect.left + rect.width / 2;
    const rawY = rect.top;
    const x = Math.min(
      Math.max(rawX, cardWidth / 2 + 12),
      window.innerWidth - cardWidth / 2 - 12
    );
    const y = Math.min(Math.max(rawY, 12), window.innerHeight - 12);

    setHoverPreview({
      evt,
      canReserve,
      reasonCode,
      reasonShort,
      surveyRequired,
      statusLabel,
      locationLine,
      x,
      y,
    });
  };

  const handleMouseLeave = () => {
    setHoverPreview(null);
  };

  const renderEventContent = (info) => {
    const evt = info.event.extendedProps.originalEvent;
    const isNarrow = window.innerWidth < 576;
    const showMobileExpand = window.innerWidth < 768;
    const { canReserve, reasonMessage, reasonCode } = canReserveAndReason(evt);
    const dotColor = canReserve ? 'text-success' : 'text-danger';
    const nameLabel = isNarrow ? getEventAbbreviation(evt.eventType || evt.name) : evt.name;

    const surveyRequired =
      surveyActive &&
      (evt.eventType === 'English Table' || evt.eventType === 'English Club');

    const reasonShort = (() => {
      if (!reasonMessage || typeof reasonMessage !== 'string') return '';
      const withoutParen = reasonMessage.split('(')[0]?.trim() || reasonMessage;
      return withoutParen.length > 80 ? `${withoutParen.slice(0, 80)}…` : withoutParen;
    })();

    const expanded = expandedEventId === evt.id;

    if (showMobileExpand) {
      return (
        <div className="fc-event-mobile-wrap px-2 py-1">
          <div className="fc-event-mobile-row d-flex align-items-center justify-content-between gap-1">
            <span className="flex-grow-1 text-truncate" style={{ fontSize: '0.75rem' }}>
              <span className={dotColor}>●</span> {nameLabel}
            </span>
            <button
              type="button"
              className="btn btn-link fc-event-mobile-expand p-0"
              aria-expanded={expanded}
              aria-label={t('home.eventDetailsToggle')}
              onClick={(e) => {
                e.stopPropagation();
                setExpandedEventId((prev) => (prev === evt.id ? null : evt.id));
              }}
            >
              {expanded ? '▲' : '▼'}
            </button>
          </div>
          {expanded && (
            <div
              className="fc-event-mobile-detail text-muted small mt-1 ps-1"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role="presentation"
            >
              <div className="text-body">{evt.startTime} – {evt.endTime}</div>
              <div className="fc-event-mobile-status">
                <StatusBadge
                  variant={calendarAvailabilityVariant(canReserve, reasonCode)}
                  size="sm"
                >
                  {canReserve ? t('home.eventStatusOpen') : t('home.eventStatusClosed')}
                </StatusBadge>
              </div>
              {surveyRequired && (
                <div className="fc-event-mobile-survey">
                  <StatusBadge variant="info" size="sm">
                    {t('home.surveyRequiredBadge')}
                  </StatusBadge>
                </div>
              )}
              <div>
                {t('home.eventHoverLocationLabel')} {getEventLocationDisplay(evt)}
              </div>
              <div>
                {t('home.eventHoverSpotsPrefix')}
                {typeof evt.availableSpots === 'number' ? evt.availableSpots : '—'}
              </div>
              {!canReserve && reasonShort && (
                <div className="text-danger small mt-1">{reasonShort}</div>
              )}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="ps-3">
        <span className={`fs-5 ${dotColor}`}>●</span>
        <div className="fw-bold">{evt.name}</div>
        <div>{evt.startTime} - {evt.endTime}</div>
      </div>
    );
  };

  return (
    <>
      <FullCalendar
        plugins={[dayGridPlugin, listPlugin]}
        initialView={window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth'}
        events={calendarEvents}
        eventContent={renderEventContent}
        eventClick={handleClick}
        eventMouseEnter={handleMouseEnter}
        eventMouseLeave={handleMouseLeave}
        height={window.innerWidth < 768 ? 'auto' : 600}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth,listWeek',
        }}
        views={{
          dayGridMonth: {
            buttonText: t('home.month'),
            eventDisplay: 'block',
            eventTimeFormat: { hour: '2-digit', minute: '2-digit' },
          },
          listWeek: {
            buttonText: t('home.list'),
            eventDisplay: 'list-item',
            listDayFormat: { weekday: 'long', month: 'long', day: 'numeric' },
            listDaySideFormat: false,
          },
        }}
        eventClassNames="calendar-event"
        dayHeaderClassNames="calendar-day-header"
        dayCellClassNames="calendar-day-cell"
      />

      {enableHover && hoverPreview && (
        <div
          className="event-hover-card"
          style={{
            left: hoverPreview.x,
            top: hoverPreview.y,
            transform: 'translate(-50%, -8px)',
          }}
          role="status"
          aria-live="polite"
          aria-label={t('home.eventHoverCardAria')}
        >
          <div className="event-hover-card__title">{hoverPreview.evt.name}</div>
          <div className="event-hover-card__time">
            {hoverPreview.evt.date} {hoverPreview.evt.startTime} – {hoverPreview.evt.endTime}
          </div>
          {hoverPreview.locationLine && (
            <div className="event-hover-card__location">
              <span className="event-hover-card__location-label">{t('home.eventHoverLocationLabel')}</span>
              {hoverPreview.locationLine}
            </div>
          )}
          <div className="event-hover-card__meta">
            <StatusBadge
              variant={calendarAvailabilityVariant(hoverPreview.canReserve, hoverPreview.reasonCode)}
              size="md"
              className="event-hover-card__status-pill"
            >
              {hoverPreview.statusLabel}
            </StatusBadge>
            <span className="event-hover-card__type">
              {hoverPreview.evt.eventType || hoverPreview.evt.name}
            </span>
            {hoverPreview.surveyRequired && (
              <StatusBadge variant="info" size="md" title={t('home.eventHoverSurveyAria')}>
                {t('home.eventHoverSurveyShort')}
              </StatusBadge>
            )}
            <span className="event-hover-card__spots">
              {t('home.eventHoverSpotsPrefix')}
              {typeof hoverPreview.evt.availableSpots === 'number' ? hoverPreview.evt.availableSpots : '—'}
            </span>
          </div>
          {!hoverPreview.canReserve && hoverPreview.reasonShort && (
            <div className="event-hover-card__reason">{hoverPreview.reasonShort}</div>
          )}
        </div>
      )}
    </>
  );
}
