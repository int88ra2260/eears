# Admin 模組化策略：AdminHome 與 EnglishTestManagement

本文件為 **盤點與分批策略**，不做立即大規模搬檔。目標是釐清職責、劃分 page orchestration / feature components / hooks-services，並提出低風險第一輪方案。

---

## A. 這兩個頁面目前承擔的職責

### AdminHome（約 2336 行）

| 職責區塊 | 說明 |
|----------|------|
| **活動報表** | 學期／活動類型篩選、`/api/reports/summary`、表格顯示、匯出總覽報表 |
| **活動 CRUD** | 新增單筆活動、編輯活動、刪除活動（含密碼確認）、`/api/events` 系列 |
| **批量新增活動** | 多筆活動表單、批量日期選擇、`/api/events/batch`、parseDateString 等 |
| **預約詳情** | 查看單一活動預約列表、搜尋/排序、`/api/events/:id/reservations` |
| **簽到** | 單筆簽到、`/api/events/:id/checkin` |
| **匯入刷卡 Excel** | Modal、上傳、`/api/reservations/:eventId/import-card-excel` |
| **違規** | 違規登記 Modal、列表、批量標記未到、`/api/events/:id/violations`、auto-check |
| **權限與 UI 分支** | 依 `userRole`／`teacherLevel` 顯示：匯出總覽、新增/編輯/刪除、匯入 Excel、各按鈕 |
| **內聯工具** | `ErrorAlert`、`getSemesterInfo`、`getSemesterOptions`、`getEventTypeOptions`、`parseDateString`、`isEventToday`、`canCancelReservation` 等，全部寫在同一檔案 |

**依賴**：`useOutletContext`（token, userRole, teacherLevel）、`dayjs`、`errorHandler`（safeAPICall, showErrorMessage, showSuccessMessage）。**未使用** `semesterUtils`（學期邏輯自幹）。

### EnglishTestManagement（約 2140 行）

| 職責區塊 | 說明 |
|----------|------|
| **Tab 編排** | 主 Tab：個人報名 / 團體報名 / 數據分析；個人底下子 Tab：審核中／已通過／請修正／報名成功／報名失敗等（依 statusFilter + stats） |
| **個人報名列表** | 分頁、篩選（status/search/進階）、排序（含 localStorage 持久化）、`loadRegistrations`、`buildListParams`、與 API 對接 |
| **報名開關** | 個人報名／團體報名開關、`/api/settings/english-test-registration-enabled`、`-group-enabled` |
| **匯出／發信** | 匯出 Excel、匯出證件照、一鍵發送報名成功/失敗/團體推廣信 |
| **快速審核** | QuickReviewMode、上一筆/下一筆、DetailModalWithTabs、狀態更新、駁回原因 |
| **團體報名** | 整塊委派給 `<LearningPartnerManagement token={token} />` |
| **數據分析** | `<AnalyticsSection>`（Q21 從何得知培力英檢） |
| **Feature Flag** | `useEnhancedFeatures(token)` 控制 enhancedUI、bulkOperations |
| **URL 與 Modal** | `location.search` 的 `id` 開詳情、Esc 關閉層級、捲動位置還原 |

**依賴**：`useOutletContext`（token）、`useLocation`、`useNavigate`、`useEnhancedFeatures`、`getCurrentSemester`（semesterUtils）。**子元件**：`AdvancedFilterPanel`、`EnhancedTable`、`BulkActionToolbar`、`DetailModalWithTabs`、`StatsVisualization`、`QuickReviewMode`、`ToastMessage`、`ConfirmModal`、`AnalyticsSection`、`LearningPartnerManagement`。

---

## B. 哪些部分屬於 page orchestration

