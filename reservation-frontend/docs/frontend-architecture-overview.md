# 前端系統架構概覽

本文件說明 reservation-frontend 的檔案架構與運作方式，以**大學生能理解**的程度撰寫，方便新進成員或實習生快速掌握專案。

---

## 一、檔案架構整理

### 1. 總覽（src 主要結構）

```
src/
├── App.js                    # 路由總入口：決定「網址 → 哪一頁」
├── index.js                  # React 掛載點（通常不用改）
├── pages/                    # 路由對應的「頁面入口」
│   ├── HomePage.js
│   ├── EventsPage.js
│   ├── LoginPage.js
│   ├── SurveyPage.js
│   └── admin/                # 後台頁面（需登入）
│       ├── AdminHomePage.js
│       ├── EnglishTestManagementPage.js
│       ├── ClassOverviewPage.js
│       └── ...
├── components/               # 頁面裡用到的「功能積木」
│   ├── AdminHome.js          # 後台首頁實際內容
│   ├── EnglishTestManagement.js   # 培力英檢報名管理實際內容
│   ├── layout/               # 版面：PublicLayout、PageHeader、Breadcrumbs
│   ├── admin/                # 後台共用與首頁區塊
│   │   ├── home/             # 活動報表、預約詳情、違規、匯入 Excel 等
│   │   └── shared/           # 後台共用小元件（如 ErrorAlert）
│   ├── english-test/         # 英檢報名管理專用元件
│   │   ├── DetailModalWithTabs.js
│   │   ├── EnhancedTable.js
│   │   ├── BulkActionToolbar.js
│   │   ├── ConfirmModal.js
│   │   └── ...
│   ├── events/               # 活動列表、日曆、FAQ 等
│   ├── booking/              # 預約表單、摘要
│   └── ...
├── hooks/                    # 把「邏輯」收好的工具箱（可被多處使用）
│   ├── useConfirmModal.js    # 共用：確認框開關
│   ├── useEnglishTestRegistrations.js
│   ├── useEnglishTestDetail.js
│   ├── useReservationAdminFlow.js
│   └── ...
├── constants/                # 共用常數（選項、文案、設定）
│   ├── englishTestRejectionReasons.js
│   ├── translations.js
│   └── ...
├── utils/                    # 共用小工具函式
│   ├── englishTestStatus.js
│   ├── errorHandler.js
│   └── ...
├── data/                     # 靜態資料（如 FAQ、活動 slug）
├── context/                  # React Context（如語系）
└── ...
```

### 2. 各區塊用途簡表

