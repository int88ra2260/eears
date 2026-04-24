# Reservation / Violation Admin Workflow — Page-level Hook 化策略

本文件為**盤點與分批方案**，不直接大改實作。目標是釐清預約詳情／違規／匯入 Excel 流程的 state／handlers 歸屬，並提出 page-level hook 化策略。

---

## A. 哪些 state 與 handlers 屬於同一條 reservation admin flow

以下皆屬於「單一活動的預約詳情 → 簽到／違規／匯入／一鍵未到／活動結束檢查」這一條 flow，且以 **currentEventId**（及 currentEvent*）為樞紐：

### 1. 預約詳情載入

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | showReservationModal | 預約詳情 Modal 開關 |
| State | reservationData | 當前活動的預約列表（raw） |
| State | currentEventId, currentEventName, currentEventDate, currentEventStartTime, currentEventType, currentEventAutoCheckCompleted | 當前開啟的活動資訊與 auto-check 狀態 |
| Handler | fetchEventReservations(eventId) | GET `/api/events/:id/reservations`，回傳 data |
| Handler | refreshCurrentEventReservations(targetEventId?) | 依 targetEventId 重載預約並更新 reservationData、currentEventDate/StartTime/AutoCheckCompleted |
| Handler | handleViewReservations(eventId, eventName, eventType, eventStartTime?) | 呼叫 fetchEventReservations → 設定 currentEvent*、reservationData → 開 Modal → fetchEventViolations(eventId) |

### 2. Reservation 搜尋 / 排序

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | reservationSearchTerm, reservationSortField, reservationSortOrder | 搜尋關鍵字、排序欄位與方向 |
| Derived | sortedReservationData | 由 reservationData + sort 欄位/方向 排序後的陣列 |
| Derived | filteredReservationData | 由 sortedReservationData + reservationSearchTerm 篩選後的陣列（給 Modal 表格用） |
| Handler | handleReservationSort(field) | 切換 sort 欄位或反轉 order |

### 3. 簽到 / 補簽到

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | checkinLoading | { [reservationId]: boolean } |
| Handler | handleCheckin(reservationId) | 權限與當日檢查 → POST `/api/events/:id/checkin` → 成功時更新 reservationData 對應筆 |

### 4. 刪除預約

| 類型 | 名稱 | 說明 |
|------|------|------|
| Handler | canCancelReservation() | 依 currentEventDate + currentEventStartTime 判斷是否在活動開始前 2 小時內，回傳 boolean |
| Handler | handleDeleteReservation(reservationId, studentId, studentName) | confirm → DELETE `/api/reservations/:id` → refreshCurrentEventReservations() |

### 5. 活動違規資料載入

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | eventViolations | 當前活動的違規記錄列表 |
| Handler | fetchEventViolations(eventId) | GET `/api/events/:id/violations` → setEventViolations |

### 6. 一鍵登記未簽到

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | batchMarkNoShowLoading | 是否處理中 |
| Handler | handleBatchMarkNoShow() | 檢查 currentEventId、未簽到人數 → confirm → POST `/api/events/:id/violations/batch-mark-no-show` → fetchEventViolations + refreshCurrentEventReservations |

### 7. 活動結束檢查

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | autoCheckLoading, currentEventAutoCheckCompleted | 是否執行中、是否已執行過 |
| Handler | handleAutoCheck() | confirm → POST `/api/events/:id/auto-check` → 成功時 setCurrentEventAutoCheckCompleted(true) + fetchEventViolations + refreshCurrentEventReservations |

### 8. 匯入刷卡 Excel 與 refresh 串接

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | showImportModal, importFile, importLoading, importError, importResult | 匯入 Modal 開關、檔案、loading、錯誤、結果 |
| Handler | openImportExcelModal() | 檢查 currentEventId → 清空 file/error/result → setShowImportModal(true) |
| Handler | closeImportExcelModal() | 非 loading 時關閉並清空 |
| Handler | handleImportFileChange(file) | setImportFile、清空 importError |
| Handler | handleImportExcel() | 驗證 currentEventId、importFile → POST `/api/reservations/:eventId/import-card-excel` → 成功 setImportResult、refreshCurrentEventReservations |

### 9. 違規登記 Modal（同一 flow）

| 類型 | 名稱 | 說明 |
|------|------|------|
| State | showViolationModal, violationData, violationLoading, violationError | 違規表單與送出狀態 |
| Handler | openViolationModal(studentId?) | 設定 violationData、清空 error、開 Modal |
| Handler | handleRecordEventViolation() | 驗證 → POST `/api/events/:id/violations` → 成功後 fetchEventViolations + refreshCurrentEventReservations、可選更新單筆 reservationData |

