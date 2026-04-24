# EnglishTestManagement 模組化 — 最終整理與驗收文件

**本文件為目前階段的基準版本。** 若 docs/ 中另有 `english-test-management-modularization-inventory.md`、`english-test-management-modularization-phase1.md` 等，屬過程盤點與階段紀錄，可保留供參考；本文件作為模組化完成後的正式驗收與後續微調依據。

（不再新增大型重構；本文為驗收與後續微調參考。）

---

## A. 目前所有 hooks / constants / utils / shared infra 清單

### 一、Shared infra（共用，可被其他頁面使用）

| 模組 | 檔案路徑 |
|------|----------|
| **useConfirmModal** | `src/hooks/useConfirmModal.js` |

### 二、Domain hooks（培力英檢報名管理專用，依頁面呼叫順序）

| 模組 | 檔案路徑 |
|------|----------|
| useEnglishTestRegistrations | `src/hooks/useEnglishTestRegistrations.js` |
| useRegistrationSetting | `src/hooks/useRegistrationSetting.js` |
| useEnglishTestDetail | `src/hooks/useEnglishTestDetail.js` |
| useEnglishTestBulkActions | `src/hooks/useEnglishTestBulkActions.js` |
| useEnglishTestStatusUpdate | `src/hooks/useEnglishTestStatusUpdate.js` |
| useEnglishTestRejection | `src/hooks/useEnglishTestRejection.js` |
| useEnglishTestExport | `src/hooks/useEnglishTestExport.js` |
| useEnglishTestQuickReview | `src/hooks/useEnglishTestQuickReview.js` |
| useEnglishTestEmails | `src/hooks/useEnglishTestEmails.js` |
| useEnglishTestAnalytics | `src/hooks/useEnglishTestAnalytics.js` |
| useEnglishTestAdminUpdate | `src/hooks/useEnglishTestAdminUpdate.js` |

### 三、Constants

| 模組 | 檔案路徑 |
|------|----------|
| englishTestRejectionReasons | `src/constants/englishTestRejectionReasons.js` |

### 四、Utils

| 模組 | 檔案路徑 |
|------|----------|
| englishTestStatus | `src/utils/englishTestStatus.js` |

---

## B. 每個 hook 的責任邊界與主要依賴

| Hook | 責任邊界 | 主要依賴（參數傳入） |
|------|----------|----------------------|
| **useConfirmModal** | 確認框 show/config、openConfirm(config)、closeConfirm()；支援 async onConfirm | 無 |
| **useEnglishTestRegistrations** | 列表查詢、分頁、篩選、排序、統計、buildListParams、loadRegistrations | token, mainTab |
| **useRegistrationSetting** | 報名開關／團體報名開關的讀取與更新 | token, showToast |
| **useEnglishTestDetail** | 單筆詳情 Modal、上一筆/下一筆導航、關閉時還原捲動 | token, registrations, currentPage, totalPages, total, limit, buildListParams, setRegistrations, setCurrentPage, setTotalPages, setTotal, setStats, setLoading, showToast, tableContainerRef, scrollPositionRef |
| **useEnglishTestBulkActions** | 勾選列、批量通過/拒絕/設為報名成功/刪除 | token, showToast, loadRegistrations |
| **useEnglishTestStatusUpdate** | 狀態 Modal、快速更新、performStatusUpdate、與拒絕 Modal 銜接 | token, selectedRegistration, setSelectedRegistration, showToast, setRegistrations, loadRegistrations, setSelectedRows, setShowRejectionModal, showDetailModal, handleViewDetail, onOpenRejectionModal |
| **useEnglishTestRejection** | 拒絕原因 Modal、勾選原因、確認後呼叫 performStatusUpdate | pendingStatusUpdate, setPendingStatusUpdate, performStatusUpdate |
| **useEnglishTestExport** | 匯出篩選、Excel 匯出、證件照 ZIP 匯出 | token, showToast |
| **useEnglishTestQuickReview** | 快速審核模式開關、跨頁載入、下一筆、通過/拒絕 | registrations, currentPage, totalPages, buildListParams, token, showToast, setRegistrations, setTotalPages, setTotal, setStats, setCurrentPage, selectedRegistration, setSelectedRegistration, performStatusUpdate, loadRegistrations |
| **useEnglishTestEmails** | 一鍵發送報名成功/報名失敗/團體推廣信、sendingEmails | token, openConfirm, showToast |
| **useEnglishTestAnalytics** | Q21 統計載入、infoSourceStats、analyticsLoading、切到 analytics 時自動載入 | token, mainTab |
| **useEnglishTestAdminUpdate** | Detail 內後台修改報名、上傳證件照/成績/身心障礙證明 | selectedRegistration, setSelectedRegistration, registrations, setRegistrations, loadRegistrations, showToast |

