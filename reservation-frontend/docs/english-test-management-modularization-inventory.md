# EnglishTestManagement 模組化整理與驗收盤點

## A. 目前已抽出的 hooks / constants / utils 清單

### Hooks（11 個，依頁面呼叫順序）

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
| useConfirmModal（共用） | `src/hooks/useConfirmModal.js` |

### Constants（1 個）

| 模組 | 檔案路徑 |
|------|----------|
| englishTestRejectionReasons | `src/constants/englishTestRejectionReasons.js` |

### Utils（1 個）

| 模組 | 檔案路徑 |
|------|----------|
| englishTestStatus | `src/utils/englishTestStatus.js` |

---

## B. 每個 hook 的責任邊界與依賴

| Hook | 責任邊界 | 主要依賴（參數傳入） |
|------|----------|----------------------|
| **useEnglishTestRegistrations** | 列表查詢、分頁、篩選、排序、統計、buildListParams、loadRegistrations | token, mainTab |
| **useRegistrationSetting** | 報名開關／團體報名開關的讀取與更新 | token, showToast |
| **useEnglishTestDetail** | 單筆詳情開關、Modal 開關、上一筆/下一筆導航、關閉時還原捲動 | token, registrations, currentPage, totalPages, total, limit, buildListParams, setRegistrations, setCurrentPage, setTotalPages, setTotal, setStats, setLoading, showToast, tableContainerRef, scrollPositionRef |
| **useEnglishTestBulkActions** | 勾選列、批量通過/拒絕/設為報名成功/刪除 | token, showToast, loadRegistrations |
| **useEnglishTestStatusUpdate** | 狀態 Modal、快速更新、performStatusUpdate、與拒絕 Modal 銜接 | token, selectedRegistration, setSelectedRegistration, showToast, setRegistrations, loadRegistrations, setSelectedRows, setShowRejectionModal, showDetailModal, handleViewDetail, onOpenRejectionModal |
| **useEnglishTestRejection** | 拒絕原因 Modal、勾選原因、確認後呼叫 performStatusUpdate | pendingStatusUpdate, setPendingStatusUpdate, performStatusUpdate |
| **useEnglishTestExport** | 匯出篩選、Excel 匯出、證件照 ZIP 匯出 | token, showToast |
| **useEnglishTestQuickReview** | 快速審核模式開關、跨頁載入、下一筆、通過/拒絕 | registrations, currentPage, totalPages, buildListParams, token, showToast, setRegistrations, setTotalPages, setTotal, setStats, setCurrentPage, selectedRegistration, setSelectedRegistration, performStatusUpdate, loadRegistrations |
| **useEnglishTestEmails** | 一鍵發送報名成功/報名失敗/團體推廣信、sendingEmails | token, openConfirm, showToast |
| **useEnglishTestAnalytics** | Q21 統計載入、infoSourceStats、analyticsLoading、切到 analytics 時自動載入 | token, mainTab |
| **useEnglishTestAdminUpdate** | Detail 內後台修改報名、上傳證件照/成績/身心障礙證明 | selectedRegistration, setSelectedRegistration, registrations, setRegistrations, loadRegistrations, showToast |

---

## C. 責任重疊、命名不一致、可再合併/拆分

### 責任重疊

- **Status 與 Rejection**：`useEnglishTestStatusUpdate` 負責「狀態更新 + 開拒絕流程」；`useEnglishTestRejection` 負責「拒絕原因 UI + 呼叫 performStatusUpdate」。兩者透過 `rejectionApiRef` 串接（setShowRejectionModal / openRejectionModal），邊界清楚，無實質重疊。
- **performStatusUpdate**：僅在 StatusUpdate 實作，Rejection、QuickReview、Bulk 皆依參數取得並呼叫，無重複實作。

### 命名一致性

- 培力英檢專用 hook 均以 **useEnglishTest** 為前綴，僅 **useRegistrationSetting** 為通用命名（用於報名開關 API），若未來其他頁也用到可保留通用名。
- 回傳命名：多為 `handleXxx`、`showXxx`、`setXxx`，與常見 React 習慣一致。

### 可再合併／拆分

- **不建議再合併**：目前每個 hook 對應單一流程（detail / status+rejection / bulk / export / emails / analytics / admin update），合併會讓單一 hook 過大、參數過多。
- **可選拆分**（非本輪）：若「調整報名成功順序」邏輯變複雜，可將 `handleAdjustSequence` + `adjustingSequence` 抽成 `useEnglishTestSequence`，目前保留在 page 可接受。

---

## D. 仍留在 EnglishTestManagement page 內的主要 state / handlers / UI orchestration

### State

| 保留在 page | 說明 |
|-------------|------|
| toast, setToast / showToast | 全頁共用 Toast，以 useCallback 傳入各 hook |
| mainTab | 個人/團體/數據分析主標籤，驅動 useEnglishTestRegistrations / useEnglishTestAnalytics |
| （已改用 useConfirmModal） | 確認框由 useConfirmModal 提供 confirmModal / openConfirm / closeConfirm |
| adjustingSequence | 防止調整順序重複點擊，僅 handleAdjustSequence 使用 |
| tableContainerRef, scrollPositionRef | Detail 關閉時還原捲動，傳入 useEnglishTestDetail |

### Handlers（未抽成 hook）

