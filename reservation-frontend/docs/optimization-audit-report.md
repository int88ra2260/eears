# 系統架構審查 + 產品體驗盤點 + 可落地優化提案

本文件為「系統架構審查 + 產品體驗盤點 + 可落地優化」之完整盤點報告，涵蓋前端 reservation-frontend、後端 reservation-backend、已完成模組化成果，以及公開/後台頁面與流程。**不修改程式碼**，僅產出盤點、優先級與 roadmap，供下一輪開發規劃使用。

---

## 一、前端 UI 可優化項目

| 問題點 | 影響頁面/元件 | 具體可改善方向 | 優先級 |
|--------|----------------|----------------|--------|
| **alert() / window.confirm() 與 Toast / ConfirmModal 混用** | 多處：useEnglishTestBulkActions、useEnglishTestExport、useEnglishTestStatusUpdate、useEnglishTestDetail、useEnglishTestRegistrations、useEnglishTestRejection；AdminHome 刪除活動；useReservationAdminFlow（補簽到、刪除預約、批次未到、活動結束檢查）；BulkActionToolbar、QuickActionButtons、EnhancedTable、DetailModalWithTabs、LearningPartnerManagement、ViolationManagement、EnglishTestRegistrationPage、SurveyPage 等 | 高頻操作與錯誤回饋改為 Toast；需確認的危險操作改為 useConfirmModal（或各頁共用確認框），避免原生 alert/confirm 在無障礙與視覺上不一致 | 高 |
| **Loading 狀態呈現方式不統一** | EnglishTestManagement（spinner + 骨架）、AdminHome、EventList、ReservationLookupSection、LearningPartnerManagement、Learning Journey 等 | 訂出「全站 loading」規範：列表用 skeleton 或 spinner、按鈕用 disabled + 文案、Modal 內用 spinner；必要時抽共用 LoadingOverlay / Skeleton 元件 | 中 |
| **Empty state 缺乏統一設計** | 列表無資料時：EnglishTestManagement（圖示+文案+清除篩選）、MyReservations、EventList、admin 報表等 | 統一「無資料」區塊：圖示 + 主文案 + 次要說明 + 可選 CTA，並可抽成 EmptyState 元件 | 低 |
| **Error state 多為 alert 或內聯文字** | 表單錯誤、API 錯誤散見各頁；AdminHome 用 ErrorAlert；EnglishTestManagement 用 Toast | 表單錯誤：欄位旁 + 表單上方彙總；API 錯誤：Toast 或頁頂 Alert，避免僅 alert() | 中 |
| **後台與前台視覺階層不統一** | AdminLayout、EnglishTestManagement、AdminHome 使用 Bootstrap 類別；部分自訂 style 內聯；設計系統 design-system.css 與 index.css 並存 | 後台主要操作區（標題、工具列、表格、Modal）訂出階層：主標 h1、區塊標題、按鈕 primary/secondary、表格斑馬紋；必要時擴充 design-system 或撰寫簡短 admin 樣式指南 | 中 |
| **Modal 層次與可讀性** | DetailModalWithTabs、QuickReviewMode、Status/Rejection Modal、ConfirmModal、BulkActionToolbar 內 rejection modal；多層開啟時 z-index 與焦點管理 | 確保 Modal 有統一 max-height、overflow、焦點陷阱與 Esc 關閉；必要時引入單一 Modal 管理（stack）避免多層疊加時焦點混亂 | 中 |
| **行動版：後台表格與工具列** | EnglishTestManagement 表格橫向捲動、BulkActionToolbar、操作區按鈕群；AdminHome EventReportTable | 小螢幕下工具列可考慮收合或分頁；表格保留橫向捲動但確保第一欄（關鍵資訊）固定或優先顯示；按鈕改為 icon+文字或僅 icon 並 title 說明 | 中 |
| **卡片/按鈕/表單樣式不一致** | 首頁活動卡片、活動總覽卡片、後台卡片、各處 btn-primary/btn-secondary 混用 | 訂出「主要/次要/危險」按鈕與「卡片標題/內文」樣式，減少內聯 style，改為 class 或 design-system 變數 | 低 |

---

## 二、前端 UX 可優化項目