| 區塊 | 用途 |
|------|------|
| **App.js** | 路由總入口：讀取網址，決定要渲染哪一個「頁面」；也管登入狀態、PublicLayout / AdminLayout。 |
| **pages/** | 每個檔案對應「一個網址」的入口；多數只是簡單包一層，實際內容在 components。 |
| **pages/admin/** | 後台頁面入口（/admin、/admin/english-test 等）；通常只做 `return <某個 Component />`。 |
| **components/** | 畫面上的大區塊與功能元件；例如 AdminHome、EnglishTestManagement、EventReportTable。 |
| **components/english-test/** | 培力英檢報名管理專用：表格、詳情 Modal、批量工具列、確認框、圖表等。 |
| **components/admin/home/** | 後台首頁專用：活動報表、新增/編輯/刪除活動、預約詳情、違規、匯入 Excel。 |
| **hooks/** | 可重複使用的邏輯：狀態、打 API、開關 Modal、列表載入等；讓頁面程式碼變短、責任清楚。 |
| **constants/** | 不會常改的固定值：例如拒絕原因選項、多語文案、活動類型。 |
| **utils/** | 純函式小工具：例如狀態對應成中文、錯誤處理、日期處理。 |
| **data/** | 靜態資料：例如首頁 FAQ、活動 slug 對照。 |
| **components/layout/** | 全站版面：PublicLayout（上方導覽+下方內容）、PageHeader、Breadcrumbs。 |

### 3. hooks / pages / components / utils / constants 的關係

- **pages**：只負責「這個網址要顯示誰」；通常很薄，真正內容在 **components**。
- **components**：負責「長什麼樣子」與「排哪些區塊」；需要資料或邏輯時，會去呼叫 **hooks**，或接收從 page 傳下來的 props。
- **hooks**：負責「資料怎麼拿、狀態怎麼變、按鈕按下去要做什麼」；裡面可能會用 **utils** 或 **constants**，也會打後端 API。
- **utils**：不碰 React 狀態，只做計算、格式化、錯誤處理等。
- **constants**：不放邏輯，只放選項、文案、設定值。

簡單記：**Page 決定顯示誰 → Component 負責排版與顯示 → Hook 負責邏輯與資料 → Utils/Constants 當工具與常數。**

---

## 二、用大學生能理解的方式：前端系統怎麼運作

### 1. 核心概念（用比喻）

- **App.js**：像大樓的「總櫃台」，你告訴它網址（例如 /admin/english-test），它就帶你去對應的「樓層」（頁面）。
- **Pages**：像各樓層的「入口」，一進去就對應到一個主要畫面（通常由一個大 component 負責）。
- **Components**：像頁面裡的「積木」——按鈕、表格、Modal、表單，一塊一塊組起來。
- **Hooks**：像「工具箱」——把「載入列表」、「開關 Modal」、「送出表單」這類邏輯收在裡面，哪個 component 需要就拿來用，避免每個頁面都寫一大串重複程式。
- **Utils / Constants**：像「共用規則與小工具」——例如「審核中→顯示審核中」、錯誤訊息的處理方式，到處都可能用到，所以集中放。

### 2. 實際資料流（簡化版）

```
使用者輸入網址或點連結
        ↓
App.js 根據路由決定要顯示哪一個 Page
        ↓
Page 渲染對應的 Component（例如 EnglishTestManagement）
        ↓
Component 呼叫一個或多個 Hooks，取得「資料」與「操作函式」（例如 loadRegistrations、handleViewDetail）
        ↓
Component 把資料與函式透過 props 傳給底下的子 Components（例如表格、按鈕、Modal）
        ↓
使用者按按鈕或選篩選
        ↓
Hook 提供的 handler 被呼叫（例如 handleExport、handleViewDetail）
        ↓
Handler 裡打後端 API（fetch）
        ↓
API 回傳後，Hook 更新 state（例如 setRegistrations、setShowDetailModal）
        ↓
React 重新渲染，畫面更新
```

### 3. 簡單流程圖（ASCII）

```
   使用者
      │
      ▼
┌─────────────┐
│   App.js    │  路由：網址 → 哪一頁
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Page     │  只負責「渲染哪一個大 Component」
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│  Component  │────▶│    Hooks    │  資料 + 邏輯（載入、開關、送出）
└──────┬──────┘     └──────┬──────┘
       │                   │
       │                   ▼
       │            ┌─────────────┐
       │            │ API (後端)  │
       │            └──────┬──────┘
       │                   │
       ▼                   ▼
┌─────────────┐      state 更新 → 畫面重繪
│ 子 Components│
│ (表格/按鈕/  │
│  Modal…)   │
└─────────────┘
```

### 4. 具體案例一：EnglishTestManagement 頁面怎麼運作

1. 使用者點「培力英檢報名管理」或輸入 `/admin/english-test`。
2. App.js 看到路徑在 `/admin` 底下，交給 AdminLayout；子路由 `english-test` 對應到 `EnglishTestManagement`（實際是 EnglishTestManagementPage，再渲染 components/EnglishTestManagement.js）。
3. **EnglishTestManagement** 這支 component 一載入就會：
   - 呼叫很多個 **hooks**（useEnglishTestRegistrations、useEnglishTestDetail、useEnglishTestBulkActions、useEnglishTestStatusUpdate…），拿到「報名列表」、「詳情開關」、「批量操作」、「匯出」等資料與函式。
   - 用 **constants**（例如 rejectionReasonOptions）與 **utils**（例如 getStatusText）來顯示選項與狀態文字。
4. 畫面上有：主標籤（個人/團體/數據分析）、子標籤（總報名/審核中/…）、統計卡片、表格、按鈕（匯出、發信、快速審核）、Detail Modal、確認框等，都是同一個 component 把 hooks 回傳的東西**傳給子元件**（例如 EnhancedTable、DetailModalWithTabs、ConfirmModal）。
5. 使用者按「查看詳情」→ 呼叫 hook 的 `handleViewDetail` → 打 API 取單筆 → hook 更新 `selectedRegistration`、`showDetailModal` → 畫面出現 Detail Modal。
6. 使用者按「匯出 Excel」→ 呼叫 hook 的 `handleExport` → 打匯出 API → 瀏覽器下載檔案。  
整段過程裡，「什麼時候打 API、要帶什麼參數、成功後要更新什麼」都在 **hooks** 裡；**component 只負責排版與綁定按鈕**。

### 5. 具體案例二：AdminHome / 預約管理流程怎麼運作

1. 使用者登入後進 `/admin`，App 渲染 AdminHome（透過 AdminHomePage）。
2. **AdminHome** 會：
   - 呼叫 **useReservationAdminFlow**，取得「當前活動」、「預約列表」、「搜尋/排序」、「簽到」、「刪除預約」、「違規登記」、「批次未到」、「匯入 Excel」等一整組狀態與函式。
   - 自己另外管理「活動報表」的 state（學期、活動類型、新增/編輯/刪除活動的 Modal）。
3. 畫面上有：活動報表表格（EventReportTable）、新增活動表單、編輯/刪除 Modal、預約詳情 Modal（ReservationDetailModal）、違規表單 Modal（ViolationFormModal）、匯入 Excel Modal 等；這些子元件收到的 props，很多是從 **useReservationAdminFlow** 回傳的。
4. 使用者選一個活動「查看預約」→ hook 的 `viewReservations` 被呼叫 → 打 API 載入該活動的預約 → hook 更新 `currentEvent`、`reservationData`、`showReservationModal` → 出現 ReservationDetailModal。
5. 在預約詳情裡簽到、刪除、登記違規、匯入 Excel，都是呼叫 hook 提供的 handler（handleCheckin、handleDeleteReservation、handleRecordEventViolation、handleImportExcel 等）→ 打 API → hook 更新 state → 畫面更新。

### 6. 目前架構的優點與為什麼比較好維護

- **責任清楚**：每個 hook 管一塊邏輯（列表、詳情、狀態更新、匯出…），頁面 component 主要做「組合」與「綁定」，不會變成單一超長檔案。
- **容易測試**：hooks 可以單獨測邏輯；utils/constants 可以單獨測。
- **容易重用**：例如 useConfirmModal 可以給「刪除確認」、「發信確認」共用；useEnglishTestExport 專心管匯出，之後若別頁也要匯出可參考。
- **容易找人改**：新人只要找到對應的 hook 或 component，不用在一個巨大檔案裡撈來撈去。

相較於「所有邏輯都寫在一個大 page 裡」，現在的做法是：**大 page 拆成「多個 hooks + 多個子 components」**，每個檔案變短、職責單一，後續要加功能或修 bug 時，影響範圍比較好控制。

---

## 三、與本文件的對應

- 模組化細節與 hook 清單：見 **docs/english-test-management-modularization-final.md**。
- Smoke test 項目與結果：見 **docs/smoke-test-results.md**。