---

## C. 目前仍保留在 EnglishTestManagement page 內的 state / handlers / orchestration

### State

| 保留在 page | 說明 |
|-------------|------|
| toast, setToast / showToast | 全頁共用 Toast，以 useCallback 傳入各 hook |
| mainTab | 個人/團體/數據分析主標籤；驅動 useEnglishTestRegistrations、useEnglishTestAnalytics |
| adjustingSequence | 防止調整報名成功順序時重複點擊，僅 handleAdjustSequence 使用 |
| tableContainerRef, scrollPositionRef | Detail 關閉時還原捲動，傳入 useEnglishTestDetail |
| rejectionApiRef | 串接 useEnglishTestStatusUpdate 與 useEnglishTestRejection（setShowRejectionModal / openRejectionModal） |

### Handlers（未抽成 hook）

| Handler | 說明 |
|---------|------|
| handleDelete(id) | 單筆刪除：openConfirm({ title, message, onConfirm: async () => { DELETE API, showToast, loadRegistrations } }) |
| handleAdjustSequence(id, action, targetSequence?) | 報名成功順序上/下/移動：POST adjust-sequence、更新 sortConfig、loadRegistrations、必要時重載 selectedRegistration |
| handleStatsCardClick(filterType, filterValue) | 統計卡片點擊：套用 status 或 examType 篩選、setCurrentPage(1)、成功標籤時 setSortConfig(successSequence) |

### UI orchestration（仍在本頁）

- 主標籤（個人 / 團體 / 數據分析）與子標籤（總報名/審核中/已通過/報名成功/請修正/報名失敗）的切換與條件渲染。
- 依 mainTab 渲染：團體報名 → LearningPartnerManagement；數據分析 → AnalyticsSection；個人報名 → 子標籤、StatsVisualization、操作區（匯出/發信/快速審核）、BulkActionToolbar、篩選、EnhancedTable、分頁、DetailModalWithTabs、Status/Rejection/QuickReview Modal、ConfirmModal、Toast。
- URL `?id=`：讀取 id、呼叫 handleViewDetail、清除 query。
- Esc 鍵：依序 closeConfirm → rejection → status → detail → quickReview。

---

## D. 是否仍有責任重疊、命名不一致、可再微調但非必要的部分

### 責任重疊

- **無實質重疊**。Status 與 Rejection 透過 rejectionApiRef 銜接；performStatusUpdate 僅在 StatusUpdate 實作，其餘透過參數呼叫。

### 命名一致性

- 培力英檢專用 hook 均為 **useEnglishTest***；**useRegistrationSetting** 為通用名，保留可給其他頁使用；**useConfirmModal** 為共用 infra，命名已區隔。
- 回傳命名統一為 handleXxx / showXxx / setXxx，無需調整。

### 可再微調但非必要的部分

- **rejectionApiRef**：為解決 Status 與 Rejection 的呼叫順序，以 ref 傳遞 setShowRejectionModal / openRejectionModal。若未來希望「無 ref」，可改為 page 先呼叫 Rejection 再呼叫 Status，並把 Rejection 的 openRejectionModal / setShowRejectionModal 傳入 Status；目前寫法可接受，非必要改動。
- **handleDelete 的 onConfirm**：業務邏輯（DELETE、showToast、loadRegistrations）仍在 page；若希望「刪除」也抽成 hook，可再拆 useEnglishTestDelete，但收益不大，非必要。
- **handleStatsCardClick**：僅套用篩選與 setCurrentPage/setSortConfig，保留在 page 即可，無需抽成 hook。

---

## E. 完整 smoke test checklist

### 列表與篩選

