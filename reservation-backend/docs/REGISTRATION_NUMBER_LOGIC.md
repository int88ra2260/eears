# 報名編號邏輯說明文件

## 概述

本文件說明培力英檢報名系統中，各種狀態下報名編號的顯示邏輯和計算方式。

---

## 一、編號類型定義

### 1. **semesterSequence（學期編號）**
- **定義**：所有報名記錄在該學期內的順序編號（不論狀態）
- **計算方式**：使用 SQL 窗口函數 `ROW_NUMBER() OVER (PARTITION BY semester ORDER BY createdAt ASC, id ASC)`
- **範圍**：從 1 開始，按學期分組
- **用途**：用於顯示所有報名記錄的學期內順序

### 2. **successSequence（報名成功編號）**
- **定義**：僅限「報名成功」狀態的記錄，在該學期內的順序編號
- **計算方式**：按 `approvedAt` ASC（無則 `createdAt` ASC），再按 `id` ASC 排序後分配
- **範圍**：從 1 開始，按學期分組，僅包含 `status='success'` 的記錄
- **用途**：用於顯示報名成功記錄的順序
- **更新時機**：
  - 當狀態變為 `success` 時自動分配
  - 當狀態從 `success` 變為其他狀態時清除
  - 每次狀態變更時會重新排序該學期的所有 `success` 記錄

### 3. **id（資料庫ID）**
- **定義**：資料庫自動產生的唯一識別碼
- **範圍**：從 1 開始，全域唯一
- **用途**：作為最後的備用顯示編號

---

## 二、顯示邏輯（前端）

### 顯示優先順序

在所有顯示報名編號的地方，統一使用以下優先順序：

```
semesterSequence || (status === 'success' && successSequence) || id
```

**說明**：
1. **優先顯示** `semesterSequence`（如果存在）
2. **其次顯示** `successSequence`（僅當狀態為 `success` 且存在時）
3. **最後顯示** `id`（資料庫ID）

---

## 三、各狀態下的編號顯示

### 狀態：`pending`（審核中）
- **顯示編號**：`semesterSequence` 或 `id`
- **說明**：顯示學期編號，如果沒有則顯示資料庫ID

### 狀態：`approved`（已通過）
- **顯示編號**：`semesterSequence` 或 `id`
- **說明**：顯示學期編號，如果沒有則顯示資料庫ID
- **注意**：此狀態尚未分配 `successSequence`

### 狀態：`revision`（請修正）
- **顯示編號**：`semesterSequence` 或 `id`
- **說明**：顯示學期編號，如果沒有則顯示資料庫ID

### 狀態：`success`（報名成功）
- **顯示編號**：`semesterSequence` 或 `successSequence` 或 `id`
- **說明**：
  - 優先顯示 `semesterSequence`（學期內所有記錄的順序）
  - 如果沒有 `semesterSequence`，顯示 `successSequence`（報名成功的順序）
  - 最後才顯示 `id`
- **特殊功能**：
  - 可以調整 `successSequence` 的順序（上移/下移）
  - 調整後會重新排序該學期的所有 `success` 記錄

### 狀態：`failed`（報名失敗）
- **顯示編號**：`semesterSequence` 或 `id`
- **說明**：顯示學期編號，如果沒有則顯示資料庫ID

---

## 四、後端計算邏輯

### 1. semesterSequence 計算

**位置**：`GET /api/english-test/registrations`

**SQL 查詢**：
```sql
SELECT 
  id,
  ROW_NUMBER() OVER (
    PARTITION BY semester 
    ORDER BY createdAt ASC, id ASC
  ) as semesterSequence
FROM english_test_registrations
WHERE id IN (:rowIds)
```

**特點**：
- 動態計算，不存儲在資料庫
- 每次查詢時重新計算
- 按學期分組，按創建時間和ID排序

### 2. successSequence 分配

**位置**：`PUT /api/english-test/registrations/:id`

**邏輯**：
1. 當狀態變為 `success` 時：
   - 如果沒有 `approvedAt`，設置為當前時間
   - 查詢該學期內所有 `success` 記錄的最大 `successSequence`
   - 分配 `maxSequence + 1`
   - 調用 `reorderSuccessSequences()` 重新排序

