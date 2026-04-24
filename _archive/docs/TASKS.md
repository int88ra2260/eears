# EEARS 系統全面檢查與修復任務清單

**最後更新**: 2025-01-XX  
**狀態**: 所有 P0 和 P1 任務已完成 ✅  
**測試系統**: 已建立完整的自動化測試框架 ✅

## P0 優先級（阻斷性錯誤）

### P0-1: 修復 studentId undefined 錯誤
**問題**: `WHERE parameter "studentId" has invalid "undefined" value`
**影響範圍**:
- `/api/reservations` (POST) - 預約建立
- `/api/blacklist/recordViolation` (POST) - 違規登記
- `/api/events/:id/reservations` (GET) - 預約查詢
- `/api/events/:id/checkin` (POST) - 簽到
- `/api/events/:id/violations` (POST) - 活動違規登記
- `middlewares/checkSurvey.js` - 問卷檢查
- 所有使用 `studentId` 作為查詢條件的 API

**修復方案**:
1. 在所有 Controller 層加入參數驗證
2. 統一錯誤回應格式 `{ success: false, errorCode: 'MISSING_STUDENT_ID', message: '缺少必要參數：studentId' }`
3. 前端統一 `studentId` 來源（登入態/預約表單/URL param）

---

### P0-2: 修復 /admin 與 /admin/classes 路由重複
**問題**: 路由對應可能重複或造成維護困難
**影響範圍**:
- `frontend/src/App.js` - 路由設定
- `frontend/src/components/AdminLayout.js` - 標籤切換
- `frontend/src/components/AdminHome.js` - 活動報表頁面
- `frontend/src/components/ClassOverview.js` - 班級概況頁面

**修復方案**:
1. 確認路由設定正確（`/admin` index 路由 → AdminHome，`/admin/classes` → ClassOverview）
2. 確保標籤切換不重整頁面、不丟失 state
3. 加入 regression 測試

---

### P0-3: 實作問卷 Gate 功能
**需求**: 預約前強制問卷檢查（本學期一次）
**影響範圍**:
- `backend/middlewares/checkSurvey.js` - 問卷檢查 middleware
- `frontend/src/components/EventDetail.js` - 預約按鈕前置檢查
- `frontend/src/components/SurveyPage.js` - 問卷完成後回跳
- `frontend/src/components/AdminLayout.js` - Admin 問卷開關 UI

**修復方案**:
1. 後端 middleware 檢查問卷狀態（已填/未填）
2. 前端預約前呼叫檢查 API，若未填則導向問卷頁
3. 問卷完成後自動回跳至原預約流程
4. Admin 可在後台開關問卷 Gate

---

### P0-4: 問卷內容更新
**需求**: 同步 surveys.json，新增姓名/學號欄位
**影響範圍**:
- `frontend/public/surveys.json`
- `backend/surveys.json`
- 問卷回應模型（EnglishTableSurvey, EnglishClubSurveyResponse）

**修復方案**:
1. 確保兩個 surveys.json 同步
2. 問卷送出時以預約填寫的姓名/學號寫入回應
3. 建立資料遷移腳本（如需要）

---

### P0-5: 問卷 Excel 匯出
**需求**: Admin 後台提供問卷 Excel 匯出
**影響範圍**:
- `backend/routes/surveyRouter.js` - 新增匯出路由
- `frontend/src/components/SurveyManagement.js` - 匯出按鈕與功能

**修復方案**:
1. 後端新增 `/api/admin/surveys/:surveyId/export` 路由
2. 支援繁體中文欄位名、時間區間、依班級/活動過濾
3. 使用 ExcelJS 產生 Excel 檔案

---

### P0-6: 活動報表預約詳情排序與搜尋
**需求**: 學號排序、姓名排序、關鍵字搜尋
**影響範圍**:
- `frontend/src/components/AdminHome.js` - 預約詳情 Modal
- 已實作部分功能，需確認完整度

**修復方案**:
1. 確認排序功能完整（asc/desc）
2. 確認搜尋功能支援學號/姓名
3. 確保桌機版表格與手機版卡片都支援
4. 大資料量時使用分頁或虛擬列表

---

### P0-7: 班級參與概況
**需求**: Admin 可上傳/同步本學期各班名單，檢視統計與明細
**影響範圍**:
- `backend/controllers/adminClassesController.js`
- `frontend/src/components/ClassOverview.js`
- `frontend/src/components/ClassDetail.js`