| 問題點 | 影響流程 | 改善建議 | 是否高頻操作優化 |
|--------|----------|----------|------------------|
| **批量操作前無二次確認（或僅 window.confirm）** | BulkActionToolbar：批量通過、設為審核中、設為報名成功、批量刪除 使用 window.confirm | 改為 useConfirmModal（或共用確認框），文案與「確認/取消」一致，並支援鍵盤與螢幕閱讀器 | 是 |
| **補簽到/刪除預約/批次未到/活動結束檢查 使用 window.confirm** | useReservationAdminFlow 內 4 處 confirm | 改為後台共用確認框（可沿用 useConfirmModal），訊息與按鈕統一 | 是 |
| **Detail 內「設為報名成功/報名失敗」仍用 window.confirm** | DetailModalWithTabs、QuickActionButtons 內多處 confirm | 改為 openConfirm 傳入 onConfirm，與單筆刪除、發信確認一致 | 是 |
| **表單錯誤僅 alert 或一次性提示** | EnglishTestRegistrationPage、EnglishTestDetailForm、EnglishTestStep3Form、LearningPartnerRegistrationPage 等長表單 | 必填/格式錯誤：欄位旁即時或送出時彙總，並 scroll 至第一個錯誤；保留 alert 僅作「彙總說明」時改為 Toast 或頁頂 Alert | 是 |
| **預約流程「選擇活動→填表→送出」是否清楚** | 公開預約：/events 日曆選場次 → EventBookingModal | 若使用者常迷路，可於流程中加上步驟指示（Step 1/2/3）或 breadcrumb；確認頁摘要是否足夠清楚 | 中（視實際使用回饋） |
| **我的預約查詢：驗證碼與取消流程** | ReservationLookupSection：輸入學號+驗證碼→取消用 window.confirm | 取消改為確認框；成功/失敗改為 Toast，避免 alert | 是 |
| **問卷完成後僅 alert** | SurveyPage 完成問卷後 alert 成功/失敗 | 改為 Toast + 可選「返回首頁」按鈕，減少阻斷感 | 中 |
| **後台「刪除活動」仍用 window.confirm** | AdminHome 刪除活動前 confirm | 改為與其他後台危險操作一致的 ConfirmModal | 是 |
| **狀態更新成功/失敗多處用 alert** | useEnglishTestStatusUpdate 成功 alert、失敗 alert | 成功改為 showToast；失敗改為 showToast('danger')，與其他英檢流程一致 | 是 |
| **匯出/載入失敗用 alert** | useEnglishTestExport、useEnglishTestDetail、useEnglishTestRegistrations、LearningPartnerManagement 等 | 改為 showToast 或頁面頂部 Alert，避免原生 alert | 是 |

---

## 三、IA（資訊架構）與導覽設計可優化項目

### 3.1 目前 IA 的優點

- 公開網站主導覽清楚：首頁、活動總覽、最新公告、我的預約、FAQ、關於、聯絡；Header 有語系切換與登入入口。
- 後台單一層級 Tab：活動報表、班級參與概況、BESTEP 匯入、違規、問卷、問卷設定、培力英檢、英檢追蹤、帳號，依權限顯示。
- 培力英檢子 IA 已模組化：個人報名 / 團體報名 / 數據分析 主標籤；個人下再分狀態子標籤，符合使用情境。
- Breadcrumb 用於部分公開頁（PageHeader），有助於脈絡。

### 3.2 目前 IA 的問題

| 問題 | 說明 |
|------|------|
| **/events 與 /activities 語意易混淆** | /activities 為「活動總覽」（English Table、English Club 等介紹與入口）；/events 為「日曆預約」。使用者可能不清楚「活動總覽」與「日曆」的差異。 |
| **PAGE_META 缺 /events** | usePageMeta 的 PAGE_META 未列 /events，該頁會用預設 title/description，SEO 與分享較弱。 |
| **後台 Tab 命名不統一** | 「活動報表」為功能、「班級參與概況」為對象、「BESTEP 匯入」為動作、「違規」為功能、「培力英檢」為產品；新進人員需時間理解。 |
| **問卷入口分散** | 首頁 QuickActions、/survey/choice、/survey/:surveyId；若從首頁「問卷」進的是 choice 頁，語意可再標示清楚（例如「學期問卷與活動問卷」）。 |
| **admin 無 breadcrumb** | 後台僅 Tab，無「管理後台 > 培力英檢報名管理」之類 breadcrumb，深層頁面（如英檢）易不知所在層級。 |

