# 簽到與違規管理功能部署指南

## 部署前準備

### 1. 資料庫備份
```bash
# 備份現有資料庫
mysqldump -u username -p database_name > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 檢查依賴
確保以下套件已安裝：
- Node.js (v14 或以上)
- MySQL/PostgreSQL
- 所有 npm 依賴套件

## 部署步驟

### 1. 更新後端程式碼
```bash
# 進入後端目錄
cd reservation-backend

# 安裝新依賴（如果有）
npm install

# 執行資料庫遷移
node migrations/add-checkin-and-violation-features.js
```

### 2. 更新前端程式碼
```bash
# 進入前端目錄
cd reservation-frontend

# 重新建置前端
npm run build
```

### 3. 重啟服務
```bash
# 重啟後端服務
pm2 restart reservation-backend

# 或使用其他方式重啟
# systemctl restart your-service-name
```

## 功能驗證

### 1. 執行測試腳本
```bash
cd reservation-backend
node test_checkin_violation.js
```

### 2. 手動測試
1. 登入管理員/工讀生帳號
2. 進入活動報表頁面
3. 點擊「查看預約」按鈕
4. 測試簽到功能
5. 測試違規登記功能
6. 測試活動結束檢查功能

## 資料庫變更說明

### 新增欄位
- `Reservations.checkinStatus`：簽到狀態
- `Reservations.checkinTime`：簽到時間  
- `Reservations.group`：學生分組

### 新增資料表
- `event_violations`：活動違規記錄表

## 回滾程序

如果部署後發現問題，可以執行以下回滾步驟：

### 1. 回滾資料庫
```bash
# 執行回滾遷移
node migrations/add-checkin-and-violation-features.js --rollback
```

### 2. 恢復舊版本程式碼
```bash
# 使用 git 回滾到上一個版本
git checkout HEAD~1

# 重新部署
npm run build
pm2 restart reservation-backend
```

## 注意事項

1. **資料庫遷移**：執行遷移前務必備份資料庫
2. **權限設定**：確保新 API 端點的權限設定正確
3. **手機相容性**：測試手機瀏覽器的相容性
4. **效能影響**：監控新功能對系統效能的影響

## 故障排除

### 常見問題

1. **簽到按鈕無反應**
   - 檢查 API 端點是否正確
   - 確認認證 token 是否有效

2. **違規記錄無法儲存**
   - 檢查資料庫連線
   - 確認 EventViolation 模型是否正確載入

3. **自動檢查功能失敗**
   - 檢查管理員權限
   - 確認 BlackListRecord 模型關聯

### 日誌檢查
```bash
# 查看應用程式日誌
pm2 logs reservation-backend

# 查看資料庫日誌
tail -f /var/log/mysql/error.log
```

## 聯絡資訊

如有問題，請聯絡系統管理員或開發團隊。
