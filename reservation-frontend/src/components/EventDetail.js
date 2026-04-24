// src/components/EventDetail.js
// 預約流程已模組化至 components/booking/EventBookingModal、EventBookingFormSection、EventBookingSummary 與 useEventBooking
// 此檔保留對外介面，供 EventList 使用，不變更呼叫方
import EventBookingModal from './booking/EventBookingModal';

export default function EventDetail(props) {
  return <EventBookingModal {...props} />;
}