- [ ] 切換狀態標籤（總報名/審核中/已通過/報名成功/請修正/報名失敗），列表與統計數字正確更新。
- [ ] 搜尋、進階篩選、排序、分頁正常；清除篩選後列表與統計正確。

### 詳情與導航

- [ ] 點擊查看詳情 → Detail Modal 開啟；上一筆/下一筆（同頁與跨頁）正確；關閉後表格捲動位置還原。
- [ ] URL 帶 `?id=<id>` 可直開該筆詳情並清除 query。

### 狀態更新與拒絕

- [ ] 在 Detail 或列表使用快速更新（通過/請修正/報名失敗等）；選「請修正」或「報名失敗」會開拒絕原因 Modal。
- [ ] 拒絕原因 Modal：勾選原因、填寫「其他」、確認後列表與 Detail 更新正確；Esc/取消/backdrop 關閉並清除 pending。
- [ ] 狀態 Modal 選「請修正」或「報名失敗」後關閉並開啟拒絕 Modal，流程正確。

### 快速審核

- [ ] 在「審核中」點「快速審核模式」；通過/拒絕/下一筆正常；跨頁時載入下一頁並顯示第一筆；全部審完後關閉並 toast。

### 批量操作

- [ ] 勾選多筆；批量通過/拒絕/設為報名成功/刪除；列表與勾選狀態更新。
- [ ] 單筆狀態更新後，該筆自勾選中移除。

### 匯出

- [ ] 切換匯出篩選、點「匯出 Excel」；檔案下載與檔名（含狀態與日期）正確。
- [ ] 在「已通過」或「報名成功」時點「匯出證件照」；ZIP 下載與 toast 正確。

### 一鍵發信

- [ ] 一鍵發送報名成功信/報名失敗信/團體推廣信：確認框出現、點「發送」後發送中狀態與 toast 正常；點取消或 Esc 僅關閉確認框。

### 數據分析

- [ ] 切到「數據分析」標籤，Q21 統計載入並顯示；圖表/空狀態/匯出與既有行為一致。

### Detail 內更新與上傳

- [ ] 在詳情內修改報名資料、上傳證件照/成績證明/身心障礙證明；toast 與 Detail/列表更新一致。

### 單筆刪除

- [ ] 點刪除 → 確認框 → 點「刪除」後刪除成功、列表更新；點取消或 Esc 僅關閉確認框。

### 報名成功順序

- [ ] 在「報名成功」標籤下拖曳排序或上/下移；序號與列表更新；若當前開啟的 Detail 為該筆，Detail 資料更新。

### 報名開關

- [ ] 切換報名開關/團體報名開關，API 與 UI 狀態一致。

### 確認框與 Esc

- [ ] 單筆刪除、一鍵發信皆經 openConfirm 開啟；點確認執行 async onConfirm 後關閉；點取消或 Esc 關閉。
- [ ] Esc 依序關閉：confirm → rejection → status → detail → quickReview；無殘留開啟或錯關。

---

## F. 若再做一輪小型重構：最推薦候選與收益/風險評估

### 最推薦候選：**useEnglishTestSequence**

**範圍**：將「報名成功順序」相關邏輯抽成 hook。

- **移入 hook**：`adjustingSequence`、`handleAdjustSequence`（含 POST adjust-sequence、sortConfig 更新、loadRegistrations、必要時重載 selectedRegistration）。
- **依賴由參數傳入**：token, statusFilter, sortConfig, setSortConfig, loadRegistrations, selectedRegistration, setSelectedRegistration。

**收益**

- 報名成功順序與列表/詳情/篩選的耦合集中在一處，page 少一組 state + 一個較長的 handler。
- 若未來其他頁或元件需「調整序號」行為，可複用。
- 單元測試可單獨測序號邏輯。

**風險**

- **低**。handleAdjustSequence 僅被 EnhancedTable（onAdjustSequence）與 onDragEnd 呼叫，依賴明確；抽成 hook 後 page 僅改為傳入 hook 回傳的 handler。
- 需傳入 statusFilter、sortConfig、setSortConfig、selectedRegistration、setSelectedRegistration，參數稍多但可接受。

**結論**：若僅做一輪小型、低風險重構，**useEnglishTestSequence** 為最推薦候選；不做也無礙目前驗收與維護。
