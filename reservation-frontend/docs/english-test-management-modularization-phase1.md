# EnglishTestManagement Modularization Phase 1：盤點與分批策略

本文件在「Admin wrapper migration、AdminHome modularization、useReservationAdminFlow 第一版完成」的基礎上，對 **EnglishTestManagement** 進行盤點與第一輪低風險模組化規劃。本輪僅做盤點與策略，不進行大規模改寫。

---

## A. EnglishTestManagement 目前承擔的職責分區

| 分區 | 內容摘要 | 所在位置 |
|------|----------|----------|
| **1. 頁面骨架與主標籤** | 麵包屑、標題、主 Tab（個人報名 / 團體報名 / 數據分析）、依 mainTab 切換內容 | EnglishTestManagement.js 頂層 return |
| **2. 個人報名列表** | 分頁、status 子標籤、搜尋、進階篩選、排序、載入列表 API、stats、今日新增數 | loadRegistrations、advancedFilters、sortConfig、statusFilter、currentPage |
| **3. 報名開關設定** | 個人/團體報名開關的 GET/PUT、registrationEnabled、registrationGroupEnabled | loadRegistrationSetting、handleToggleRegistration、handleToggleRegistrationGroup |
| **4. 詳情 Modal** | 單筆詳情載入、上一筆/下一筆跨頁導航、關閉時還原捲動、DetailModalWithTabs 或舊版 Modal | handleViewDetail、buildListParams、fetchPageAndOpenAt、handleNavigatePrevious/Next、handleCloseDetailModal |
| **5. 狀態審核流程** | 快速更新狀態、請修正/報名失敗原因、performStatusUpdate、拒絕原因選項、RejectionModal | handleQuickStatusUpdate、performStatusUpdate、handleConfirmRejection、handleRejectionReasonChange、handleUpdateStatus |
| **6. 詳情內編輯** | 後台修改報名資料、上傳證件照/成績證明/身心障礙證明 | handleUpdateRegistration、handleUploadRegistrationFiles |
| **7. 刪除** | 單筆刪除（ConfirmModal）、批量刪除 | handleDelete、handleBulkDelete |
| **8. 匯出** | Excel 匯出（依 exportStatusFilter）、證件照 ZIP 匯出（已通過/報名成功） | handleExport、handleExportPhotos |
| **9. 發信** | 一鍵發送報名成功/報名失敗/團體推廣信（ConfirmModal + send-status-emails API） | handleSendStatusEmails、sendingEmails |
| **10. 報名成功序號** | 上移/下移/指定序號、adjust-sequence API、success 時自動 sortConfig | handleAdjustSequence、adjustingSequence |
| **11. 批次操作** | 批量通過、批量請修正/報名失敗、批量設為報名成功、BulkActionToolbar | handleBulkApprove、handleBulkReject、handleBulkSetSuccess、selectedRows |
| **12. 快速審核模式** | 待審核列表、跨頁載入下一頁、QuickReviewMode Modal | handleOpenQuickReview、fetchNextPageForQuickReview、handleQuickReviewNext/Approve/Reject、showQuickReview、quickReviewIndex |
| **13. 數據分析 Tab** | Q21 從何得知培力英檢、loadInfoSourceStats、AnalyticsSection | infoSourceStats、analyticsLoading、mainTab === 'analytics' |
| **14. 團體報名 Tab** | 內嵌 LearningPartnerManagement，只傳 token | mainTab === 'group' |
| **15. UI 反饋與無障礙** | Toast、ConfirmModal、Esc 關閉 Modal 順序、tableContainerRef/scrollPositionRef | toast、confirmModal、useEffect keydown |
| **16. Feature Flag** | useEnhancedFeatures(token) → flags.enhancedUI、bulkOperations、flagsLoading | 開頭、條件渲染 |

依賴：`useAdminContext`（token）、`useLocation`/`useNavigate`（URL id 參數、清除 query）、`getCurrentSemester`（advancedFilters 預設學期）。

---

## B. 哪些屬於 Page Orchestration

以下適合保留在「頁面層」做編排，不拆成獨立 feature 元件（由 page 組合子元件與 hook）：

