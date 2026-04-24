# 114-1 和 114-2 學期系統盤點報告

**盤點日期**: 2026-02-03  
**盤點目的**: 確認下週一（114-2學期）正式開放前，系統對兩個學期的支援狀況

---

## 📋 盤點項目總覽

| 功能模組 | 114-1 支援 | 114-2 支援 | 學期區分方式 | 狀態 |
|---------|-----------|-----------|------------|------|
| 班級參與概況 | ✅ | ✅ | `semester` 欄位 | ✅ 完整支援 |
| 培力個人報名 | ✅ | ✅ | `semester` 欄位 | ✅ 完整支援 |
| 培力團體報名 | ⚠️ | ⚠️ | 透過個人報名關聯 | ⚠️ 間接支援 |
| BESTEP 出席 | ✅ | ✅ | `semester` 欄位 | ✅ 完整支援 |
| BESTEP 成績 | ✅ | ✅ | `semester` 欄位 | ✅ 完整支援 |

---

## 1. 📚 班級參與概況 (Class Overview)

### 資料庫結構
- **表**: `classes`, `class_memberships`
- **學期欄位**: `semester` (STRING, 如 '114-1', '114-2')
- **唯一約束**: `(semester, classId, studentId)` 在 `class_memberships`

### 後端 API
- **路由**: `GET /api/admin/classes/overview`
- **參數**: `semester` (query parameter, 預設 '114-1')
- **支援學期**: 114-1, 113-2, 114-2, 115-1, 115-2
- **檔案**: `reservation-backend/controllers/adminClassesController.js`

### 前端頁面
- **元件**: `ClassOverview.js`
- **學期選單**: 包含 114-1, 113-2, 114-2, 115-1, 115-2
- **預設學期**: 114-1
- **檔案**: `reservation-frontend/src/components/ClassOverview.js`

### ✅ 狀態確認
- ✅ 資料庫有 `semester` 欄位
- ✅ 後端 API 支援學期篩選
- ✅ 前端有學期下拉選單
- ✅ 班級明細頁 (`ClassDetail.js`) 也支援學期篩選

---

## 2. 📝 培力個人報名 (English Test Registration)

### 資料庫結構
- **表**: `english_test_registrations`
- **學期欄位**: `semester` (STRING, 可為 NULL)
- **索引**: `idx_semester` 在 `semester` 欄位
- **Migration**: `20250203000005-add-semester-to-english-test-registrations.js`

### 後端 API
- **路由**: `GET /api/english-test/registrations`
- **參數**: `semester` (query parameter)
- **註冊時自動設定**: 根據 `createdAt` 自動判斷學期
- **檔案**: `reservation-backend/routes/englishTestRegistrationRouter.js`

### 前端頁面
- **元件**: `EnglishTestManagement.js`
- **學期選單**: 在 `AdvancedFilterPanel.js` 中
- **預設學期**: 當前學期 (`getCurrentSemester()`)
- **檔案**: 
  - `reservation-frontend/src/components/EnglishTestManagement.js`
  - `reservation-frontend/src/components/english-test/AdvancedFilterPanel.js`

### ✅ 狀態確認
- ✅ 資料庫有 `semester` 欄位（已新增 migration）
- ✅ 後端 API 支援學期篩選
- ✅ 前端有學期下拉選單
- ✅ 註冊時自動設定學期
- ✅ 預設顯示當前學期

### ⚠️ 注意事項
- 舊資料可能 `semester` 為 NULL，需執行 `populate-semester-for-registrations.js` 補填

---

## 3. 👫 培力團體報名 (Learning Partner Team)

### 資料庫結構
- **表**: `learning_partner_teams`, `learning_partner_team_members`
- **學期欄位**: ❌ **沒有直接的 `semester` 欄位**
- **關聯方式**: 透過 `learning_partner_team_members.personalRegistrationId` → `english_test_registrations.id` → `english_test_registrations.semester`

