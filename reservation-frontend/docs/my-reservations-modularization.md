# 我的預約頁模組化：掃描結果與拆分說明

## 一、掃描結果

### 既有行為（未改 contract）

- **查詢 API**：`GET /api/reservations/public?studentId=...&studentName=...&studentEmail=...`，回傳預約陣列。
- **取消 API**：`DELETE /api/reservations/:id`，body `{ cancellationCode }`。
- **驗證**：`validateReservationData({ studentId, studentName, studentEmail })`（utils/validators.js）。
- **可取消條件**：活動開始前 2 小時內不可取消，由 `canCancelReservation(record)` 判斷。

### 原架構

- **ReservationSearchModal**：表單（學號、姓名、Email）+ 查詢 + 結果 table + 取消流程（驗證碼、確認／返回）。
- **MyReservationsPage**：僅 PageHeader + 包一層 EventList（reservations mode），頁面語意偏「活動列表」而非「查詢預約」。

---

## 二、拆分策略

1. **服務與狀態**  
   - 新增 `reservationService.js`（search / cancel），與 API contract 一致。  
   - 新增 `useReservationLookup.js`：表單 state、records / loading / error、取消流程 state 與 `search` / `startCancel` / `cancelCancel` / `performCancel`，並 export `canCancelReservation(record)`。

2. **UI 元件邊界**  
   - **ReservationLookupSection**：受控表單（學號、姓名、Email）+ 搜尋按鈕 + 錯誤區 + 選填說明（可開關）。  
   - **ReservationResultCard**：單筆預約（活動名、日期時間）+ 可取消時「取消預約」或驗證碼表單，不可取消時「無法取消」+ 截止說明。  
   - **ReservationResultList**：依 `hasSearched` 顯示提示／空狀態／結果列表（多張 ReservationResultCard），並傳入取消相關 state 與 callbacks。

3. **頁面與 Modal**  
   - **MyReservationsPage**：改為 PageHeader + ReservationLookupSection + ReservationResultList，使用 `useReservationLookup()`，以 `hasSearched` 驅動結果區顯示；**不再使用 EventList**。  
   - **ReservationSearchModal**：保留 modal 外殼（標題、關閉、backdrop），內容改為 ReservationLookupSection + ReservationResultList，同樣使用 `useReservationLookup()`，行為與原 modal 一致。

4. **EventList**  
   - 僅加註：`/my-reservations` 現由 MyReservationsPage 專用 UI 呈現，不再渲染 EventList。  
   - reservations 相關 UI 不再由 EventList 承載。

---

## 三、修改檔案清單

| 類型 | 路徑 |
|------|------|
| 新增 | `src/services/reservationService.js` |
| 新增 | `src/hooks/useReservationLookup.js` |
| 新增 | `src/components/reservations/ReservationLookupSection.js` |
| 新增 | `src/components/reservations/ReservationLookupSection.css` |
| 新增 | `src/components/reservations/ReservationResultCard.js` |
| 新增 | `src/components/reservations/ReservationResultCard.css` |
| 新增 | `src/components/reservations/ReservationResultList.js` |
| 新增 | `src/components/reservations/ReservationResultList.css` |
| 修改 | `src/constants/translations.js`（新增 page.reservation* 中英文鍵） |
| 修改 | `src/pages/MyReservationsPage.js`（專用查詢表單 + 結果列表，移除 EventList） |
| 修改 | `src/components/ReservationSearchModal.js`（改用 ReservationLookupSection + ReservationResultList + useReservationLookup） |
| 修改 | `src/components/EventList.js`（僅加註 /my-reservations 由 MyReservationsPage 負責） |
| 新增 | `docs/my-reservations-modularization.md`（本文件） |

---

## 四、仍保留在 EventList 的邏輯

- **路由與 mode**：`getEventListMode(location.pathname)` 仍包含 `/my-reservations` → RESERVATIONS，供他處（如導覽、按鈕）判斷語意；**實際渲染** `/my-reservations` 時由路由指向 MyReservationsPage，不再渲染 EventList。
- **活動列表**：一般活動瀏覽（/events、/activities/:slug）的列表、篩選、載入、空狀態等邏輯仍保留在 EventList。
- **查詢預約按鈕**：若 EventList 或父層仍有「查詢預約紀錄」按鈕，其開啟 ReservationSearchModal 的行為不變；Modal 改為使用共用元件與 hook，不影響 contract。

---

## 五、下一輪可再拆的部分

- **ReservationSearchModal**：若希望完全移除 modal 外殼，可改為僅在需要處（例如導覽列）連結至 `/my-reservations`，由 MyReservationsPage 統一提供查詢 UI。
- **EventList**：可再精簡為純「活動列表」用途，移除 RESERVATIONS 相關分支與註解；或保留 mode 僅供「查詢預約」入口顯示與導向。
- **FAQ / 說明**：查詢說明、可取消時間、驗證碼說明等可抽成共用說明元件或 FAQ modal，供 MyReservationsPage 與 Modal 共用。
- **錯誤與空狀態**：可統一由共用元件或文案常數處理，方便多語與維運。
