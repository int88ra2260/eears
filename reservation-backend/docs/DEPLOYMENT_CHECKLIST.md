# 部署檢查清單

## 部署前檢查

### 1. 程式碼品質

```bash
# Lint 檢查
npm run lint

# 執行測試
npm test

# 覆蓋率檢查
npm run test:coverage
node scripts/verify-coverage.mjs --lines 70
```

### 2. 環境變數

確認 `.env` 檔案包含以下必要變數：

- `DATABASE_URL` 或資料庫連線資訊
- `JWT_SECRET` - JWT 簽章密鑰
- `PORT` - 後端服務埠號（預設 3000）
- `GMAIL_USER` - Email 寄件者帳號（選填）
- `GMAIL_PASS` - Email 寄件者密碼（選填）
- `FEATURE_*` - Feature Flags 環境變數（選填）

### 3. 資料庫遷移

```bash
# 確認資料庫連線
node -e "require('./db').authenticate().then(() => console.log('✅ DB connected')).catch(e => console.error('❌ DB error:', e))"

# 同步資料表（開發環境）
# 注意：生產環境應使用 migration 腳本
npm run db:sync  # 如果有的話
```

### 4. 前端建置

```bash
cd ../frontend
npm run build
# 確認 build 目錄已產生
```

### 5. BasePath 設定

```bash
# 驗證 basePath 設定
node scripts/verify-basepath.mjs /EEARS
```

## 部署步驟

### 1. 備份資料庫

```bash
# 匯出資料庫備份
mysqldump -u [user] -p [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 2. 部署後端

```bash
# 停止現有服務
pm2 stop eears-backend  # 或使用其他流程管理工具

# 拉取最新程式碼
git pull origin main

# 安裝依賴
npm ci --production

# 啟動服務
pm2 start server.js --name eears-backend
# 或
npm start
```

### 3. 部署前端

```bash
cd ../frontend
npm ci --production
npm run build
# 將 build 目錄部署到 Web 伺服器
```

### 4. 執行部署後檢查

```bash
# 等待服務啟動後（約 10 秒）
sleep 10

# 執行健康檢查
npm run post-deploy-check
```

## 部署後驗證

### 1. API 健康檢查

```bash
curl http://localhost:3000/api/events
```

### 2. 前端頁面

- 開啟 `http://your-domain/EEARS`
- 確認頁面正常載入
- 測試關鍵功能：
  - 活動列表顯示
  - 預約流程
  - Admin 登入

### 3. 功能驗證清單

- [ ] 問卷 Gate 功能正常（如啟用）
- [ ] 黑名單檢查正常
- [ ] Email 通知正常（如啟用）
- [ ] 報表排序/搜尋正常
- [ ] 班級參與概況正常
- [ ] Excel 匯出正常

### 4. Feature Flags 檢查

```bash
# 取得所有 Feature Flags
curl -H "Authorization: Bearer <admin_token>" \
  http://localhost:3000/api/admin/feature-flags
```

## 監控與回滾

### 監控指標

1. **錯誤日誌**：檢查 `logs/` 目錄或 PM2 日誌
2. **API 回應時間**：監控關鍵 API 的延遲
3. **資料庫連線**：確認資料庫連線穩定

### 回滾步驟

#### 1. 透過 Feature Flags（推薦）

```bash
# 關閉有問題的功能
curl -X PUT http://localhost:3000/api/admin/feature-flags/SURVEY_GATE_ENABLED \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"value": false}'
```

#### 2. 程式碼回滾

```bash
# 回退到上一版本
git checkout <previous-version-tag>
npm ci --production
pm2 restart eears-backend
```

#### 3. 資料庫回滾

```bash
# 還原資料庫備份
mysql -u [user] -p [database_name] < backup_YYYYMMDD_HHMMSS.sql
```

## 故障排除

### 常見問題

1. **服務無法啟動**
   - 檢查環境變數是否正確
   - 檢查資料庫連線
   - 檢查埠號是否被占用

2. **API 回應錯誤**
   - 檢查後端日誌
   - 確認資料庫連線
   - 執行 `npm run post-deploy-check`

3. **前端頁面空白**
   - 檢查 basePath 設定
   - 確認靜態檔案路徑正確
   - 檢查瀏覽器 Console 錯誤

4. **測試失敗**
   - 確認測試資料庫設定
   - 檢查測試環境變數
   - 執行 `npm run test:coverage` 查看詳細錯誤

## 相關文件

- [CHANGELOG.md](../CHANGELOG.md)
- [README_TESTING.md](../README_TESTING.md)
- [FEATURE_FLAGS.md](./FEATURE_FLAGS.md)
- [API_SPECIFICATION.md](./API_SPECIFICATION.md)

