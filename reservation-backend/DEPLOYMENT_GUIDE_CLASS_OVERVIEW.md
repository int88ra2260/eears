# 班級參與概況功能部署指南

## 部署前準備

### 1. 安裝依賴
```bash
# 後端依賴
cd backend
npm install multer@^1.4.5-lts.1 xlsx@^0.18.5

# 前端依賴（通常已包含）
cd ../frontend
npm install
```

### 2. 資料庫遷移
```bash
# 執行遷移文件
cd backend
node -e "
const { sequelize } = require('./models');
const migration1 = require('./migrations/20241201000002-create-classes');
const migration2 = require('./migrations/20241201000003-create-class-memberships');

async function runMigrations() {
  try {
    await migration1.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ Classes 表創建成功');
    
    await migration2.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ ClassMemberships 表創建成功');
    
    console.log('🎉 所有遷移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

runMigrations();
"
```

### 3. 測試功能
```bash
# 執行測試腳本
cd backend
node test-class-overview.js
```

## 部署步驟

### 1. 後端部署
1. 確保所有新檔案已上傳到伺服器
2. 安裝新依賴：`npm install`
3. 執行資料庫遷移
4. 重啟後端服務

### 2. 前端部署
1. 確保所有新檔案已上傳到伺服器
2. 重新建置前端：`npm run build`
3. 將建置檔案複製到後端的 build 目錄

### 3. 權限設定
確保以下目錄有寫入權限：
- `backend/uploads/` - 用於暫存上傳的 Excel 檔案

## 驗證部署

### 1. 功能測試
1. 登入管理員帳號
2. 進入「後台 → 班級參與概況」
3. 測試匯入名單功能
4. 測試總覽和明細頁面
5. 測試 Excel 匯出功能

### 2. 資料庫驗證
```sql
-- 檢查表是否創建成功
SHOW TABLES LIKE 'Classes';
SHOW TABLES LIKE 'ClassMemberships';

-- 檢查索引是否創建成功
SHOW INDEX FROM Classes;
SHOW INDEX FROM ClassMemberships;
```

## 常見問題

### 1. 檔案上傳失敗
- 檢查 `uploads` 目錄權限
- 確認檔案大小不超過 10MB
- 檢查檔案格式是否為 .xlsx 或 .xls

### 2. 資料庫連接錯誤
- 檢查資料庫連接設定
- 確認遷移是否成功執行
- 檢查表結構是否正確

### 3. 前端路由錯誤
- 確認 React Router 設定正確
- 檢查組件導入路徑
- 確認建置檔案是否正確

## 效能優化建議

### 1. 資料庫優化
```sql
-- 為常用查詢添加索引
CREATE INDEX idx_class_memberships_student_semester ON ClassMemberships(studentId, semester);
CREATE INDEX idx_reservations_student_date ON Reservations(studentId, timestamp);
```

### 2. 快取設定
考慮為統計查詢添加 Redis 快取，特別是班級總覽資料。

### 3. 檔案清理
建議定期清理 `uploads` 目錄中的暫存檔案。

## 監控建議

### 1. 日誌監控
- 監控檔案上傳錯誤
- 監控資料庫查詢效能
- 監控 API 回應時間

### 2. 資料監控
- 監控班級名單匯入成功率
- 監控統計查詢效能
- 監控匯出功能使用情況

## 備份建議

### 1. 資料備份
定期備份以下資料：
- Classes 表
- ClassMemberships 表
- 上傳的 Excel 檔案

### 2. 設定備份
備份以下設定檔案：
- 學期日期範圍設定
- 活動類型映射設定
- 權限設定

## 回滾計劃

如果部署後發現問題，可以按以下步驟回滾：

1. 停止服務
2. 恢復舊版本程式碼
3. 執行資料庫回滾（如果需要）
4. 重啟服務

```bash
# 資料庫回滾（謹慎使用）
node -e "
const { sequelize } = require('./models');
const migration1 = require('./migrations/20241201000002-create-classes');
const migration2 = require('./migrations/20241201000003-create-class-memberships');

async function rollback() {
  try {
    await migration2.down(sequelize.getQueryInterface(), sequelize.constructor);
    await migration1.down(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ 回滾完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 回滾失敗:', error);
    process.exit(1);
  }
}

rollback();
"
```