**修復方案**:
1. 統計區塊不顯示「系所」
2. 明細中保留「系所」欄位
3. 顯示「班級名稱、任課老師」於頁面頂部
4. 支援 CSV/Excel 匯出（UTF-8、保留中文）

---

## P1 優先級（功能增強）

### P1-8: 黑名單警告彈窗
**需求**: 預約前檢查黑名單，顯示警告與規範
**影響範圍**:
- `frontend/src/components/EventDetail.js` - 預約前檢查
- `backend/routes/reservationRouter.js` - 預約 API 已有檢查，需加強前端提示

**修復方案**:
1. 前端預約前呼叫黑名單檢查 API
2. 若在黑名單，顯示警告 Modal，禁止繼續
3. 若違規累積接近門檻，顯示提醒（不阻擋）

---

### P1-9: 自動 Email 通知
**需求**: 黑名單新增/解除、違規達門檻、預約取消/改期時自動寄信
**影響範圍**:
- `backend/config/email.js` - Email 設定
- `backend/routes/blacklistRouter.js` - 已有部分實作
- `backend/routes/reservationRouter.js` - 預約取消已有部分實作

**修復方案**:
1. 以佇列/非阻塞方式寄送
2. 失敗可重試
3. Admin 可設定寄件者、樣板（支援中英）

---

### P1-10: 未到（No-Show）自動標記
**需求**: 依活動結束後未簽到/簽退規則自動標記
**影響範圍**:
- `backend/routes/eventRouter.js` - 活動結束後自動標記
- 可能需要建立 cron job 或 scheduled task

**修復方案**:
1. 活動結束後檢查未簽到預約
2. 自動標記為 No-Show
3. 與黑名單規則串接（累積違規）

---

### P1-11: FullCalendar RWD 優化
**需求**: 保留 Month + List，行動裝置優化
**影響範圍**:
- `frontend/src/components/EventList.js`
- `frontend/src/components/EventList.css`

**修復方案**:
1. 手機預設 List，桌機 DayGrid/Month
2. 事件卡片簡化 + 點擊開 modal 詳情
3. 保持藍白學術風，增加 hover/active 效果

---

### P1-12: 統一設計系統
**需求**: 色票、字級、邊角、陰影、按鈕/表格/表單風格統一
**影響範圍**:
- `frontend/src/index.css`
- `frontend/src/App.css`
- 各組件 CSS 檔案

**修復方案**:
1. 定義 CSS variables 或 SCSS variables
2. 移除重複 CSS
3. 統一按鈕/表格/表單風格

---

## 測試計畫

### 單元測試（後端）
- [x] 問卷檢查 middleware（已填/未填/切換問卷開關） - `tests/checkSurvey.test.js`
- [x] 黑名單規則、違規累積與自動標記 - `tests/blacklistRules.test.js`
- [x] `studentId` 參數缺失時的 400 回應 - `tests/studentIdValidation.test.js`

### 前端元件測試
- [x] Admin 預約詳情：排序/搜尋正確 - 已確認功能完整
- [x] 班級參與概況：統計與明細切換、上方資訊顯示正確 - 已確認功能完整

### E2E（關鍵流程）
- [x] 未填問卷→導向問卷→完成→回跳預約並成功 - `tests/integration/reservationFlow.test.js`
- [x] 黑名單使用者預約→阻擋+警告 - 已實作並測試
- [x] 報表頁搜尋排序→快速簽到流程不卡頓 - 已確認功能完整

### 自動化檢查腳本
- [x] 部署後健康檢查 - `scripts/post_deploy_check.mjs`
- [x] 覆蓋率驗證 - `scripts/verify-coverage.mjs`
- [x] BasePath 驗證 - `scripts/verify-basepath.mjs`
- [x] 一鍵健康檢查 - `scripts/health-check.mjs`

### Feature Flags 系統
- [x] Feature Flags 核心邏輯 - `utils/featureFlags.js`
- [x] Feature Flags API - `routes/featureFlagsRouter.js`
- [x] 整合到問卷 Gate - `middlewares/checkSurvey.js`

---

## 交付物

1. ✅ 代碼變更（乾淨 commit 歷史）
2. ✅ `CHANGELOG.md`
3. ✅ `docs/` 文件夾：
   - 問卷 Gate 流程圖（Mermaid）
   - 班級參與概況資料流（ER、來源/輸出欄位對照）
   - 後端 API 規格更新
4. ✅ 自動化測試腳本與 `npm run test` 成功
5. ✅ 可啟動與驗收的 dev build

