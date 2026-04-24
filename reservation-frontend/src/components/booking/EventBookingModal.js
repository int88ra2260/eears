/**
 * 活動預約 Modal：表單、提交、黑名單／問卷子流程
 * 由 EventDetail 對外暴露，EventList 僅依賴 EventDetail
 */
import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';
import useEventBooking from '../../hooks/useEventBooking';
import EventBookingSummary from './EventBookingSummary';
import EventBookingFormSection from './EventBookingFormSection';
import EnglishTableSurveyModal from '../EnglishTableSurveyModal';
import '../EventDetail.css';
import BookingSuccessView from './BookingSuccessView';

export default function EventBookingModal({ show, event, onClose }) {
  const [isMobile, setIsMobile] = useState(false);
  // 1:填寫, 2:問卷, 3:成功
  const [bookingStep, setBookingStep] = useState(1);
  const [successEmail, setSuccessEmail] = useState('');

  useEffect(() => {
    const checkMobile = () => {
      const mobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const booking = useEventBooking();
  const {
    form,
    message,
    isSubmitting,
    violationWarning,
    blacklist,
    survey,
    successMeta,
    handleReserve,
    handleSurveyClose,
    handleSurveyComplete,
  } = booking;

  // Step 2：若內建問卷 modal 開啟，就高亮 Step 2
  useEffect(() => {
    if (!show) return;
    if (survey?.showSurvey) setBookingStep(2);
  }, [show, survey?.showSurvey]);

  // Step 3：處理「問卷完成後自動回填」的 success 承接
  useEffect(() => {
    if (!show || !event) return;

    try {
      const recoveredStr = sessionStorage.getItem('pendingReservationRecoveredSuccess');
      if (!recoveredStr) return;
      const recovered = JSON.parse(recoveredStr);

      if (recovered && String(recovered.eventId) === String(event.id)) {
        setSuccessEmail(recovered.studentEmail || '');
        setBookingStep(3);
        sessionStorage.removeItem('pendingReservationRecoveredSuccess');
      }
    } catch (_) {
      // ignore
    }
  }, [show, event]);

  const handleReserveClick = () => {
    // 成功後不直接關 modal，而是切到成功狀態（由使用者自行離開）
    handleReserve(
      event,
      () => {
        setSuccessEmail(form.studentEmail);
        setBookingStep(3);
      },
      {
        onSurveyRequired: () => {
          // 讓語意變得清楚：先標示 step2（問卷），再進行 redirect
          setBookingStep(2);
        },
      },
    );
  };

  const resetLocalFlowState = () => {
    setBookingStep(1);
    setSuccessEmail('');
  };

  const handleCloseModal = () => {
    resetLocalFlowState();
    if (typeof onClose === 'function') onClose();
  };

  const handleSurveyCloseClick = () => {
    // 不要把 booking modal 一起關掉；只關問卷子流程
    handleSurveyClose();
  };

  const handleSurveyCompleteClick = () => {
    handleSurveyComplete(event, () => {
      setSuccessEmail(form.studentEmail);
      setBookingStep(3);
    });
  };

  // 每次打開時先重置；若有 recovered success 會由上方 effect 再切到 Step3
  useEffect(() => {
    if (!show) return;
    setBookingStep(1);
    setSuccessEmail('');
  }, [show]);

  if (!event) return null;
  const surveyKeyByEventType = event.eventType === 'English Club'
    ? 'english_club_feedback_114_1'
    : 'english_table_feedback_114_1';

  const footerStyle = isMobile
    ? {
        position: 'sticky',
        bottom: 0,
        backgroundColor: 'white',
        borderTop: '1px solid #dee2e6',
        padding: '15px',
        zIndex: 1050,
      }
    : {};
  const bodyStyle = isMobile ? { paddingBottom: '80px' } : {};
  const buttonStyle = isMobile ? { minHeight: '48px', fontSize: '16px' } : {};
  const buttonClass = isMobile ? 'flex-fill' : '';

  const stepIndicator = (
    <div className="d-flex align-items-center gap-2 mb-3" aria-label="Reservation progress">
      <div className="d-flex align-items-center gap-2">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 28,
            height: 28,
            backgroundColor: bookingStep === 1 ? '#0d6efd' : bookingStep > 1 ? '#198754' : '#e9ecef',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          1
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: bookingStep === 1 ? '#0d6efd' : '#6c757d' }}>
          填寫預約資料
        </div>
      </div>
      <div style={{ flex: 1, height: 2, backgroundColor: '#e9ecef' }} />
      <div className="d-flex align-items-center gap-2">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 28,
            height: 28,
            backgroundColor: bookingStep === 2 ? '#0dcaf0' : bookingStep > 2 ? '#198754' : '#e9ecef',
            color: bookingStep === 1 ? '#6c757d' : 'white',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          2
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: bookingStep === 2 ? '#0dcaf0' : '#6c757d' }}>
          完成必要問卷
        </div>
      </div>
      <div style={{ flex: 1, height: 2, backgroundColor: '#e9ecef' }} />
      <div className="d-flex align-items-center gap-2">
        <div
          className="rounded-circle d-flex align-items-center justify-content-center"
          style={{
            width: 28,
            height: 28,
            backgroundColor: bookingStep === 3 ? '#198754' : '#e9ecef',
            color: 'white',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          3
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: bookingStep === 3 ? '#198754' : '#6c757d' }}>
          預約完成
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Modal
        show={show}
        onHide={handleCloseModal}
        centered={!isMobile}
        fullscreen={isMobile ? 'sm-down' : false}
        scrollable={isMobile}
        style={isMobile ? { zIndex: 1055 } : {}}
      >
        <Modal.Header closeButton>
          <Modal.Title>{event.name} 預約</Modal.Title>
        </Modal.Header>

        <Modal.Body style={bodyStyle}>
          {stepIndicator}

          <EventBookingSummary event={event} isMobile={isMobile} />

          {bookingStep === 1 && (
            <EventBookingFormSection
              studentId={form.studentId}
              studentName={form.studentName}
              studentEmail={form.studentEmail}
              onStudentIdChange={form.setStudentId}
              onStudentNameChange={form.setStudentName}
              onStudentEmailChange={form.setStudentEmail}
              violationWarning={violationWarning}
              msg={message.msg}
              variant={message.variant}
              isMobile={isMobile}
            />
          )}

          {bookingStep === 2 && (
            <div>
              <EventBookingFormSection
                studentId={form.studentId}
                studentName={form.studentName}
                studentEmail={form.studentEmail}
                onStudentIdChange={form.setStudentId}
                onStudentNameChange={form.setStudentName}
                onStudentEmailChange={form.setStudentEmail}
                violationWarning={violationWarning}
                msg={message.msg || '此預約需要完成問卷後才能完成。系統將引導你完成問卷，完成後會自動恢復原流程。'}
                variant={message.variant || 'info'}
                isMobile={isMobile}
                disabled
              />
              <div className="alert alert-info mt-3 mb-0">
                <i className="fas fa-info-circle me-2" />
                此活動需先完成問卷。系統即將帶你前往問卷頁，完成後會自動恢復並完成原預約流程。
              </div>
            </div>
          )}

          {bookingStep === 3 && (
            <BookingSuccessView
              event={event}
              studentEmail={successMeta?.studentEmail || successEmail || form.studentEmail}
              reservationId={successMeta?.reservationId || null}
              bookingCode={successMeta?.bookingCode || null}
              successAt={successMeta?.createdAt || null}
              onClose={handleCloseModal}
            />
          )}
        </Modal.Body>

        <Modal.Footer style={footerStyle}>
          {bookingStep === 1 && (
            <div className={isMobile ? 'd-flex w-100 gap-2' : 'd-flex gap-2'}>
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className={buttonClass}
                style={buttonStyle}
              >
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleReserveClick}
                disabled={isSubmitting}
                className={buttonClass}
                style={buttonStyle}
              >
                {isSubmitting ? '處理中...' : 'Reserve / 預約'}
              </Button>
            </div>
          )}

          {bookingStep === 2 && (
            <div className={isMobile ? 'd-flex w-100 gap-2' : 'd-flex gap-2'}>
              <Button
                variant="secondary"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className={buttonClass}
                style={buttonStyle}
              >
                返回
              </Button>
              <Button variant="primary" disabled className={buttonClass} style={buttonStyle}>
                前往問卷中...
              </Button>
            </div>
          )}

          {bookingStep === 3 && (
            <div className="d-flex w-100 justify-content-end">
              <Button variant="secondary" onClick={handleCloseModal} className={buttonClass} style={buttonStyle}>
                關閉
              </Button>
            </div>
          )}
        </Modal.Footer>
      </Modal>

      <EnglishTableSurveyModal
        show={survey.showSurvey}
        onClose={handleSurveyCloseClick}
        onSurveyComplete={handleSurveyCompleteClick}
        surveyKey={surveyKeyByEventType}
        userInfo={{
          studentId: form.studentId || localStorage.getItem('lastStudentId') || '',
          studentName: form.studentName || localStorage.getItem('lastStudentName') || '',
          studentEmail: form.studentEmail || localStorage.getItem('lastStudentEmail') || '',
        }}
      />

      <Modal
        show={blacklist.showBlacklistModal}
        onHide={() => blacklist.setShowBlacklistModal(false)}
        centered
      >
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>
            <i className="fas fa-ban me-2" />
            無法預約 - 黑名單限制
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="alert alert-danger">
            <h5 className="alert-heading">
              <i className="fas fa-exclamation-triangle me-2" />
              您目前被列入黑名單
            </h5>
            <p className="mb-2">
              根據系統記錄，您目前有 <strong>{blacklist.blacklistInfo?.violationCount || 0}</strong> 次違規紀錄，已被列入黑名單。
            </p>
            {blacklist.blacklistInfo?.blacklistUntil && (
              <p className="mb-0">
                <strong>黑名單解除時間：</strong>
                <br />
                {new Date(blacklist.blacklistInfo.blacklistUntil).toLocaleString('zh-TW', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <div className="mt-3">
            <h6>違規行為說明：</h6>
            <ul className="mb-0">
              <li>成功預約但未到場</li>
              <li>活動中無正當理由中途離席</li>
              <li>活動開始後 5 分鐘才抵達現場</li>
              <li>其他違反活動規範的行為</li>
            </ul>
          </div>
          <div className="mt-3">
            <h6>規範說明：</h6>
            <p className="text-muted mb-0">
              同一學期內，若同學累積兩次違規紀錄，將被列入黑名單兩週。在此期間內，您將無法預約任何活動。
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => blacklist.setShowBlacklistModal(false)}>
            我知道了
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