- **主 Tab 切換**：mainTab（individual / group / analytics）與對應區塊的顯示（個人報名區、LearningPartnerManagement、AnalyticsSection）。
- **URL 與 Modal 同步**：從 `location.search` 讀取 `id`，自動開啟該筆詳情並清除 query；navigate 由 page 負責。
- **子 Tab（個人報名狀態篩選）**：statusFilter 與 subTabs 的對應、點擊統計卡片套用篩選（handleStatsCardClick）。
- **依 Tab 的資料來源**：個人報名用 loadRegistrations（含 advancedFilters、sortConfig）；團體用 LearningPartnerManagement 自管；分析用 loadInfoSourceStats。
- **Modal 堆疊與 Esc 順序**：confirmModal → showRejectionModal → showStatusModal → showDetailModal → showQuickReview，由單一 useEffect keydown 處理，適合留在 page。
- **Feature Flag 分支**：flagsLoading 時顯示載入、flags.enhancedUI / bulkOperations 決定是否顯示進階表格/批次列，由 page 決定要傳給哪些子元件。

---

## C. 哪些適合抽成 Feature Components

以下已存在於 `components/english-test/`，**維持為 feature components**，僅由 page 傳 props，不塞回 page：

| 元件 | 職責 | 建議 |
|------|------|------|
| **AdvancedFilterPanel** | 日期區間、考試類型、低收入、身障證明、學期 | 保持，必要時抽共用 filter state 到 hook |
| **EnhancedTable** | 列表表格、欄位選擇、排序、選取列、行點擊開詳情 | 保持 |
| **BulkActionToolbar** | 批量通過/請修正/設為報名成功/刪除 | 保持 |
| **DetailModalWithTabs** | 詳情分 Tab、快速狀態、導航箭頭、序號調整、編輯/上傳 | 保持，可考慮再拆「詳情只讀」與「操作列」子元件 |
| **StatsVisualization** | 統計卡片、點擊篩選 | 保持 |
| **QuickReviewMode** | 快速審核 Modal、通過/拒絕/下一筆 | 保持 |
| **ToastMessage** | Toast 顯示 | 保持，或改用全站 Toast 服務 |
| **ConfirmModal** | 通用確認框 | 保持 |
| **AnalyticsSection** | Q21 圖表、空狀態、匯出 | 保持 |
| **ColumnSelector**、**PhotoViewer**、**SortableTableRow**、**QuickActionButtons** | 表格/詳情輔助 | 保持 |

**可考慮新增的 feature 元件（低風險、邊界清楚）：**

- **ExportActionsBar**：匯出 Excel 下拉（exportStatusFilter）+ 證件照按鈕 + 發信按鈕，接收 `exportStatusFilter`、`onExport`、`onExportPhotos`、`onSendEmails`、`sendingEmails`、stats 等。從 page 拆出可減少 page 的 JSX 體積。
- **RegistrationSettingSwitch**：個人/團體報名開關的 UI（若目前是內聯在 page），可獨立成小元件，接收 `registrationEnabled`、`registrationGroupEnabled`、`onToggleIndividual`、`onToggleGroup`、`isUpdatingSetting`。

---

## D. 哪些適合抽成 Hooks / Services / Shared Utilities

### D.1 建議的 Hooks