**共用依賴**：`token`（useAdminContext）、`showSuccessMessage` / `showErrorMessage`（errorHandler）、`isEventToday`、`hasAdminRights`。  
**無專用 useEffect**：目前僅有一個 useEffect（fetchSummary 掛載），與預約/違規無關。

---

## B. 哪些適合抽成 page-level hook

以下都適合收進**同一個 page-level hook**（例如 `useReservationAdminFlow`），因為：

- 皆以「當前活動」為中心（currentEventId 與 currentEvent*）。
- 多個操作共用 `refreshCurrentEventReservations`、`fetchEventViolations`。
- 與報表／新增編輯刪除活動／批量新增活動**無交集**，邊界清楚。

**建議納入 hook 的範圍**：

- **State**：showReservationModal、reservationData、currentEvent*、reservationSearchTerm、reservationSortField、reservationSortOrder、checkinLoading、eventViolations、batchMarkNoShowLoading、autoCheckLoading、currentEventAutoCheckCompleted、showViolationModal、violationData、violationLoading、violationError、showImportModal、importFile、importLoading、importError、importResult。
- **Derived**：sortedReservationData、filteredReservationData（或由 hook 內計算後只回傳 filtered + stats）。
- **Handlers**：fetchEventReservations、refreshCurrentEventReservations、handleViewReservations、handleReservationSort、handleCheckin、canCancelReservation、handleDeleteReservation、fetchEventViolations、openViolationModal、handleRecordEventViolation、handleBatchMarkNoShow、handleAutoCheck、openImportExcelModal、closeImportExcelModal、handleImportFileChange、handleImportExcel。

**不納入 hook**：報表 summary、活動 CRUD、批量新增、刪除活動確認、parseDateString、學期/類型篩選等（與 reservation admin flow 無關）。

---

## C. 哪些仍應保留在 AdminHome

- **頁面結構與子元件**：EventReportTable、AddEventForm、EditEventModal、DeleteEventConfirmModal、BatchAddEventsModal、ReservationDetailModal、ViolationFormModal、ImportCardExcelModal 的組裝與 JSX。
- **非預約 flow 的 state/handlers**：summary、loading、error、selectedSemester、selectedEventType、addFields、editFields、delete 相關、batch 相關、fetchSummary、handleSemesterChange、handleEventTypeChange、handleAddEvent、handleEditEvent、handleDeleteEvent、handleBatchAddEvents、parseDateString 等。
- **共用來源**：useAdminContext()、useState/useEffect 的 import、errorHandler（showSuccessMessage、showErrorMessage）、dayjs、isEventToday（若不移入 hook）。
- **若採用 hook**：AdminHome 只負責呼叫 `useReservationAdminFlow(token, { showSuccessMessage, showErrorMessage, isEventToday, hasAdminRights })`，並把回傳的 state/handlers 傳給上述 Modals 與 EventReportTable（例如 onViewReservations、reservations、onCheckIn 等）。

---

## D. 低風險第一輪 hook 化方案

建議分兩階段，降低一次改動量與回滾成本。

### 第一輪：只抽「讀取 + 當前活動」與一個入口

- **新增**：`hooks/useReservationAdminFlow.js`（或 `hooks/admin/useReservationAdminFlow.js`）。
- **本輪只移入**：
  - **State**：currentEventId、currentEventName、currentEventDate、currentEventStartTime、currentEventType、currentEventAutoCheckCompleted、reservationData、eventViolations。
  - **Handlers**：fetchEventReservations、refreshCurrentEventReservations、fetchEventViolations、**handleViewReservations**（作為「開啟預約詳情」的唯一入口，內部 set 上述 state 並 setShowReservationModal(true)）。
- **仍留 AdminHome**：showReservationModal、reservationSearchTerm、reservationSortField/Order、checkinLoading、batchMarkNoShowLoading、autoCheckLoading、violation/import 全部 state 與 handlers、sortedReservationData、filteredReservationData、handleReservationSort、handleCheckin、canCancelReservation、handleDeleteReservation、openViolationModal、handleRecordEventViolation、handleBatchMarkNoShow、handleAutoCheck、openImportExcelModal、closeImportExcelModal、handleImportFileChange、handleImportExcel。
- **介面**：hook 接受 `(token, { showSuccessMessage, showErrorMessage, isEventToday, hasAdminRights })`，回傳例如：
  - `currentEvent`, `reservationData`, `eventViolations`
  - `refreshReservations(targetEventId?)`, `fetchViolations(eventId)`, `viewReservations(eventId, eventName, eventType, eventStartTime?)`