### 後端 API
- **路由**: `GET /api/admin/learning-partner/teams`
- **參數**: ❌ **沒有 `semester` 參數**
- **檔案**: `reservation-backend/routes/learningPartnerRouter.js`

### 前端頁面
- **元件**: `LearningPartnerManagement.js`
- **學期選單**: ❌ **沒有學期篩選功能**
- **檔案**: `reservation-frontend/src/components/LearningPartnerManagement.js`

### ⚠️ 狀態確認
- ⚠️ 團體報名表沒有 `semester` 欄位
- ⚠️ 後端 API 不支援學期篩選
- ⚠️ 前端沒有學期下拉選單
- ✅ 可透過個人報名關聯查詢學期（間接支援）

### 🔧 建議改進
如需完整支援學期篩選，建議：
1. 在 `learning_partner_teams` 表新增 `semester` 欄位
2. 建立 migration 補填現有資料
3. 更新後端 API 支援學期篩選
4. 更新前端加入學期下拉選單

---

## 4. ✅ BESTEP 出席資料 (Bestep Attendance)

### 資料庫結構
- **表**: `bestep_attendance`
- **學期欄位**: `semester` (STRING, NOT NULL)
- **唯一約束**: `(studentId, semester, examType)`
- **Migration**: `20250203000001-create-bestep-attendance.js`

### 後端 API
- **路由**: `POST /api/admin/bestep/attendance/import`
- **參數**: `semester` (必填)
- **檔案**: `reservation-backend/controllers/bestepImportController.js`

### 前端頁面
- **元件**: `BestepImportPage.js`
- **學期選單**: ✅ 有學期下拉選單
- **預設學期**: 114-1
- **檔案**: `reservation-frontend/src/components/BestepImportPage.js`

### ✅ 狀態確認
- ✅ 資料庫有 `semester` 欄位
- ✅ 後端 API 支援學期參數
- ✅ 前端有學期下拉選單
- ✅ 班級 BESTEP 概況頁 (`ClassBestepOverview.js`) 支援學期篩選

---

## 5. 📊 BESTEP 成績資料 (Bestep Exam Scores)

### 資料庫結構
- **表**: `bestep_exam_scores`
- **學期欄位**: `semester` (STRING, NOT NULL)
- **唯一約束**: `(studentId, semester)`
- **Migration**: `20250203000002-create-bestep-exam-scores.js`

### 後端 API
- **路由**: `POST /api/admin/bestep/scores/import`
- **參數**: `semester` (必填)
- **檔案**: `reservation-backend/controllers/bestepImportController.js`

### 前端頁面
- **元件**: `BestepImportPage.js`
- **學期選單**: ✅ 有學期下拉選單
- **預設學期**: 114-1
- **檔案**: `reservation-frontend/src/components/BestepImportPage.js`

### ✅ 狀態確認
- ✅ 資料庫有 `semester` 欄位
- ✅ 後端 API 支援學期參數
- ✅ 前端有學期下拉選單
- ✅ 班級 BESTEP 概況頁支援學期篩選

---

## 6. 🏆 團體名次計算 (Bestep Team Rankings)

### 資料庫結構
- **表**: `bestep_team_rankings`
- **學期欄位**: `semester` (STRING, NOT NULL)
- **唯一約束**: `(teamId, semester)`
- **Migration**: `20250203000004-create-bestep-team-rankings.js`

### 後端 API
- **路由**: 
  - `POST /api/admin/bestep/teams/calculate-ranking`
  - `GET /api/admin/bestep/teams/ranking`
- **參數**: `semester` (必填)
- **檔案**: `reservation-backend/controllers/bestepRankingController.js`

### 前端頁面
- **元件**: `BestepImportPage.js` (名次計算標籤頁)
- **學期選單**: ✅ 有學期下拉選單
- **預設學期**: 114-1
- **檔案**: `reservation-frontend/src/components/BestepImportPage.js`