### 3.3 建議的優化方向

- **短期**：在 usePageMeta 中為 `/events` 新增專用 title/description；Header 或首頁可加簡短說明「活動總覽」vs「日曆預約」。
- **中期**：後台各 Tab 旁可加 tooltip 或簡短說明；考慮在 AdminLayout 內加一層 breadcrumb（首層固定「管理後台」，第二層為當前 Tab 名稱）。
- **長期**：若後台功能再增加，可評估「報表 / 培力英檢 / 問卷與設定 / 帳號」分區或二層導覽，目前單層 Tab 仍可接受。

### 3.4 新 IA 結構草案（可選）

- 公開：維持現狀，僅補強 /events 語意與 meta。
- 後台：現有 Tab 不變，僅加 breadcrumb；若未來有「報表總覽」「培力英檢總覽」等聚合頁，再考慮第二層。

---

## 四、前端程式架構與技術債

| 問題點 | 影響範圍 | 技術債等級 | 建議如何重構 | 是否建議立即處理 |
|--------|----------|------------|--------------|------------------|
| **AdminHome 仍過大** | components/AdminHome.js 約 900+ 行；活動報表、活動 CRUD、編輯/刪除/Batch/預約/違規/匯入 Excel 全在一頁 | 中 | 活動 CRUD（含 AddEventForm、EditEventModal、DeleteEventConfirmModal、BatchAddEventsModal）與報表 state 可抽成 useAdminEventCrud 或保留在 page 但拆成子元件；預約與違規已由 useReservationAdminFlow 負責，不需再塞進同一 hook | 延後（先觀察是否再加功能） |
| **useReservationAdminFlow 回傳項多** | 單一 hook 回傳 30+ 個欄位，介面複雜 | 中 | 可考慮拆成「列表與搜尋」「詳情 Modal」「簽到/刪除」「違規」「批次未到/活動結束檢查」「匯入 Excel」多個小 hook，由 page 組合；或維持單一 hook 但用 JSDoc 與型別明確列出契約 | 延後 |
| **BulkActionToolbar 內含 rejection 邏輯與選項** | BulkActionToolbar 自建 rejectionReasonOptions 與 rejection modal，與主頁 rejectionReasonOptions（constants）重複 | 低 | 改為從 constants 讀取 rejectionReasonOptions，或由 page 傳入；rejection 行為仍由 page 的 onBulkReject 處理，Toolbar 只負責 UI 與呼叫 | 可短期處理 |
| **部分元件仍用 window.confirm / alert** | 見第二節；多處未改用 useConfirmModal / showToast | 中 | 逐頁改：後台危險操作改為 openConfirm；錯誤/成功改為 showToast；表單錯誤改為欄位旁或彙總區 | 建議短期分批處理 |
| **rejectionApiRef 串接 Status 與 Rejection** | EnglishTestManagement 以 ref 傳遞 setShowRejectionModal / openRejectionModal 給 useEnglishTestStatusUpdate | 低 | 可選：改為先呼叫 useEnglishTestRejection 再 useEnglishTestStatusUpdate，並將 Rejection 的 openRejectionModal / setShowRejectionModal 傳入 Status；目前寫法可接受 | 延後 |
| **Design system 未統一引用** | design-system.css、index.css、各元件自訂 CSS 並存；按鈕/卡片/間距無單一變數 | 低 | 訂出少量 CSS 變數（主色、間距、圓角），新元件優先使用；舊元件逐步替換，不強求一次改完 | 延後 |
| **Shared loading / empty / error 元件缺** | 各頁自行實作 spinner、空狀態、錯誤區塊 | 低 | 抽共用 LoadingSpinner、EmptyState、ErrorAlert（admin 已有 ErrorAlert，可考慮提到 shared 或保留 admin 專用） | 延後 |

---

## 五、前端效能 / RWD / accessibility / SEO

### 5.1 效能

