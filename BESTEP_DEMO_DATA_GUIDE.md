# BESTEP DEMO 測試資料生成指南

## 📋 概述

本指南說明如何生成 BESTEP DEMO 測試資料，以及系統中需要學期區分的功能檢查。

---

## 🎯 測試資料生成

### 執行腳本

```bash
cd reservation-backend
node scripts/generate-bestep-demo-data.js
```

### 生成的資料

腳本會生成以下測試資料（114-1 學期）：

1. **班級資料**
   - 2 個班級（英文中級 GEEN116、英文進階 GEEN218）
   - 20 位學生分配到這兩個班級

2. **培力英檢報名**
   - 20 筆報名記錄（全部 status='success'）

3. **團體報名**
   - 3 個隊伍（每隊 4 人）
   - 前 12 位學生參與團體報名

4. **出席資料**
   - LR（聽讀）出席資料（約 80% 出席率）
   - SW（說寫）出席資料（約 80% 出席率）

5. **成績資料**
   - 20 筆成績記錄
   - 約 60% 學生達標（B2 以上）
   - 包含各項分數和 CEFR 等級

6. **團體名次**
   - 自動計算 3 個隊伍的名次和獎勵金額

### 生成的 Excel 檔案

腳本會在 `reservation-backend/uploads/bestep/demo/` 目錄下生成以下 Excel 檔案：

1. **培力英檢LR出缺席紀錄.xlsx** - LR 出席資料
2. **培力英檢SW出缺席紀錄.xlsx** - SW 出席資料
3. **培力英檢成績資料.xlsx** - 成績資料（含 CEFR 等級）
4. **班級修課名單.xlsx** - 班級名單

這些檔案可以用於測試匯入功能。

---

## 📅 學期設定更新

### 已更新的學期日期範圍

#### 後端（adminClassesController.js）
```javascript
const SEMESTER_RANGES = {
  '114-1': { start: '2025-08-01', end: '2026-01-31' },
  '113-2': { start: '2025-02-01', end: '2025-07-31' },
  '114-2': { start: '2026-02-01', end: '2026-07-31' },
  '115-1': { start: '2026-09-01', end: '2027-01-31' },  // ✅ 新增
  '115-2': { start: '2027-02-01', end: '2027-07-31' }   // ✅ 新增
};
```

#### 前端學期選項
已更新以下元件的學期選項：
- ✅ `ClassOverview.js`
- ✅ `ClassDetail.js`
- ✅ `ClassBestepOverview.js`
- ✅ `BestepImportPage.js`

---

## 🔍 需要學期區分的功能檢查

### ✅ 已實作學期區分的功能

1. **班級參與概況** (`ClassOverview.js`)
   - ✅ 有學期篩選下拉選單
   - ✅ API 支援 `semester` 參數
   - ✅ 資料依學期篩選

2. **班級 BESTEP 概況** (`ClassBestepOverview.js`)
   - ✅ 有學期篩選下拉選單
   - ✅ API 支援 `semester` 參數
   - ✅ 資料依學期篩選

3. **BESTEP 資料匯入** (`BestepImportPage.js`)
   - ✅ 有學期選擇下拉選單
   - ✅ 匯入時必須指定學期
   - ✅ 資料依學期儲存

### ⚠️ 需要檢查的功能

1. **培力英檢管理** (`EnglishTestManagement.js`)
   - ⚠️ **目前沒有學期篩選功能**
   - 建議：新增學期篩選下拉選單
   - 建議：API 支援依學期篩選報名記錄

2. **班級明細** (`ClassDetail.js`)
   - ✅ 有學期篩選下拉選單
   - ✅ API 支援 `semester` 參數

---

## 📝 建議改進

### 1. 培力英檢管理新增學期篩選

**檔案**: `reservation-frontend/src/components/EnglishTestManagement.js`

**需要修改**:
- 新增學期篩選下拉選單
- 在 API 請求中加入 `semester` 參數
- 後端 API 需要支援依學期篩選

**後端 API**: `GET /api/admin/english-test/registrations`
- 需要支援 `semester` 查詢參數
- 根據報名時間判斷學期（或新增 `semester` 欄位）

### 2. 統一學期選項管理

建議建立共用的學期選項常數：

**檔案**: `reservation-frontend/src/utils/semesterOptions.js`
```javascript
export const SEMESTER_OPTIONS = [
  { value: '114-1', label: '114-1學期' },
  { value: '113-2', label: '113-2學期' },
  { value: '114-2', label: '114-2學期' },
  { value: '115-1', label: '115-1學期' },
  { value: '115-2', label: '115-2學期' }
];

export const SEMESTER_RANGES = {
  '114-1': { start: '2025-08-01', end: '2026-01-31' },
  '113-2': { start: '2025-02-01', end: '2025-07-31' },
  '114-2': { start: '2026-02-01', end: '2026-07-31' },
  '115-1': { start: '2026-09-01', end: '2027-01-31' },
  '115-2': { start: '2027-02-01', end: '2027-07-31' }
};
```

---

## 🧪 測試步驟

### 1. 生成測試資料
```bash
cd reservation-backend
node scripts/generate-bestep-demo-data.js
```

### 2. 測試班級參與概況
1. 登入管理後台
2. 進入「班級參與概況」
3. 選擇「114-1學期」
4. 應該能看到 2 個班級和相關統計

### 3. 測試班級 BESTEP 概況
1. 點擊班級列表中的「BESTEP」按鈕
2. 選擇「114-1學期」
3. 應該能看到學生的報名、團體、出席、成績資訊

### 4. 測試資料匯入
1. 進入「BESTEP 資料匯入」
2. 使用生成的 Excel 檔案測試匯入功能
3. 確認錯誤報表功能正常

### 5. 測試團體名次計算
1. 在「BESTEP 資料匯入」頁面
2. 選擇「團體名次計算」標籤
3. 選擇「114-1學期」
4. 點擊「開始計算」
5. 應該能看到 3 個隊伍的名次和獎勵金額

---

## 📊 測試資料統計

- **班級數**: 2 個
- **學生數**: 20 位
- **報名記錄**: 20 筆（全部成功）
- **團體數**: 3 個隊伍（每隊 4 人）
- **LR 出席率**: 約 80%
- **SW 出席率**: 約 80%
- **達標率**: 約 60%

---

## ⚠️ 注意事項

1. **資料會覆蓋現有資料**
   - 如果學號已存在，會使用 `findOrCreate` 更新
   - 建議在測試環境執行

2. **學期設定**
   - 所有測試資料都設定為 **114-1 學期**
   - 考試日期：LR 2025-12-15，SW 2025-12-16

3. **Excel 檔案位置**
   - 生成的 Excel 檔案在 `reservation-backend/uploads/bestep/demo/`
   - 可以用於測試匯入功能

---

**最後更新**: 2025-02-03