### ✅ 狀態確認
- ✅ 資料庫有 `semester` 欄位
- ✅ 後端 API 支援學期參數
- ✅ 前端有學期下拉選單

---

## 📊 學期日期範圍配置

### 後端配置
**檔案**: `reservation-backend/controllers/adminClassesController.js`

```javascript
const SEMESTER_RANGES = {
  '114-1': { start: '2025-08-01', end: '2026-01-31' },
  '113-2': { start: '2025-02-01', end: '2025-07-31' },
  '114-2': { start: '2026-02-01', end: '2026-07-31' },
  '115-1': { start: '2026-09-01', end: '2027-01-31' },
  '115-2': { start: '2027-02-01', end: '2027-07-31' }
};
```

### 前端配置
**檔案**: `reservation-frontend/src/utils/semesterUtils.js`

```javascript
export const SEMESTER_RANGES = {
  '114-1': { start: '2025-08-01', end: '2026-01-31' },
  '113-2': { start: '2025-02-01', end: '2025-07-31' },
  '114-2': { start: '2026-02-01', end: '2026-07-31' },
  '115-1': { start: '2026-09-01', end: '2027-01-31' },
  '115-2': { start: '2027-02-01', end: '2027-07-31' }
};
```

---

## ⚠️ 發現的問題與建議

### 1. 培力團體報名缺少學期欄位
**問題**: `learning_partner_teams` 表沒有 `semester` 欄位，無法直接篩選學期。

**影響**: 
- 無法在「培力英檢管理」頁面直接篩選特定學期的團體報名
- 需透過個人報名關聯才能查詢學期

**建議**:
- 新增 migration 在 `learning_partner_teams` 表加入 `semester` 欄位
- 根據 `createdAt` 或關聯的個人報名記錄補填現有資料
- 更新後端 API 支援學期篩選
- 更新前端加入學期下拉選單

### 2. 培力個人報名舊資料可能缺少學期
**問題**: 在新增 `semester` 欄位前建立的報名記錄，`semester` 可能為 NULL。

**影響**: 
- 這些記錄在學期篩選時可能被遺漏

**建議**:
- 執行 `populate-semester-for-registrations.js` 腳本補填舊資料

### 3. 預設學期設定不一致
**問題**: 
- 「班級參與概況」預設為 114-1
- 「培力英檢管理」預設為當前學期
- 「BESTEP 資料匯入」預設為 114-1

**建議**:
- 統一預設為當前學期（114-2），或根據實際需求調整

---

## ✅ 準備就緒項目

以下功能已完整支援 114-1 和 114-2 學期：

1. ✅ **班級參與概況** - 完整支援學期篩選
2. ✅ **培力個人報名** - 完整支援學期篩選（需補填舊資料）
3. ✅ **BESTEP 出席資料** - 完整支援學期篩選
4. ✅ **BESTEP 成績資料** - 完整支援學期篩選
5. ✅ **BESTEP 團體名次** - 完整支援學期篩選
6. ✅ **班級 BESTEP 概況** - 完整支援學期篩選

---

## 📝 建議執行項目（114-2 學期開放前）

### 高優先級
1. ✅ 確認資料庫 migration 已執行（`semester` 欄位已新增）
2. ⚠️ 執行 `populate-semester-for-registrations.js` 補填舊報名記錄的學期
3. ⚠️ 檢查並更新「培力團體報名」的學期支援（如需要）

### 中優先級
4. ⚠️ 統一各頁面的預設學期設定（建議改為當前學期 114-2）
5. ✅ 確認學期日期範圍配置正確（114-2: 2026-02-01 ~ 2026-07-31）

### 低優先級
6. 📊 執行資料盤點腳本確認各學期資料量
7. 🧪 測試各功能在 114-2 學期的運作狀況

---

## 📞 聯絡資訊

如有問題或需要協助，請聯繫系統管理員。

**報告生成時間**: 2026-02-03