| Hook | 職責 | 回傳/參數 | 備註 |
|------|------|-----------|------|
| **useEnglishTestRegistrations** | 列表載入、分頁、statusFilter、searchTerm、advancedFilters、sortConfig、stats、todayNewCount | registrations, loading, total, totalPages, currentPage, setCurrentPage, stats, loadRegistrations, buildListParams, todayNewCount | 集中 GET /api/english-test/registrations 與 params 組裝，可取代 loadRegistrations 與多個 state |
| **useEnglishTestDetail** | 單筆詳情、上一筆/下一筆、currentRegistrationIndex、scroll 還原 | selectedRegistration, showDetailModal, setShowDetailModal, currentRegistrationIndex, handleViewDetail, handleNavigatePrevious, handleNavigateNext, canNavigatePrevious, canNavigateNext, handleCloseDetailModal, fetchPageAndOpenAt | 與 list 聯動，需 registrations、currentPage、total、limit、buildListParams |
| **useEnglishTestStatusUpdate** | 狀態更新、拒絕原因、Rejection Modal 狀態 | performStatusUpdate, handleQuickStatusUpdate, handleConfirmRejection, showRejectionModal, rejectionReasons, rejectionOther, pendingStatusUpdate, setShowRejectionModal, handleRejectionReasonChange | 依賴 token、selectedRegistration、loadRegistrations、setRegistrations、setSelectedRegistration、showToast |
| **useEnglishTestBulkActions** | 批量通過/請修正/設為報名成功/刪除、selectedRows | selectedRows, setSelectedRows, handleBulkApprove, handleBulkReject, handleBulkSetSuccess, handleBulkDelete | 依賴 token、loadRegistrations、showToast / alert |
| **useEnglishTestExport** | Excel 匯出、證件照 ZIP 匯出 | exportStatusFilter, setExportStatusFilter, handleExport, handleExportPhotos | 依賴 token、showToast |
| **useEnglishTestEmails** | 一鍵發送報名成功/報名失敗/團體推廣信 | sendingEmails, handleSendStatusEmails | 依賴 token、confirmModal 設定、showToast（或由 page 提供 confirm 與 toast） |
| **useEnglishTestQuickReview** | 快速審核：待審核列表、跨頁、下一筆、通過/拒絕 | showQuickReview, quickReviewIndex, handleOpenQuickReview, handleQuickReviewNext, handleQuickReviewApprove, handleQuickReviewReject, fetchNextPageForQuickReview | 依賴 registrations、loadRegistrations、performStatusUpdate、buildListParams、currentPage、totalPages |
| **useEnglishTestAnalytics** | 數據分析 Q21 統計 | infoSourceStats, analyticsLoading, loadInfoSourceStats | 依賴 token、mainTab |
| **useRegistrationSetting** | 個人/團體報名開關 GET＋PUT | registrationEnabled, registrationGroupEnabled, handleToggleRegistration, handleToggleRegistrationGroup, isUpdatingSetting | 依賴 token、showToast |

以上可依「先資料、再操作」順序實作：例如先 **useEnglishTestRegistrations**，再 **useEnglishTestDetail**，再 **useEnglishTestStatusUpdate**，其餘再分批。

### D.2 建議的 Services / API 層（可選）

- **englishTestApi.js**（或 `services/englishTestApi.js`）：封裝 `fetch('/api/english-test/registrations?...')`、`fetch('/api/english-test/registrations/:id')`、PUT、DELETE、bulk-update、export/excel、export/photos、send-status-emails、adjust-sequence、stats/info-source、settings 等。hook 內呼叫 api 函數，利於測試與替換。
- 若暫不引入 service 層，可維持在 hook 內直接 fetch，路徑與參數集中即可。

### D.3 Shared Utilities

- **rejectionReasonOptions**：目前重複於 EnglishTestManagement（或僅一處）、DetailModalWithTabs、QuickReviewMode。可抽成 `constants/englishTestRejectionReasons.js` 或 `utils/englishTestRejectionReasons.js`，統一匯出選項與 getRejectionReasonText。
- **getStatusText(status)**：狀態對應文字與樣式，可放在 `utils/englishTestStatus.js`，供 page、table、modal 共用。
- **getCurrentSemester**：已存在 semesterUtils，保持使用即可。

---

## E. 建議的第一輪低風險 Modularization 方案

**目標**：不砍功能、不改變 API/route、不重寫 LearningPartnerManagement 與 AnalyticsSection，只做「抽出 hook + 常數 + 小 UI 區塊」，讓 EnglishTestManagement 從 2100+ 行縮減為以「編排 + 多個 hook」為主。

**第一輪建議步驟（依序、可回滾）：**

1. **常數與共用 util**
   - 新增 `constants/englishTestRejectionReasons.js`（或 utils）：匯出 `rejectionReasonOptions`、`getRejectionReasonText`。
   - 新增 `utils/englishTestStatus.js`：匯出 `getStatusText(status)`。
   - EnglishTestManagement、DetailModalWithTabs、QuickReviewMode 改為從上述檔案 import，刪除本機重複定義。

2. **單一資料 hook：useEnglishTestRegistrations**
   - 將 `registrations, loading, currentPage, totalPages, total, statusFilter, searchTerm, advancedFilters, sortConfig, stats, todayNewCount` 與 `loadRegistrations`、`buildListParams` 移入 hook。
   - hook 接受 `token, mainTab`；回傳上述 state 與方法。
   - Page 改為使用 hook 回傳值，刪除對應 useState 與 loadRegistrations 實作。
   - 保留 `limit`、localStorage 排序讀寫可放在 hook 或 page（建議 hook 內處理 sortConfig 初始與 persist）。