| 問題 | 嚴重程度 | 建議修正方式 |
|------|----------|--------------|
| 首頁與 admin 是否過重 | 中 | 對 /admin/english-test、/admin、/ 等大 route 使用 React.lazy + Suspense 做 code splitting，減少首包體積。 |
| 大表格 / 大 Modal 的 render 成本 | 低 | EnglishTestManagement 表格若筆數極多，可考慮虛擬捲動或分頁上限；DetailModalWithTabs 內容多，可確認 tab 切換時是否僅渲染當前 tab。 |
| 圖片與資源 | 低 | 若有大量證件照或圖表，可考慮 lazy load 或縮圖；靜態圖可放 CDN 或壓縮。 |

### 5.2 RWD

| 問題 | 嚴重程度 | 建議修正方式 |
|------|----------|--------------|
| 後台表格與工具列在小螢幕 | 中 | 見第一節「行動版：後台表格與工具列」；必要時提供「精簡欄位」或橫向捲動說明。 |
| Modal / filter 在小螢幕爆版 | 低 | 確保 Modal 使用 max-height + overflow、filter 區可收合或橫向捲動。 |

### 5.3 Accessibility

| 問題 | 嚴重程度 | 建議修正方式 |
|------|----------|--------------|
| 鍵盤與焦點 | 中 | 確認所有 Modal 有 focus trap、Esc 關閉、關閉後焦點回到觸發元素；Tab 導覽在表格與表單內可用 Tab 順序操作。 |
| aria 與語意 | 中 | 維持並補強：Modal 的 aria-modal、aria-labelledby；按鈕的 aria-label（尤其僅 icon 時）；表單 label 與錯誤的 aria-describedby。 |
| 對比度與焦點樣式 | 低 | 檢查主要按鈕與連結的對比度、:focus-visible 樣式是否明顯。 |

### 5.4 SEO（公開頁）

| 問題 | 嚴重程度 | 建議修正方式 |
|------|----------|--------------|
| /events 無專用 meta | 中 | 在 usePageMeta 的 PAGE_META 新增 `/events` 的 title 與 description。 |
| 公告/FAQ/about/contact 的 meta | 低 | 目前 usePageMeta 已依路徑設定；若公告詳情頁需動態 title（單篇標題），可考慮從 API 或路由參數寫入 document.title。 |
| heading 結構 | 低 | 各頁確保單一 h1、區塊用 h2/h3 階層，利於搜尋與輔助科技。 |

---

## 六、後端架構與技術債

| 問題點 | 所在檔案/模組 | 風險 | 建議的架構調整方向 |
|--------|----------------|------|---------------------|
| **englishTestRegistrationRouter 過胖** | routes/englishTestRegistrationRouter.js 約 2500+ 行 | 維護困難、單檔涵蓋列表/詳情/更新/刪除/匯出/發信/序號/檔案上傳等 | 將「列表/詳情/CRUD」「匯出 Excel/證件照」「發信」「序號重算」「檔案上傳」拆成 service 層；route 只做參數驗證與呼叫 service；必要時拆成多個 route 檔（例如 englishTestExportRouter、englishTestEmailRouter） |
| **reservationRouter 邏輯全在 route** | routes/reservationRouter.js 約 760+ 行；含預約 CRUD、黑名單查詢、刷卡 Excel 匯入、簽到等 | 同上；權限與業務邏輯混在 route | 抽 reservationService、blacklistService、cardImportService 等；route 只做 HTTP 與 middleware，業務邏輯進 service |
| **僅少數功能有獨立 controller** | 多數 route 直接寫 handler；僅 bestep、adminClasses、englishTestTracking 等有獨立 controller | 測試與重用困難；錯誤處理與回應格式易不一致 | 新功能或大改時優先採用「route → controller → service」；既有 route 可逐步把邏輯遷到 controller/service |
| **JWT 預設 secret** | middlewares/auth.js 使用 `process.env.JWT_SECRET || 'MY_SUPER_SECRET_KEY'` | 若未設環境變數，生產環境有嚴重安全風險 | 啟動時檢查 JWT_SECRET 是否存在，若無則 throw 或 refuse to start，不 fallback 預設值 |
| **錯誤回傳格式是否一致** | 各 route 或 controller 可能直接 res.status().json({ error: ... }) 或使用 createAPIError | 前端需處理多種錯誤形狀 | 統一透過 errorHandler middleware 或共用 createAPIError；文件註明錯誤回應格式 |
| **設定與 feature flags 分散** | settingsRouter、featureFlagsRouter、各 domain 自行讀設定 | 若有多處讀「報名開關」「問卷 gate」等，易不一致 | 集中由 config 或 settings service 提供，route 只讀一處 |
| **檔案上傳路徑與權限** | 英檢證件照等存於 uploads/；multer 與靜態服務在 server.js | 若未限制副檔名/類型或路徑遍歷，有風險 | 確認 multer fileFilter、檔名不包含路徑、靜態僅服務指定目錄；必要時上傳後掃毒或隔離執行 |

