# Admin Domain 頁面架構盤點與分批策略

## 一、App.js / AdminLayout 掛載的 admin 相關頁面型元件

### 1. 路由結構摘要

| 路由 | 掛載方式 | 元件（目前 import 路徑） |
|------|----------|---------------------------|
| `/admin` | AdminLayout 內 `<Route index>` | `AdminHome` |
| `/admin/classes` | AdminLayout 內子 Route | `ClassOverview` |
| `/admin/classes/:classId/bestep` | AdminLayout 內子 Route | `ClassBestepOverview` |
| `/admin/bestep/import` | AdminLayout 內子 Route | `BestepImportPage` |
| `/admin/violations` | AdminLayout 內子 Route | `ViolationManagement` |
| `/admin/surveys` | AdminLayout 內子 Route | `SurveyManagement` |
| `/admin/survey-settings` | AdminLayout 內子 Route | `SurveySettings` |
| `/admin/english-test` | AdminLayout 內子 Route | `EnglishTestManagement` |
| `/admin/english-test-tracking` | AdminLayout 內子 Route | `EnglishTestTracking` |
| `/admin/account` | AdminLayout 內子 Route | `AccountManagement` |
| `/admin/account/reset` | AdminLayout 內子 Route | `ForceResetPassword` |
| `/admin/classes/:classId/detail` | **獨立 Route**（不在 AdminLayout 子層） | `ClassDetail`（同 token gate） |

- **AdminLayout** 提供：標籤導航、token／role／mustResetPassword、`handleTabChange`、權限控制（`canViewReport`、`canViewSurvey`、`hasAdminRights` 等），並以 `<Outlet context={{ token, userRole, teacherLevel, username, mustResetPassword, setMustResetPassword }} />` 渲染子頁。
- **ClassDetail** 單獨一筆 Route，未用 Outlet，但同樣用 `token ? <ClassDetail /> : <Navigate to="/login" />` 保護。

### 2. 目前 App.js 的 admin 相關 import（均來自 `./components/`）

```
AdminLayout, AdminHome, ClassOverview, ViolationManagement, SurveyManagement,
SurveySettings, ClassDetail, AccountManagement, ForceResetPassword,
EnglishTestManagement, ClassBestepOverview, BestepImportPage, EnglishTestTracking
```

---

## 二、本質為 page-level 的 admin 頁面

以下元件**僅作為 Route 的 element 使用**，負責整頁內容與流程，屬 page-level：

