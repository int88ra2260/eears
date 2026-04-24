/**
 * 活動相關 API 薄層封裝，不改變既有 API contract
 * 供 EventList 或相關元件使用，便於測試與後續抽換
 */

import dayjs from 'dayjs';
import { fetchClient } from '../utils/fetchClient';

const API_EVENTS = '/api/events';

/**
 * 取得活動列表（僅未來場次，與原 EventList 行為一致）
 * @returns {Promise<Array>} 活動陣列，失敗時 throw
 */
export async function fetchEvents() {
  const response = await fetchClient(API_EVENTS);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw { response: { status: response.status, data: errorData } };
  }
  const data = await response.json();
  const today = dayjs().startOf('day');
  const upcoming = data.filter((evt) =>
    dayjs(evt.date).isSame(today) || dayjs(evt.date).isAfter(today)
  );
  return upcoming;
}
