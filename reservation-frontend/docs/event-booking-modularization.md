# EventDetail / 預約流程模組化：掃描結果與拆分說明

## 一、掃描結果

### 1. EventDetail 目前承擔的職責

- **Modal 殼**：顯示／關閉、標題「{活動名} 預約」、RWD（centered / fullscreen、isMobile 偵測）。
- **活動規定與資訊**：固定文案（補蓋章提醒）、活動類型／日期／時間／地點／剩餘名額、預約開放／截止時間（`calculateReservationTime`）、自訂活動規則。
- **表單**：學號、姓名、Email 受控欄位。
- **提交邏輯**：頻率限制（5 秒內最多 3 次）、`validateReservationData`、欄位長度檢查、localStorage 寫入、黑名單檢查（GET `/api/users/blacklist-status`）、POST `/api/reservations`、409 問卷導向（sessionStorage + redirect）、429／503／一般錯誤處理、成功後 1.5s 關閉。
- **副 UI**：違規累積 1 次提醒、訊息 Alert（msg/variant）、黑名單阻擋 Modal、EnglishTableSurveyModal（問卷完成後重試預約）。

### 2. selectedEvent、modal 開關、預約 submit、錯誤處理的關係

- **EventList** 持有 `selectedEvent`，點擊日曆活動時 `handleEventClick(evt)` → `setSelectedEvent(evt)`。
- Modal 顯示條件：`selectedEvent != null`；關閉：`onClose={() => setSelectedEvent(null)}`。
- **EventDetail** 接收 `show={true}`、`event={selectedEvent}`、`onClose`；提交成功後在 hook 內 `setTimeout(onClose, 1500)`。
- 錯誤處理：驗證失敗／長度／頻率 → 設 msg/variant；API 非 2xx → 依 status 處理（409 導向問卷、429／503 設 msg、其餘 handleAPIError）；網路錯誤 → handleAPIError。皆在表單上方同一 Alert 顯示。

### 3. 既有 API、驗證與流程（未改 contract）

- **POST /api/reservations**：body `{ eventId, studentId, studentName, studentEmail, eventType }`。
- **GET /api/users/blacklist-status?studentId=...**：回傳 `{ isBlacklisted, blacklistUntil, violationCount }`。
- **驗證**：`validateReservationData({ studentId, studentName, studentEmail })`（utils/validators.js）；學號 ≤20、姓名 ≤100、Email ≤255 字元。
- **409**：`code` 為 `ENGLISH_TABLE_SURVEY_REQUIRED` / `ENGLISH_CLUB_SURVEY_REQUIRED` / `SURVEY_REQUIRED` 時，寫入 sessionStorage 並 `window.location.href` 導向問卷。

---

## 二、模組拆分策略

1. **服務層**  
   - **eventBookingService.js**：`createReservation(payload)` → POST `/api/reservations`，回傳 `{ ok, status, data }`；`checkBlacklist(studentId)` → GET 黑名單狀態。呼叫端依 status 處理 409／429／503。

2. **狀態與流程**  
   - **useEventBooking**：表單 state（studentId/studentName/studentEmail）、msg/variant、isSubmitting、submitCount/lastSubmitTime（頻率限制）、violationWarning、blacklist 與 survey 相關 state；`handleReserve(event, onSuccess)`（驗證 → localStorage → 黑名單檢查 → createReservation → 409 導向／錯誤設 msg／成功後 onSuccess）；`handleSurveyClose(onClose)`、`handleSurveyComplete(event, onSuccess)`（重試預約）。

3. **UI 元件**  
   - **EventBookingSummary**：活動規定 Alert、活動資訊（類型／日期／時間／地點／名額）、預約時間區塊（`calculateReservationTime`、自訂規則）。純展示，props：`event`、`isMobile`。  
   - **EventBookingFormSection**：學號／姓名／Email 表單、違規提醒 Alert、msg Alert。受控元件，props：表單 value/onChange、violationWarning、msg、variant、isMobile。  
   - **EventBookingModal**：Modal 殼（show/onHide、標題、RWD、isMobile）、body 內依序 EventBookingSummary、EventBookingFormSection、footer（取消／預約）、黑名單 Modal、EnglishTableSurveyModal；使用 useEventBooking，將 event/onClose 傳入 handleReserve／handleSurveyComplete。

4. **對外介面**  
   - **EventDetail.js**：僅轉發 props 至 `EventBookingModal`，供 EventList 繼續使用 `<EventDetail show event onClose />`，不變更呼叫方。

5. **低風險與回滾**  
   - 未改 API、驗證規則與提交流程；僅抽離服務／hook／子元件，EventDetail 行為與 UI 保持一致。回滾時可還原 EventDetail.js 為單一檔案並移除 booking 目錄與 hook／service 引用。

---

## 三、修改檔案清單

| 類型 | 路徑 |
|------|------|
| 新增 | `src/services/eventBookingService.js` |
| 新增 | `src/hooks/useEventBooking.js` |
| 新增 | `src/components/booking/EventBookingSummary.js` |
| 新增 | `src/components/booking/EventBookingFormSection.js` |
| 新增 | `src/components/booking/EventBookingModal.js` |
| 修改 | `src/components/EventDetail.js`（改為轉發至 EventBookingModal） |
| 修改 | `src/components/EventList.js`（註解更新） |
| 新增 | `docs/event-booking-modularization.md`（本文件） |

**未改動**：`EventDetail.css`、`validators.js`、`reservationTime.js`、`errorHandler.js`、`EnglishTableSurveyModal`、EventList 的 selectedEvent／handleEventClick／EventDetail 使用方式。

---

## 四、仍保留在 EventList / EventDetail 的邏輯

### EventList

- **selectedEvent** 的 state 與 **handleEventClick**：仍由 EventList 擁有，點擊日曆活動時設定 selectedEvent，並將 `event={selectedEvent}`、`onClose={() => setSelectedEvent(null)}` 傳給 EventDetail。
- **EventDetail 的掛載**：`{selectedEvent && <EventDetail show={true} event={selectedEvent} onClose={() => setSelectedEvent(null)} />}` 不變。
- 日曆、FAQ、查詢預約、活動介紹等與「預約表單內容」無關的邏輯均保留在 EventList。

### EventDetail

- **對外介面**：仍為 `EventDetail({ show, event, onClose })`，僅改為轉發至 EventBookingModal，故從 EventList 視角無變化。
- **樣式**：仍使用既有 `EventDetail.css`（由 EventBookingModal import），RWD 與按鈕／表單樣式不變。

---

## 五、後續可再拆的部分

- **多語系**：活動規定、預約時間、表單 label、按鈕、黑名單 Modal 文案等目前為中文寫死，可改為 `translations.js` 鍵值，與 MyReservations 一致。
- **EventBookingSummary 文案**：固定「114-1學期起不再提供…」可抽成常數或後台設定，方便學期更新。
- **EnglishTableSurveyModal**：若問卷流程改為全站共用，可改由 context 或上層控制顯示，再由 useEventBooking 只負責「重試預約」回調。
- **錯誤訊息**：429／503／長度錯誤等可集中到 errorHandler 或 translations，統一中英與後續維護。
- **EventList**：可進一步將 FAQ Modal、活動介紹 Modal 拆成獨立元件，縮小 EventList 體積，僅保留「日曆 + 按鈕 + 各 Modal 開關」的編排職責。