| 元件 | 路由 | 備註 |
|------|------|------|
| **AdminHome** | `/admin` | 活動報表、學期/活動類型篩選、報表下載、大量內聯邏輯（約 2300+ 行） |
| **ClassOverview** | `/admin/classes` | 班級參與概況、表格、學期選項、導向 ClassDetail / Bestep |
| **ClassBestepOverview** | `/admin/classes/:classId/bestep` | 單一班級 BESTEP 概況，依 classId |
| **BestepImportPage** | `/admin/bestep/import` | BESTEP 出席/成績/名次匯入，表單與上傳 |
| **ViolationManagement** | `/admin/violations` | 違規管理列表與操作 |
| **SurveyManagement** | `/admin/surveys` | 問卷列表與管理 |
| **SurveySettings** | `/admin/survey-settings` | 問卷設定頁 |
| **EnglishTestManagement** | `/admin/english-test` | 培力英檢管理，組合多個 english-test/* 子元件 |
| **EnglishTestTracking** | `/admin/english-test-tracking` | 英檢長期追蹤、名冊/成績匯入、drill-down |
| **AccountManagement** | `/admin/account` | 帳號列表與管理 |
| **ForceResetPassword** | `/admin/account/reset` | 強制修改密碼頁 |
| **ClassDetail** | `/admin/classes/:classId/detail` | 單一班級詳情（獨立 Route） |

以上 12 個皆為**頁面型元件**，適合在分層策略中視為「admin pages」，由 `pages/admin/*` 作為路由入口（wrapper 或日後遷移實作）。

---

## 三、屬於 feature components / 不應直接當頁面搬的檔案

以下**未被 Route 直接掛載**，而是被上述頁面或 layout 使用，應留在 `components/`（或納入 feature 子目錄）：

### 3.1 已存在的 feature 子目錄：`components/english-test/`

| 檔案 | 用途 | 被誰使用 |
|------|------|----------|
| AdvancedFilterPanel | 篩選面板 | EnglishTestManagement |
| EnhancedTable | 資料表格 | EnglishTestManagement |
| BulkActionToolbar | 批次操作列 | EnglishTestManagement |
| DetailModalWithTabs | 詳情 Modal（分 Tab） | EnglishTestManagement |
| StatsVisualization | 統計圖表 | EnglishTestManagement |
| QuickReviewMode | 快速檢視模式 | EnglishTestManagement |
| ToastMessage | Toast 提示 | EnglishTestManagement |
| ConfirmModal | 確認彈窗 | EnglishTestManagement |
| AnalyticsSection | 分析區塊 | EnglishTestManagement |
| ColumnSelector | 欄位顯示選擇 | EnhancedTable 等 |
| PhotoViewer | 照片檢視 | 詳情/表單流程 |
| SortableTableRow | 可排序表格列 | 表格相關 |

以上皆為 **admin 英檢功能** 的 feature components，**不應**搬到 `pages/`，應保留在 `components/english-test/`（或未來統一改為 `components/admin/english-test/`）。

### 3.2 其他被頁面使用的元件（非 Route 直接掛載）

| 元件 | 用途 | 被誰使用 |
|------|------|----------|
| **LearningPartnerManagement** | 學習夥伴管理區塊 | EnglishTestManagement（內嵌於同頁） |

此為「頁面內區塊」，屬 feature，不當成獨立頁面搬遷。

### 3.3 Layout / 共用

| 元件 | 用途 |
|------|------|
| **AdminLayout** | 後台外殼、導航、Outlet、token/role 傳遞 |

保留在 `components/AdminLayout.js`，不搬入 `pages/`。

---

## 四、依賴權限／layout／token／導航較深的高風險頁面

- **useOutletContext 依賴**  
  下列頁面使用 `useOutletContext()` 取得 `token / userRole / teacherLevel / username / mustResetPassword / setMustResetPassword`，與 AdminLayout 契約緊密：
  - AdminHome  
  - ClassOverview  
  - ViolationManagement  
  - SurveyManagement  
  - SurveySettings  
  - AccountManagement  
  - ForceResetPassword  
  - EnglishTestManagement  

- **權限與導航邏輯**  
  AdminLayout 依 `userRole`、`teacherLevel` 控制標籤顯示（活動報表、班級概況、違規、問卷、英檢、帳號等）。若把上述頁面改為從 `pages/admin/*` 經 wrapper 渲染，**只要仍作為 AdminLayout 的 Outlet 子 Route**，context 不變，風險可控；若未來改為「獨立於 AdminLayout 的 Route」，則需改為從上層傳入或自行讀 token/role，屬於較大改動。

- **ClassDetail**  
  目前是**獨立 Route**（不在 AdminLayout 的 children 內），未使用 Outlet，因此也**沒有** useOutletContext。僅依賴 token gate 與 `useParams('classId')`、`useNavigate`，相對獨立，搬遷風險較低。

- **BestepImportPage**  
  僅使用 `useNavigate()`，**未使用 useOutletContext**，邏輯自洽，對 layout 依賴較低，搬遷風險低。

- **EnglishTestTracking**  
  未使用 useOutletContext，改從 `localStorage.getItem('token')` 取 token 打 API。與 AdminLayout 僅有「被放在同一組 Route 下」的關係，搬遷風險中等（需維持路由與權限一致）。

---

## 五、建議的 pages/admin/* 結構

目標：**路由入口** 統一從 `pages/admin/*` 引入，實作可暫時保留在 `components/`，由 wrapper 引用（與前台 LoginPage / SurveyPage 策略一致）。

```
src/pages/admin/
  AdminHomePage.js       → 引用 components/AdminHome
  ClassOverviewPage.js   → 引用 components/ClassOverview
  ClassBestepOverviewPage.js
  BestepImportPage.js
  ViolationManagementPage.js
  SurveyManagementPage.js
  SurveySettingsPage.js
  EnglishTestManagementPage.js
  EnglishTestTrackingPage.js
  AccountManagementPage.js
  ForceResetPasswordPage.js
  ClassDetailPage.js      → 引用 components/ClassDetail（獨立 Route）
```

- 每個檔案僅做：`export default function X() { return <XComponent />; }`，`XComponent` 從 `../../components/...` 引入。
- App.js 改為從 `./pages/admin/AdminHomePage` 等 import，Route 路徑與巢狀結構不變（仍為 AdminLayout 子 Route 或同路徑獨立 Route）。

---

## 六、建議的 admin feature 分群（目錄結構，暫不強制搬檔）

僅作為「未來分層」參考，本輪不實作目錄搬移：

| 功能群 | 建議目錄 | 內容 |
|--------|----------|------|
| 後台殼層 | `components/AdminLayout.js`（維持） | 導航、Outlet、context |
| 活動報表 | 可選 `components/admin/report/` | AdminHome 內可拆的報表區塊（未來） |
| 班級參與 | 可選 `components/admin/classes/` | ClassOverview、ClassDetail、ClassBestepOverview 共用子元件（若有抽出） |
| BESTEP | 可選 `components/admin/bestep/` | BestepImportPage 或拆出的表單/上傳元件 |
| 違規 | 可選 `components/admin/violations/` | ViolationManagement 或拆出的列表/表單 |
| 問卷後台 | 可選 `components/admin/surveys/` | SurveyManagement、SurveySettings 或拆出列表/表單 |
| 培力英檢 | **已有** `components/english-test/` | 維持；可選改為 `components/admin/english-test/` 以與其他 admin 並列 |
| 英檢追蹤 | 可選 `components/admin/english-test-tracking/` | EnglishTestTracking 若拆出圖表/表單子元件 |
| 帳號 | 可選 `components/admin/account/` | AccountManagement、ForceResetPassword 或拆出表單 |

目前僅 **english-test** 已有明確 feature 子目錄；其餘可待頁面 wrapper 穩定後，再依需求建立 `admin/*` 子目錄並漸進抽元件。

---

## 七、第一批適合低風險 wrapper migration 的 admin pages

建議**僅做 wrapper + App.js 改 import 路徑**，不搬動實作、不改 Route 結構與權限邏輯：

| 優先順序 | 頁面 | 理由 |
|----------|------|------|
| 1 | **BestepImportPage** | 無 useOutletContext，僅 useNavigate；表單與 API 自洽，依賴最少。 |
| 2 | **ClassDetail** | 獨立 Route、無 Outlet context；僅 token gate + useParams + useNavigate，改 import 即可。 |
| 3 | **EnglishTestTracking** | 無 useOutletContext，自讀 token；邏輯集中、介面單一，適合當下一個 wrapper。 |

其餘頁面（AdminHome、ClassOverview、ViolationManagement、SurveyManagement、SurveySettings、AccountManagement、ForceResetPassword、EnglishTestManagement、ClassBestepOverview）皆使用 **useOutletContext**，搬遷時需確保 wrapper 僅轉包一層，Outlet 仍由 AdminLayout 渲染，context 不變，風險仍可控，但建議排在 BestepImport、ClassDetail、EnglishTestTracking 之後，作為第二批。

---

## 八、暫不搬移或延後處理的頁面與原因

| 頁面 | 暫不搬移／延後原因 |
|------|---------------------|
| **AdminHome** | 體積大（2300+ 行）、報表與學期邏輯複雜、強依賴 useOutletContext；適合在「報表模組化」或「拆成 report feature」時一併考慮，不優先做單純路徑搬遷。 |
| **ClassOverview** | 體積大（800+ 行）、與 ClassDetail / ClassBestep 導航與參數連動、useOutletContext；先完成 ClassDetail wrapper 後再考慮。 |
| **ClassBestepOverview** | 依賴 useParams、useNavigate、可能 useOutletContext；與班級參與流程綁在一起，建議與 ClassOverview 同批或之後。 |
| **ViolationManagement** | 依賴 useOutletContext；功能獨立但屬後台核心，可列第二批。 |
| **SurveyManagement / SurveySettings** | 依賴 useOutletContext；問卷後台流程可一併規劃，列第二批。 |
| **AccountManagement / ForceResetPassword** | 依賴 useOutletContext 且與 mustResetPassword、setMustResetPassword 緊密相關；權限與密碼流程敏感，列第二批並謹慎測試。 |
| **EnglishTestManagement** | 依賴 useOutletContext、useLocation、useNavigate，且內嵌大量 english-test/* 與 LearningPartnerManagement；頁面與 feature 邊界已明確，優先做 wrapper 即可，實作搬移可與「admin 分層」一起做。 |

---

## 九、總結

- **本輪建議**：僅產出本盤點與分批策略，**不執行大規模搬檔**。若後續執行 Phase 1 admin wrapper，建議只做：  
  **BestepImportPage**、**ClassDetail**、**EnglishTestTracking** 三支的 `pages/admin/*` wrapper，並將 App.js 對應 import 改為從 `pages/admin/*` 引入，其餘維持不變。
- **後續批次**：再依序處理其餘 useOutletContext 頁面（同一 wrapper 模式），最後再視需要整理 `components/admin/*` feature 目錄與 AdminLayout 重構。