---

## 七、API 設計與資料庫

| 問題 | 影響範圍 | 建議修正方式 | 是否影響現有資料相容性 |
|------|----------|--------------|------------------------|
| API 路徑命名不一致 | 有 /api/...、/api/admin/...、/api/settings、/api/english-tests 等混用 | 訂出簡單規範：公開讀寫 /api/資源名、後台 /api/admin/資源名；英文連字號一致 | 若僅文件與新端點，不影響既有前端 |
| 錯誤回應格式不統一 | 有的 { error: string }，有的 { message: string }，有的帶 code | 統一為例如 { error: string, code?: string }，並在後端共用 createAPIError | 前端需一併適配，屬小改 |
| 權限檢查分散 | 各 route 自行 authMiddleware、adminMiddleware、workerMiddleware | 維持 middleware，但可整理成「路由前綴 + 共用 middleware 陣列」，避免遺漏 | 否 |
| 過度耦合前端畫面的 API | 若某 API 回傳「專為某頁表格欄位」的形狀 | 回傳以「資源」為單位，前端自行對應欄位；必要時提供 view 層參數（如 ?fields=） | 視現有 API 逐一評估 |
| DB 命名與索引 | 需檢視 migrations 與 models | 命名風格一致（例如 snake_case）；高查詢條件的欄位（如 status、eventId、createdAt）確保有索引 | 新增索引不影響既有資料；改欄位名需 migration 與相容期 |

---

## 八、安全性 / 維運 / 部署

| 問題 | 風險等級 | 建議優化方式 |
|------|----------|--------------|
| JWT_SECRET fallback 預設值 | 高 | 見第六節；啟動時強制檢查環境變數。 |
| 管理員危險操作無 audit log | 中 | 刪除預約、刪除活動、批量操作、發信、匯入 Excel 等寫入操作紀錄（誰、何時、什麼資源、動作）；可先寫 DB 或 log 檔，後續再集中查詢。 |
| 檔案上傳類型與大小 | 中 | 已有限制時維持；未限制處補上 fileFilter 與 limits；避免執行檔或腳本上傳。 |
| 批量刪除/發信/匯入無二次確認 | 中 | 前端已有多處 confirm；後端可選：對「批量刪除」「發信給全部」等要求額外參數（例如 confirmToken 或 timestamp）以降低 CSRF 誤觸，非必須。 |
| Email / queue / import 的 retry 與 timeout | 中 | 若使用 queue，設定 retry、dead letter；匯入 Excel 設 timeout 與筆數上限，避免長時間佔用。 |
| 部署與環境變數 | 低 | 建置與啟動腳本分離；敏感變數僅在執行環境注入；logging 不輸出 token 或密碼。 |

---

## 九、總結

### A. 系統目前最成熟、做得好的部分