| Handler | 說明 |
|---------|------|
| handleDelete | 單筆刪除：開啟 ConfirmModal，onConfirm 內呼叫 DELETE API、showToast、loadRegistrations |
| handleAdjustSequence | 報名成功順序上/下/移動：依 statusFilter/sortConfig 與 selectedRegistration 更新列表與詳情 |
| handleStatsCardClick | 統計卡片點擊：套用 status 或 examType 篩選、setCurrentPage(1)、必要時 setSortConfig(successSequence) |

### UI orchestration（仍在本頁）

- 主標籤（個人 / 團體 / 數據分析）與子標籤（總報名/審核中/已通過/…）的切換與條件渲染。
- 團體報名 → `LearningPartnerManagement`；數據分析 → `AnalyticsSection`；個人報名 → 子標籤、StatsVisualization、BulkActionToolbar、篩選、表格、分頁、Detail/Status/Rejection/QuickReview/ConfirmModal/Toast 的渲染與綁定。
- URL `?id=` 效應：讀取 id、呼叫 handleViewDetail、清除 query。
- Esc 鍵：依優先順序關閉 confirmModal → rejection → status → detail → quickReview。

---

## E. 建議的 smoke test checklist

- [ ] **列表與篩選**：切換狀態標籤、搜尋、進階篩選、排序、分頁，列表與統計數字正確更新。
- [ ] **Detail**：點擊查看詳情 → Modal 開啟；上一筆/下一筆（同頁與跨頁）正確；關閉後捲動還原；URL 帶 `?id=` 可直開該筆並清除 query。
- [ ] **狀態更新**：在 Detail 或列表使用快速更新（通過/請修正/報名失敗等）；選「請修正」或「報名失敗」會開拒絕原因 Modal；選原因後確認，列表與 Detail 更新正確。
- [ ] **Rejection Modal**：從狀態 Modal 或快速更新進入拒絕原因；勾選原因、填寫「其他」、確認；Esc/取消/backdrop 關閉並清除 pending。
- [ ] **Quick Review**：在「審核中」點快速審核模式；通過/拒絕/下一筆；跨頁時載入下一頁並顯示第一筆；全部審完後關閉並 toast。
- [ ] **Bulk**：勾選多筆；批量通過/拒絕/設為報名成功/刪除；列表與勾選狀態更新；單筆狀態更新後該筆自勾選移除。
- [ ] **Export**：切換匯出篩選、匯出 Excel、匯出證件照（approved/success），檔案下載與檔名正確。
- [ ] **Emails**：一鍵發送報名成功信/報名失敗信/團體推廣信；確認框與發送中狀態、toast 正常。
- [ ] **Analytics**：切到數據分析標籤，Q21 統計載入並顯示；圖表/空狀態/匯出與原行為一致。
- [ ] **Detail 內更新**：修改報名資料、上傳證件照/成績/身心障礙證明；toast 與 Detail/列表更新一致。
- [ ] **單筆刪除**：點刪除 → 確認框 → 確認後刪除成功、列表更新。
- [ ] **報名成功順序**：在報名成功標籤下拖曳排序或上/下移；序號與列表更新；若當前開啟的 Detail 為該筆，Detail 資料更新。
- [ ] **報名開關**：切換報名/團體報名開關，API 與 UI 狀態一致。
- [ ] **Esc**：依序關閉 confirm（closeConfirm）、rejection、status、detail、quickReview，無殘留開著或錯關。
- [ ] **確認框**：單筆刪除、一鍵發信皆經 openConfirm 開啟；點確認執行 async onConfirm 後關閉；點取消或 Esc 關閉。

---

## F. 下一輪 shared infra：是否適合抽出 useConfirmModal

### 是否適合

- **適合**，作為下一輪「shared infra」小步重構是合理的選項。

### 收益

- **單一職責**：確認框的 show/config 與開/關邏輯集中在一處，page 與 useEnglishTestEmails 不再直接握有 setConfirmModal，改為呼叫 `openConfirm({ title, message, onConfirm, ... })`。
- **介面一致**：之後其他需要確認的操作（例如 bulk delete 若改為先確認再刪）可共用同一套 API，避免各處自己組 config。
- **易測**：openConfirm 可 mock，方便測試 handleDelete、發信流程等。
- **Esc/無障礙**：關閉邏輯可收斂在 useConfirmModal 的 closeConfirm，與現有 Esc 關閉行為對齊。

### 風險與注意

- **依賴順序**：useEnglishTestEmails 目前依賴 `setConfirmModal`，若改為依賴 `openConfirm`，需確保 useConfirmModal 先於 useEnglishTestEmails 呼叫，或由 page 將 openConfirm 傳入 useEnglishTestEmails（與現有 setConfirmModal 傳入方式類似）。
- **onConfirm 契約**：現有 useEnglishTestEmails 的 onConfirm 為 async，ConfirmModal 若未 await onConfirm 可能影響「發送中」與關閉時機；抽成 useConfirmModal 時需保留或明訂「支援 async onConfirm」。
- **影響範圍**：僅 page 的 confirmModal state 與 handleDelete、useEnglishTestEmails 兩處呼叫需改動，其餘 hooks 與 UI 不變，回滾容易。

**結論**：在不大幅拆新 workflow 的前提下，抽出 **useConfirmModal** 作為下一輪 shared infra 是合適的，收益明確、風險可控，且與目前模組化邊界相容。