2. 當狀態從 `success` 變為其他狀態時：
   - 清除 `successSequence`（設為 `null`）
   - 調用 `reorderSuccessSequences()` 重新排序

**重新排序函數**：`reorderSuccessSequences(semester)`
- 查詢該學期（或所有學期）的所有 `success` 記錄
- 按 `approvedAt` ASC（無則 `createdAt` ASC），再按 `id` ASC 排序
- 重新分配 `successSequence` 從 1 開始

---

## 五、前端顯示位置

### 1. **報名列表（EnhancedTable.js）**
- **位置**：第 179-184 行
- **邏輯**：
  ```javascript
  row.semesterSequence || (row.status === 'success' && row.successSequence) || row.id
  ```

### 2. **詳細資料頁面（DetailModalWithTabs.js）**
- **位置**：第 311-313 行（標題）
- **邏輯**：
  ```javascript
  registration.semesterSequence || 
  (registration.status === 'success' && registration.successSequence) || 
  registration.id
  ```

### 3. **快速審核模式（QuickReviewMode.js）**
- **位置**：第 137-139 行（標題）
- **邏輯**：
  ```javascript
  registration.semesterSequence || 
  (registration.status === 'success' && registration.successSequence) || 
  registration.id
  ```

---

## 六、特殊情況處理

### 1. **學期篩選**
- 當使用學期篩選時，`semesterSequence` 和 `successSequence` 都只計算該學期內的記錄
- 不同學期的編號互不影響

### 2. **編號調整（僅限 success 狀態）**
- 可以手動調整 `successSequence` 的順序
- 調整後會重新排序該學期的所有 `success` 記錄
- 調整範圍限制在同一學期內

### 3. **並列排名**
- 當多筆記錄的 `approvedAt` 時間相同時，按 `id` ASC 排序
- 確保排序結果的一致性

---

## 七、資料庫欄位

### EnglishTestRegistration 表
- `id`：主鍵，自動遞增
- `semester`：學期（如 '114-1'）
- `status`：狀態（pending/approved/revision/success/failed）
- `successSequence`：報名成功序號（INTEGER，可為 NULL）
- `approvedAt`：通過時間（DATETIME，可為 NULL）
- `createdAt`：創建時間（DATETIME）

### 索引
- `id`：主鍵索引
- `semester`：學期索引
- `status`：狀態索引
- `successSequence`：報名成功序號索引（用於排序）

---

## 八、範例

### 範例 1：一般狀態
- **狀態**：`pending`
- **semesterSequence**：5
- **successSequence**：null
- **id**：1050
- **顯示編號**：5

### 範例 2：報名成功狀態
- **狀態**：`success`
- **semesterSequence**：10
- **successSequence**：3
- **id**：1055
- **顯示編號**：10（優先顯示 semesterSequence）

### 範例 3：報名成功但無 semesterSequence
- **狀態**：`success`
- **semesterSequence**：null
- **successSequence**：2
- **id**：1056
- **顯示編號**：2（顯示 successSequence）

### 範例 4：無任何序號
- **狀態**：`pending`
- **semesterSequence**：null
- **successSequence**：null
- **id**：1057
- **顯示編號**：1057（顯示 id）

---

## 九、注意事項

1. **semesterSequence 是動態計算的**，不存儲在資料庫中
2. **successSequence 只在狀態為 success 時有效**
3. **編號調整功能僅限 success 狀態**
4. **所有編號都按學期分組**，不同學期互不影響
5. **排序依據**：
   - semesterSequence：`createdAt ASC, id ASC`
   - successSequence：`approvedAt ASC（無則 createdAt ASC）, id ASC`

---

## 十、相關檔案

### 後端
- `routes/englishTestRegistrationRouter.js`
  - `reorderSuccessSequences()` 函數（第 19-61 行）
  - `GET /api/english-test/registrations`（第 925-1217 行）
  - `PUT /api/english-test/registrations/:id`（第 1620-1750 行）

### 前端
- `components/english-test/EnhancedTable.js`（第 179-184 行）
- `components/english-test/DetailModalWithTabs.js`（第 311-313 行）
- `components/english-test/QuickReviewMode.js`（第 137-139 行）

---

**最後更新**：2026-02-03