- **狀態與 URL**：主 Tab（mainTab）、子 Tab（statusFilter）、分頁、篩選/排序、Modal 開關、選中筆、toast/confirm 等，由「頁面」持有並決定何時重載、何時開關 Modal。
- **權限與流程分支**：依 `userRole`／`teacherLevel`／`hasAdminRights` 決定顯示哪些區塊（例如 AdminHome 的匯出總覽、新增表單、匯入 Excel）；EnglishTestManagement 的開關與按鈕顯示。
- **資料取得時機**：何時呼叫 `loadRegistrations`、`fetchSummary`、`loadRegistrationSetting`、analytics；與 Tab 切換、篩選變更、分頁、設定的聯動。
- **子區塊的組裝**：主 Tab → 個人 / 團體 / 分析；個人 → 子 Tab + 操作列 + 開關 + 表格 + 快速審核；團體 → 整塊 LearningPartnerManagement；分析 → AnalyticsSection。
- **Modal 與導航**：Detail 開關、上一筆/下一筆、Esc 層級、URL id 參數的同步。

以上應保留在「頁面層」或抽成 **page-level hooks**（見 D），不拆成純 UI 元件。

---

## C. 哪些部分適合抽成 feature components

### AdminHome

| 區塊 | 建議抽成元件 | 說明 |
|------|--------------|------|
| 活動報表表格 | `EventReportTable` | 學期/類型篩選 + 表格 + 依角色顯示操作鈕（匯出/查看預約/修改/刪除），接收 summary、handlers、權限旗標 |
| 新增活動表單 | `AddEventForm` | 單筆新增表單（含「其他」自訂類型）、錯誤區、onSuccess 回呼 |
| 批量新增活動 | `BatchAddEventsModal` | Modal + 多筆表單 + 日期選擇/parseDateString、送出、結果顯示 |
| 編輯活動 | `EditEventModal` | 編輯表單 Modal、送出、錯誤 |
| 刪除確認 | `DeleteEventConfirmModal` | 密碼確認、刪除 API、關閉 |
| 預約詳情 | `ReservationDetailModal` | 預約列表、搜尋/排序、簽到、匯入 Excel 鈕、違規區、批量未到、auto-check（可再細拆子區塊） |
| 匯入刷卡 Excel | `ImportCardExcelModal` | 上傳、進度、結果 |
| 違規登記 | `ViolationFormModal` | 表單、送出、關閉 |

**共用小元件**：`ErrorAlert` 可抽到 `components/admin/shared/` 或 `utils`。

### EnglishTestManagement

| 區塊 | 現狀 | 建議 |
|------|------|------|
| 個人報名 Tab 內容 | 大量 JSX 內聯 | 抽成 `IndividualRegistrationTab`：子 Tab、操作列（匯出/發信/快速審核）、開關、篩選、表格、Stats 等，由頁面傳入 state + handlers |
| 主 Tab 列 | 內聯 | 可保留在頁面或抽成 `EnglishTestTabs`（僅 Tab 按鈕 + 依 mainTab 渲染個人/團體/分析） |
| 團體報名 | `<LearningPartnerManagement />` | 已是獨立元件，保留；可考慮搬至 `pages/admin/english-test/` 或 `components/admin/english-test/` |
| 數據分析 | `<AnalyticsSection>` | 已是 feature component，保留 |