- **AdminHome**：呼叫 hook，把 `viewReservations` 傳給 EventReportTable 的 onViewReservations；其餘預約/違規/匯入邏輯仍用既有 state/handlers。  
這樣可先驗證「載入預約 + 當前活動」集中到 hook 是否穩定，再進行第二輪。

### 第二輪：其餘 state 與 handlers 移入同一 hook

- 將 A 節所列的其餘 state、derived、handlers 全部移入 `useReservationAdminFlow`。
- AdminHome 改為只使用 hook 回傳值與回傳的 handlers，不再自己宣告上述 state/handlers。
- Modal 與 EventReportTable 的 props 改為從 hook 回傳物件解構取得（命名可與目前一致，以減少 JSX 改動）。

---

## E. 若實作 hook，建議的回傳欄位與命名

以下以「完整版」`useReservationAdminFlow` 為例（第二輪後），便於對照與實作。

```text
useReservationAdminFlow(token, {
  showSuccessMessage,
  showErrorMessage,
  isEventToday,
  hasAdminRights
})
```

**建議回傳**（命名可與現有 props 對齊，方便替換）：

- **預約詳情 Modal**
  - `showReservationModal`, `closeReservationModal`（或 `setShowReservationModal`）
  - `currentEvent`：`{ id, name, date, startTime, eventType, autoCheckCompleted }`
  - `reservationList`：即 filteredReservationData（供表格）
  - `reservationStats`：`{ total, checkedIn, noShow, violation }`（由 reservationData 計算）
  - `searchTerm`, `onSearchChange`（reservationSearchTerm / setReservationSearchTerm）
  - `sortConfig`：`{ field, order }`，`onSortChange(field)`
  - `checkinLoading`, `onCheckIn(reservationId)`
  - `canCancelReservation`, `onDeleteReservation(id, studentId, studentName)`
  - `eventViolations`
  - `batchMarkNoShowLoading`, `onBatchMarkNoShow`
  - `autoCheckLoading`, `currentEventAutoCheckCompleted`, `onAutoCheck`
  - `viewReservations(eventId, eventName, eventType, eventStartTime?)`（給 EventReportTable）

- **違規登記**
  - `showViolationModal`, `violationForm`, `violationLoading`, `violationError`
  - `openViolationModal(studentId?)`, `setViolationForm`, `submitViolation()`

- **匯入刷卡 Excel**
  - `showImportModal`, `importFile`, `importLoading`, `importError`, `importResult`
  - `openImportExcelModal()`, `closeImportExcelModal()`, `onImportFileChange(file)`, `submitImportExcel()`

- **內部 refresh（可選對外）**
  - `refreshReservations(targetEventId?)`, `fetchViolations(eventId)`：若子元件或測試需要可一併回傳。

**命名原則**：與現有 ReservationDetailModal / ViolationFormModal / ImportCardExcelModal 的 props 名稱一致，AdminHome 僅改為從 hook 解構，減少重命名。

---

## F. 風險與回滾點

- **風險**
  - **依賴陣列**：hook 若依賴 `showSuccessMessage`、`showErrorMessage`、`isEventToday`、`hasAdminRights`，需確保來自 parent 的引用穩定（或由 hook 內 useCallback 包一層），避免不必要的 re-run 或 stale closure。
  - **一次搬太多**：建議依 D 節兩輪執行，先驗證「載入 + 當前活動」再搬其餘。
  - **token 為空**：hook 內所有 API 都依賴 token，呼叫端需保證僅在已登入（token 存在）時使用該 hook。

- **回滾點**
  - **僅新增 hook、未在 AdminHome 使用**：刪除 hook 檔即可。
  - **第一輪：僅 viewReservations + currentEvent + reservationData 等從 hook 來**：回滾時還原 AdminHome 內對應的 useState 與 handleViewReservations 等，並改回直接傳給 EventReportTable；hook 可保留或刪除。
  - **第二輪：全部改用 hook**：回滾時自 hook 檔複製 state/handlers 回 AdminHome、移除 hook 呼叫，並還原各 Modal 的 props 來源。

- **建議**：每輪完成後跑既有 smoke test（預約詳情開啟、搜尋排序、簽到、刪除預約、違規登記、一鍵未到、活動結束檢查、匯入 Excel、關閉 Modal），通過後再進行下一輪。

---

以上為 reservation / violation admin workflow 的 page-level hook 化盤點與分批方案；實作時請依 D 節兩輪進行，並以 E 節回傳形狀與 F 節風險/回滾點為準。
