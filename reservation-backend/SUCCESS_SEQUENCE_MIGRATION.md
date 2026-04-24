# 報名成功序號邏輯變更說明

## 變更概述

將序號分配邏輯從「已通過」狀態改為「報名成功」狀態，並新增手動調整順序功能。

## 主要變更

### 1. 資料庫欄位變更

- **刪除欄位**：`approvedSequence`（已通過的順序編號）
- **新增欄位**：`successSequence`（報名成功的順序編號）
- **保留欄位**：`approvedAt`（用於排序報名成功的順序）

### 2. 序號分配邏輯

#### 變更前
- 「已通過」狀態：分配 `approvedSequence`
- 「報名成功」狀態：匯出時動態編號（不儲存）

#### 變更後
- 「已通過」狀態：不分配序號（僅記錄 `approvedAt` 時間）
- 「報名成功」狀態：分配並儲存 `successSequence`
- 排序依據：`approvedAt` ASC（無則 `createdAt` ASC），再按 `id` ASC

### 3. 自動重新排序時機

1. **變為報名成功時**：自動分配序號並重新排序所有報名成功記錄
2. **從報名成功變為其他狀態時**：自動重新排序所有報名成功記錄
3. **手動調整順序後**：自動重新排序確保序號連續（1, 2, 3...）

### 4. 匯出邏輯變更

#### Excel 匯出
- **報名成功狀態**：使用 `successSequence` 作為序號
- **已通過狀態**：使用報名編號 (`id`) 作為序號

#### 照片 ZIP 匯出
- **報名成功狀態**：檔名格式為 `{successSequence}-{身分證字號}-{中文姓名}.{副檔名}`
- **已通過狀態**：檔名使用報名編號 (`id`)

### 5. 新增 API

#### 手動調整順序
```
POST /api/english-test/registrations/:id/adjust-sequence
Body: {
  action: 'up' | 'down' | 'move',
  targetSequence?: number  // 僅用於 move 操作
}
```

#### 重新排序所有報名成功記錄
```
POST /api/english-test/registrations/reorder-success
```

## 部署步驟

### 1. 執行資料庫遷移

```bash
cd reservation-backend
node migrations/20250120000000-update-success-sequence.js
```

### 2. 重啟後端服務

```bash
pm2 restart reservation-backend
# 或使用其他方式重啟
```

### 3. 驗證功能

1. 測試批量更新為「報名成功」狀態，確認序號分配
2. 測試從「報名成功」變為其他狀態，確認重新排序
3. 測試匯出 Excel 和照片，確認使用正確的序號
4. 測試手動調整順序功能（上移、下移、指定位置）

## 注意事項

1. **歷史資料**：`approvedSequence` 欄位會被清除，不會遷移到 `successSequence`
2. **已通過狀態**：匯出時使用 `id` 作為序號，不再使用 `approvedSequence`
3. **排序邏輯**：報名成功的排序依據是變為「已通過」的時間（`approvedAt`），而非變為「報名成功」的時間
4. **序號連續性**：每次重新排序後，序號會自動調整為連續的 1, 2, 3...

## 回滾程序

如果需要回滾，執行：

```bash
cd reservation-backend
node migrations/20250120000000-update-success-sequence.js --rollback
```

然後恢復舊版本的程式碼並重啟服務。