**english-test/* 既有子元件**：AdvancedFilterPanel、EnhancedTable、BulkActionToolbar、DetailModalWithTabs、StatsVisualization、QuickReviewMode、ToastMessage、ConfirmModal、AnalyticsSection、ColumnSelector、PhotoViewer、SortableTableRow、QuickActionButtons — 維持為 feature components，不與頁面邏輯混在一起。

---

## D. 哪些部分適合抽成 hooks / services / shared admin utilities

### Hooks

| Hook | 用途 | 備註 |
|------|------|------|
| `useAdminContext` | 從 `useOutletContext()` 取出 token、userRole、teacherLevel、username、mustResetPassword、setMustResetPassword，並導出 isAdmin、isExecutive、hasAdminRights 等 | 多個 admin 頁面重複權限判斷，可共用 |
| `useEventReportSummary` | 學期/類型、fetchSummary、loading/error、handleSemesterChange、handleEventTypeChange | AdminHome 報表區專用，減少頁面內 fetch 邏輯 |
| `useEnglishTestRegistrations` | 分頁、篩選、排序、loadRegistrations、buildListParams、stats、registrationEnabled 開關載入與更新 | 將 EnglishTestManagement 的列表與開關邏輯集中，頁面只做 Tab 與 Modal 編排 |

### Services（可選，低優先）

| Service | 用途 |
|---------|------|
| `adminEventService` | `/api/events`、`/api/events/batch`、`/api/reports/summary`、`/api/reports/export` 等，接受 token，回傳 Promise |
| `englishTestAdminService` | `/api/english-test/registrations`、settings、export、發信等，集中 API 呼叫與錯誤處理 |

先以 **hooks 封裝「取得資料 + 狀態」**，API 仍可在 hook 內 `fetch`；若日後要統一錯誤處理或 mock，再抽 service 層。

### Shared admin utilities

| 項目 | 說明 |
|------|------|
| **學期／活動類型選項** | `getSemesterOptions`、`getEventTypeOptions`、`getSemesterInfo`（AdminHome 自幹）可與 `utils/semesterUtils` 或新檔 `utils/adminReportUtils.js` 整合，避免多處重複定義 |
| **ErrorAlert** | 共用元件，放 `components/admin/shared/ErrorAlert.js` 或 `components/ui/` |
| **權限常數** | 如 `ROLE_ADMIN`、`ROLE_TEACHER` 等可集中成常數，供 `useAdminContext` 或各頁使用 |

---

## E. 建議的目錄分群

```
src/
├── pages/
│   └── admin/
│       ├── AdminHomePage.js          # 現有 wrapper
│       ├── EnglishTestManagementPage.js
│       ├── home/                      # 第一輪可選：只抽共用與工具
│       │   ├── index.js               # 再 export AdminHomePage 或直接放頁面
│       │   ├── AdminHomeView.js       # 未來：從 components/AdminHome 遷入並拆子元件
│       │   ├── components/            # 未來：EventReportTable, AddEventForm, ...
│       │   └── hooks/
│       │       └── useEventReportSummary.js
│       └── english-test/
│           ├── index.js               # 再 export EnglishTestManagementPage
│           ├── EnglishTestManagementView.js  # 未來：從 components 遷入
│           ├── components/            # 可將現有 components/english-test/* 搬入或保留並 re-export
│           │   ├── AdvancedFilterPanel.js
│           │   ├── EnhancedTable.js
│           │   └── ...
│           ├── LearningPartnerManagement.js  # 僅此頁用，可選搬入
│           └── hooks/
│               └── useEnglishTestRegistrations.js
├── components/
│   └── admin/
│       └── shared/
│           ├── ErrorAlert.js
│           └── (未來) AdminRoleBadge、權限相關小元件
├── hooks/
│   ├── useAdminContext.js            # 共用
│   └── useEnhancedFeatures.js        # 既有，保留
└── utils/
    ├── semesterUtils.js               # 既有
    └── adminReportUtils.js            # 可選：getSemesterInfo、getEventTypeOptions 等
```

**第一輪不強制搬動**：可先只新增「不會破壞現有 import」的檔案，例如：

- `hooks/useAdminContext.js`（新 hook，各頁逐步改用）
- `components/admin/shared/ErrorAlert.js`（從 AdminHome 複製一份，AdminHome 改 import）
- `utils/adminReportUtils.js`（可選：只放 getSemesterInfo、getEventTypeOptions，AdminHome 改從此 import）

`components/AdminHome.js` 與 `components/EnglishTestManagement.js` 路徑可暫時不變，僅內部改為使用新 hook/utils/ErrorAlert，以降低風險。

---

## F. 低風險的第一輪 modularization 方案

### 原則

- **不搬動 Route、不改 path、不拆大檔為多檔**：僅在現有檔案內抽「可替換」的小單元。
- **可回滾**：每步都是「新增檔案 + 原檔案改一處 import/呼叫」，必要時還原單一檔案即可。
- **先抽「無狀態／純工具」再抽「狀態邏輯」**。

### 建議步驟（依序、可只做部分）

1. **抽 ErrorAlert**
   - 新增 `components/admin/shared/ErrorAlert.js`，內容從 AdminHome 複製。
   - AdminHome 改為 `import ErrorAlert from '../admin/shared/ErrorAlert'`，刪除區內定義。
   - 若有其他 admin 頁也用類似錯誤區，可一併改用。

2. **抽學期／活動類型工具（可選）**
   - 新增 `utils/adminReportUtils.js`，移入 `getSemesterInfo`、`getSemesterOptions`、`getEventTypeOptions`（或與 semesterUtils 整合）。
   - AdminHome 改為從該檔 import，刪除區內定義。
   - 好處：學期邏輯單一來源，之後 ClassOverview 等若需一致可共用。

3. **抽 useAdminContext**
   - 新增 `hooks/useAdminContext.js`：`useOutletContext()` 取 context，計算 isAdmin、isExecutive、hasAdminRights、canImportExcel 等，回傳物件。
   - AdminHome 改為 `const { token, userRole, hasAdminRights, canImportExcel, ... } = useAdminContext()`，刪除區內 actualUserRole、isAdmin、isTeacher 等計算。
   - 其他 admin 頁（含 EnglishTestManagement）若也有類似判斷，可逐步改用。

4. **EnglishTestManagement：不拆檔，僅整理**
   - 第一輪**不**把個人報名區抽成 `IndividualRegistrationTab`（會動到大量 props 與 state）。
   - 可做：在檔案頂部用註解標出「區塊邊界」（報表、開關、表格、Modal、團體、分析），方便之後拆檔時對照。
   - 若有重複的「依 status 顯示按鈕」邏輯，可抽成小型 helper 函數（同檔案內），不新增檔案。

5. **不做的第一輪**
   - 不搬動 `components/english-test/*` 目錄。
   - 不搬動 `LearningPartnerManagement`。
   - 不新增 `EventReportTable`、`AddEventForm` 等大塊 feature components（留第二輪以後）。
   - 不抽 `useEventReportSummary` / `useEnglishTestRegistrations`（除非已有一頁穩定用 useAdminContext 且想再減一層複雜度）。

### 驗收

- 現有功能與路由不變。
- 通過現有 smoke test（admin 首頁、報表、活動新增/編輯/刪除、預約詳情、簽到、匯入 Excel、違規；英檢個人/團體/分析、開關、匯出、快速審核、Detail Modal）。
- Lint 通過，無新增 console 錯誤。

---

## 附：與這兩頁直接相關的子元件與 hooks 清單

| 類型 | 名稱 | 使用處 |
|------|------|--------|
| 子元件 | AdvancedFilterPanel | EnglishTestManagement |
| 子元件 | EnhancedTable | EnglishTestManagement |
| 子元件 | BulkActionToolbar | EnglishTestManagement |
| 子元件 | DetailModalWithTabs | EnglishTestManagement |
| 子元件 | StatsVisualization | EnglishTestManagement |
| 子元件 | QuickReviewMode | EnglishTestManagement |
| 子元件 | ToastMessage | EnglishTestManagement |
| 子元件 | ConfirmModal | EnglishTestManagement |
| 子元件 | AnalyticsSection | EnglishTestManagement |
| 子元件 | ColumnSelector | EnhancedTable |
| 子元件 | QuickActionButtons | EnhancedTable |
| 子元件 | SortableTableRow | EnhancedTable |
| 子元件 | PhotoViewer | DetailModalWithTabs, QuickReviewMode |
| 子元件 | LearningPartnerManagement | EnglishTestManagement（團體 Tab） |
| Hook | useEnhancedFeatures | EnglishTestManagement |
| 工具 | getCurrentSemester, SEMESTER_OPTIONS | EnglishTestManagement, AdvancedFilterPanel, LearningPartnerManagement |
| 工具 | safeAPICall, showErrorMessage, showSuccessMessage | AdminHome |

以上為 AdminHome 與 EnglishTestManagement 的結構重整策略與低風險第一輪方案；後續可依實際需求做第二輪（抽 feature components、搬目錄、抽 useEventReportSummary / useEnglishTestRegistrations）。
