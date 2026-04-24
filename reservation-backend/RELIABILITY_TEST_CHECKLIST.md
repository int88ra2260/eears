# EEARS Reliability Test Checklist（Phase 6.6）

## 前置條件
1. 僅限開發/測試環境使用（`process.env.NODE_ENV !== 'production'`）。
2. 使用方式：在網址加上 `?reliabilityFault=...`。
3. 停用方式：移除 query param（或清除 localStorage：`reliabilityFault`）。

## Fault 開關（reliabilityFault）
- `renderCrash`：觸發 React render crash（應由 ErrorBoundary 接住）
- `eventsApi500`：模擬 Events API 500
- `eventsNetworkError`：模擬 Events network error
- `eventsTimeout`：模擬 Events timeout
- `announcementsApi500`：模擬 Announcements API 500
- `announcementsNetworkError`：模擬 Announcements network error
- `announcementsTimeout`：模擬 Announcements timeout
- `reservationsApi500`：模擬 MyReservations 查詢 API 500
- `reservationsNetworkError`：模擬 MyReservations network error
- `reservationsTimeout`：模擬 MyReservations timeout
- `healthFail`：模擬 `/api/health` 失敗（Dashboard 系統狀態異常，但 KPI/列表不應全壞）
- `healthSlowDb`：模擬 DB 延遲偏慢/異常（Dashboard DB 紅；整體應異常）
- `healthSlowEmail`：模擬 Email 延遲偏慢/異常（Dashboard 只能部分異常，不應被判成全掛）

## 驗證場景
1. React render crash
   - 操作：`/events?reliabilityFault=renderCrash`
   - 預期：顯示 `SystemErrorPage` fallback（不白畫面），可點 CTA。

2. API 500
   - 操作：
     - ` /events?reliabilityFault=eventsApi500`
     - ` /announcements?reliabilityFault=announcementsApi500`
     - ` /my-reservations?reliabilityFault=reservationsApi500`
   - 預期：
     - 區塊顯示「載入失敗」且有 `重新嘗試`。
     - 顯示 requestId（若模擬錯誤已含 requestId，UI 會顯示「錯誤識別碼：...」或 tooltip 中顯示）。
     - 不顯示 raw error/stack。

3. Network error
   - 操作：`/events?reliabilityFault=eventsNetworkError`
   - 預期：顯示「網路異常」語意，且可透過 retry 恢復（恢復方式：移除 fault 或回復網路）。

4. Timeout
   - 操作：`/events?reliabilityFault=eventsTimeout`
   - 預期：顯示「請求超時」語意；不會永久 loading。

5. Health API failure
   - 操作：`/admin/dashboard?reliabilityFault=healthFail`
   - 預期：Dashboard「系統狀態」顯示異常，其他 KPI 卡/區塊仍可正常顯示或至少不全壞。

6. DB / email slow
   - 操作：
     - `/admin/dashboard?reliabilityFault=healthSlowDb`
     - `/admin/dashboard?reliabilityFault=healthSlowEmail`
   - 預期：
     - DB slow：整體異常（紅）
     - Email slow：整體部分異常（黃），不會被誤判成全掛

## requestId 驗證流程（Admin）
1. 當 UI 顯示 requestId 時，點「查看操作紀錄（帶 requestId）」或使用網址：
   - `/admin/logs?requestId=YOUR_REQUEST_ID`
2. 預期：`AdminAuditLogsPage` 自動以 requestId 開啟對應 request logs modal。

