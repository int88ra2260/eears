/**
 * 活動預約 Modal 內的活動資訊與預約時間區塊（純展示）
 */
import React from 'react';
import { Alert } from 'react-bootstrap';
import { calculateReservationTime } from '../../utils/reservationTime';
import { getDefaultLocation } from '../../utils/eventLocation';

const KNOWN_TYPES = ['English Table', 'Job Talk', 'English Club', 'International Forum'];

export default function EventBookingSummary({ event, isMobile }) {
  if (!event) return null;

  const fs = isMobile ? '0.85rem' : '0.9rem';
  const mb = isMobile ? 'mb-3' : '';

  let reservationTimeBlock = null;
  try {
    const { openStart, openEnd } = calculateReservationTime(event);
    const isCustomType = !KNOWN_TYPES.includes(event.eventType);
    reservationTimeBlock = (
      <div className={`alert alert-info ${mb}`} style={{ fontSize: fs }}>
        <strong>📅 預約時間：</strong>
        <br />
        開放時間：{openStart.format('YYYY/MM/DD dddd HH:mm')} <br />
        截止時間：{openEnd.format('YYYY/MM/DD dddd HH:mm')}
        {isCustomType && event.customReservationRule && (
          <div className="mt-2 pt-2 border-top">
            <strong>📋 預約規則：</strong>
            <br />
            <span className="text-muted">{event.customReservationRule}</span>
          </div>
        )}
      </div>
    );
  } catch {
    reservationTimeBlock = null;
  }

  return (
    <>
      <Alert variant="info" className={`mb-3 ${mb}`} style={{ fontSize: fs }}>
        <i className="fas fa-info-circle me-2" />
        <strong>📋 活動規定修改：</strong>
        <br />
        114-1學期起不再提供活動補蓋章服務，請同學們務必準時參加活動。
      </Alert>

      <div className={`event-info ${mb}`}>
        <p className={isMobile ? 'mb-2' : ''}>
          <strong>活動類型：</strong>
          {event.eventType || 'English Table'} <br />
          <strong>日期：</strong>
          {event.date} <br />
          <strong>時間：</strong>
          {event.startTime} - {event.endTime} <br />
          <strong>活動地點：</strong>
          {event.location || getDefaultLocation(event.eventType)} <br />
          <strong>剩餘名額：</strong>
          {event.availableSpots}
        </p>
      </div>

      {reservationTimeBlock}
    </>
  );
}