- **EnglishTestManagement 模組化**：列表、詳情、狀態、拒絕、快速審核、批量、匯出、發信、數據分析、後台更新、確認框 均已拆成 hook 或共用 infra，責任邊界清楚，文件完整。
- **Admin 頁面 wrapper migration**：AdminHome、EnglishTestManagement 等由 pages/admin/* 統一引入，路由與元件分離清楚。
- **useReservationAdminFlow**：預約詳情、搜尋/排序、簽到、刪除、違規、批次未到、活動結束檢查、匯入 Excel 集中在一 hook，AdminHome 邏輯簡化。
- **useConfirmModal**：確認框共用，支援 async onConfirm，利於無障礙與一致性。
- **公開站 IA 與 usePageMeta**：主要公開頁有 title/description，語系與 SEO 有基本支援。
- **後台權限與 Tab 顯示**：依角色顯示活動報表、問卷等，邏輯集中於 AdminLayout。

### B. 目前最需要優先改善的 10 件事（依優先順序）

1. **後端 JWT_SECRET 強制檢查**：啟動時無 JWT_SECRET 則不啟動，避免生產環境用預設 secret。（安全）
2. **前端高頻錯誤/成功回饋改為 Toast**：useEnglishTestStatusUpdate、useEnglishTestExport、useEnglishTestDetail、useEnglishTestRegistrations、BulkActions 等處將 alert 改為 showToast，與現有英檢流程一致。（UX + 一致性）
3. **危險操作全面改用 useConfirmModal**：BulkActionToolbar 批量通過/刪除/設為成功、useReservationAdminFlow 補簽到/刪除預約/批次未到/活動結束檢查、AdminHome 刪除活動、DetailModalWithTabs/QuickActionButtons/EnhancedTable 內 window.confirm 改為 openConfirm。（UX + 無障礙）
4. **usePageMeta 新增 /events**：為 /events 設定專用 title 與 description。（SEO）
5. **後端 englishTestRegistrationRouter 拆 service**：將列表/詳情/更新/匯出/發信/序號/上傳等邏輯抽成 service，route 只做參數與呼叫。（架構）
6. **後端 reservationRouter 拆 service**：預約 CRUD、黑名單、刷卡匯入等抽成 service。（架構）
7. **BulkActionToolbar 改用 constants 的 rejectionReasonOptions**：避免與主頁重複定義，保持單一來源。（架構 + 維護）
8. **後台 breadcrumb**：AdminLayout 內增加「管理後台 > 當前 Tab」breadcrumb，降低深層頁迷失感。（IA）
9. **Loading / Empty 狀態規範與共用元件**：訂出全站 loading/empty 規範，必要時抽 LoadingSpinner、EmptyState。（UI 一致性）
10. **管理員重要操作寫入 audit log**：刪除預約、刪除活動、批量操作、發信、匯入等紀錄誰/何時/什麼動作。（安全與維運）

### C. 短期 / 中期 / 長期優化 Roadmap

| 時期 | 項目 |
|------|------|
| **短期** | (1) JWT_SECRET 強制檢查；(2) 英檢與後台高頻 alert 改 Toast；(3) 批量與危險操作改 useConfirmModal；(4) PAGE_META 補 /events；(5) BulkActionToolbar 改用 constants rejectionReasonOptions。 |
| **中期** | (6) englishTestRegistrationRouter 拆 service；(7) reservationRouter 拆 service；(8) AdminLayout breadcrumb；(9) Loading/Empty 規範與共用元件；(10) 表單錯誤改為欄位旁/彙總 + Toast。 |
| **長期** | (11) Audit log 實作；(12) 後台設計系統與樣式變數統一；(13) Code splitting（lazy route）；(14) 若有新後台功能，評估二層導覽或分區。 |

### D. 屬於 UI/UX 改善

- 第一節：alert/confirm 改 Toast/ConfirmModal、loading/empty/error 統一、後台視覺階層、Modal 層次、行動版表格與工具列、卡片按鈕表單一致性。
- 第二節：批量與危險操作確認、表單錯誤提示、預約/問卷/查詢流程優化。
- 第五節：RWD、accessibility、SEO（含 /events meta）。

### E. 屬於架構/技術債改善

- 第四節：AdminHome 瘦身、useReservationAdminFlow 介面、BulkActionToolbar 與 constants、rejectionApiRef、design system、共用 loading/empty 元件。
- 第六節：後端 route 拆 service/controller、錯誤格式統一、設定與 feature flags 集中、檔案上傳安全。

### F. 屬於後端/資料庫改善

- 第六節：englishTestRegistrationRouter、reservationRouter 拆層；JWT_SECRET；錯誤回傳格式。
- 第七節：API 命名與錯誤格式、權限檢查方式、DB 索引與命名。
- 第八節：JWT、audit log、上傳安全、queue/retry/timeout、部署與環境變數。

### G. 屬於安全/維運改善

- 第八節：JWT_SECRET、audit log、檔案上傳、危險操作確認、email/queue/import 的 retry 與 timeout、部署與 logging。

---

**說明**：本報告未修改任何程式碼，僅產出盤點、優先級與 roadmap。實際實作時請依資源與排程自短期項開始，並在變更 API 或共用元件時同步更新前端或後端契約與文件。
