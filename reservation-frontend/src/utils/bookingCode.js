export function formatBookingCode(bookingCode, reservationId) {
  const code = String(bookingCode || '').trim();
  if (code) {
    if (/^R-\d+$/.test(code)) return code;
    if (/^\d+$/.test(code)) return `R-${code.padStart(6, '0')}`;
    return code;
  }

  const rid = String(reservationId || '').trim();
  if (!rid) return '（未提供）';
  if (/^\d+$/.test(rid)) return `R-${rid.padStart(6, '0')}`;
  return `R-${rid}`;
}