3. **報名開關 hook：useRegistrationSetting**
   - 將 `registrationEnabled, registrationGroupEnabled, isUpdatingSetting` 與 `loadRegistrationSetting`、`handleToggleRegistration`、`handleToggleRegistrationGroup` 移入 hook。
   - Page 僅傳 token、showToast（或 hook 內用簡單 toast 狀態），其餘由 hook 回傳。

4. **小 UI 抽離（可選）**
   - 若「匯出 + 發信」區塊 JSX 超過約 30 行，可抽成 **ExportActionsBar**（或 **IndividualActionsBar**），接收 props 如上節 C，減少 page 行數與可讀性負擔。

5. **後續輪次（不列為第一輪必做）**
   - useEnglishTestDetail（詳情 + 導航）  
   - useEnglishTestStatusUpdate（狀態 + 拒絕原因 Modal）  
   - useEnglishTestBulkActions  
   - useEnglishTestExport、useEnglishTestEmails  
   - useEnglishTestQuickReview、useEnglishTestAnalytics  
   - 若有 API 層需求再引入 englishTestApi.js。

**風險與回滾**：第一輪僅動「常數/util + 一個 list hook + 一個 setting hook」，介面與行為不變；回滾時還原 hook 與 import，將 state/handler 貼回 page 即可。

---

## F. 建議的目錄分群

與既有 `docs/admin-domain-page-inventory.md` 對齊，建議如下：

| 類型 | 路徑 | 說明 |
|------|------|------|
| **頁面入口** | `pages/admin/EnglishTestManagementPage.js` | 已存在，僅 render `<EnglishTestManagement />`，可保留或改為直接 render 從 feature 組裝的內容 |
| **頁面級元件** | `components/EnglishTestManagement.js` | 保留於 components，作為「培力英檢管理」單頁的容器，日後若遷移為由 pages 直接組裝 feature，可改為薄 wrapper |
| **Feature 子目錄** | `components/admin/english-test/` 或維持 `components/english-test/` | 建議中長期統一為 **components/admin/english-test/**，與 admin 其他 feature（如 admin/home）對齊；短期可維持 **components/english-test/** 以減少改動 |
| **子元件** | `components/admin/english-test/AdvancedFilterPanel.js` 等 | AdvancedFilterPanel、EnhancedTable、BulkActionToolbar、DetailModalWithTabs、StatsVisualization、QuickReviewMode、ToastMessage、ConfirmModal、AnalyticsSection、ColumnSelector、PhotoViewer、SortableTableRow、QuickActionButtons |
| **Hooks** | `hooks/useEnglishTestRegistrations.js` 等 | 如上 D.1，集中於 `hooks/`，必要時可再分子檔如 `hooks/english-test/useEnglishTestRegistrations.js` |
| **常數 / Util** | `constants/englishTestRejectionReasons.js`、`utils/englishTestStatus.js` | 或置於 `utils/english-test/` 亦可 |
| **團體報名** | `components/LearningPartnerManagement.js` | 維持獨立元件，由 EnglishTestManagement 在 mainTab === 'group' 時嵌入；若日後要歸入 admin 目錄可改為 `components/admin/english-test/LearningPartnerManagement.js` |

**路由**：不變，仍為 `/admin/english-test`，由 App.js/AdminLayout 掛載 EnglishTestManagementPage 或直接掛載 EnglishTestManagement。

---

## 小結

- **A**：EnglishTestManagement 承擔 16 塊職責，從主 Tab、列表、詳情、審核、批次、匯出、發信、快速審核、分析到 Feature Flag。
- **B**：Page orchestration 包含主/子 Tab、URL 與 Modal 同步、Modal 堆疊與 Esc、Feature Flag 分支。
- **C**：既有 english-test 子元件維持為 feature components；可新增 ExportActionsBar、RegistrationSettingSwitch 等小區塊。
- **D**：建議 9 個 hook、可選 API 層、2 個共用常數/util。
- **E**：第一輪低風險為「常數 + getStatusText + useEnglishTestRegistrations + useRegistrationSetting」，必要時加 ExportActionsBar。
- **F**：目錄建議維持或漸進遷移為 `components/admin/english-test/`、hooks 集中於 `hooks/`（或 `hooks/english-test/`）。

本文件可作為 Phase 1 實作與後續 Phase 2（detail、status、bulk、export、email、quick review、analytics hooks）的依據。
