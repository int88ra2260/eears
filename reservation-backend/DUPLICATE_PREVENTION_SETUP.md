# 防重複預約機制設定說明

## 概述
本系統已實作多層防護機制來防止學生快速點擊預約按鈕導致重複預約和重複寄信的問題。

## 防護機制

### 1. 前端防護
- **防重複點擊**：預約按鈕在提交過程中會被禁用
- **狀態管理**：使用 `isSubmitting` 狀態防止重複提交
- **使用者體驗**：按鈕文字會變為「處理中...」提供視覺回饋

### 2. 後端防護
- **資料庫事務**：使用 Sequelize 事務確保操作的原子性
- **行鎖定**：在檢查和建立預約時鎖定相關資料行
- **重複檢查**：在事務內進行重複預約檢查
- **錯誤處理**：捕獲並處理唯一約束違反錯誤

### 3. 資料庫層防護
- **唯一約束**：在資料庫層面建立唯一約束
  - `unique_event_student`：同一個活動中，同一個學號只能預約一次
  - `unique_event_email`：同一個活動中，同一個email只能預約一次

### 4. 寄信機制優化
- **事務外寄信**：寄信功能在資料庫事務外執行，避免影響預約邏輯
- **錯誤隔離**：寄信失敗不會影響預約成功
- **單次寄信**：每次成功預約只會寄送一次確認信

## 設定步驟

### 1. 執行資料庫遷移
```bash
cd reservation-backend
node -e "
const { sequelize } = require('./models');
const migration = require('./migrations/add-unique-constraint-reservations.js');

async function runMigration() {
  try {
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ 唯一約束遷移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

runMigration();
"
```

### 2. 重新啟動服務
```bash
# 重新啟動後端服務
cd reservation-backend
npm start

# 重新啟動前端服務
cd reservation-frontend
npm start
```

## 測試建議

### 1. 前端測試
- 快速點擊預約按鈕多次
- 確認按鈕在處理過程中會被禁用
- 確認只會發送一次預約請求

### 2. 後端測試
- 同時發送多個相同學號的預約請求
- 確認只有一個預約會成功
- 確認只會寄送一次確認信

### 3. 資料庫測試
- 嘗試手動插入重複的預約記錄
- 確認唯一約束會阻止重複插入

## 注意事項

1. **現有資料**：遷移前請備份現有資料
2. **重複資料**：如果資料庫中已存在重複預約，需要先清理
3. **效能影響**：唯一約束會略微影響插入效能，但提供強健的資料完整性保證
4. **錯誤訊息**：重複預約時會顯示「您已報名此活動」的友善錯誤訊息

## 回滾步驟

如果需要回滾遷移：
```bash
cd reservation-backend
node -e "
const { sequelize } = require('./models');
const migration = require('./migrations/add-unique-constraint-reservations.js');

async function rollbackMigration() {
  try {
    await migration.down(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ 唯一約束已移除');
    process.exit(0);
  } catch (error) {
    console.error('❌ 回滾失敗:', error);
    process.exit(1);
  }
}

rollbackMigration();
"
```

## 技術細節

### 前端實作
- 使用 React useState 管理提交狀態
- 在 fetch 請求前後控制按鈕狀態
- 使用 try-catch 處理網路錯誤

### 後端實作
- 使用 Sequelize 事務確保資料一致性
- 使用 `lock: true` 鎖定查詢的行
- 使用 `Op.or` 查詢重複預約
- 在事務外執行寄信避免阻塞

### 資料庫設計
- 複合唯一約束確保資料完整性
- 支援學號和email兩種識別方式
- 自動處理約束違反錯誤
