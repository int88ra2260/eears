# 環境變數更新與功能補充報告

## ✅ 已完成項目

### 1. Gmail 應用程式密碼確認
- **狀態**：✅ 已確認
- **測試結果**：Gmail 連線成功
- **設定**：
  - `GMAIL_USER=siwansalon@gmail.com`
  - `GMAIL_PASS=armo dvor szqw imwt` (19 字元，包含空格)

### 2. 後端目錄 .env 更新
- **狀態**：✅ 已完成
- **新增設定**：
  - `DB_PORT=3306` - 資料庫端口（備份腳本使用）
  - `NODE_ENV=development` - 環境模式（錯誤處理使用）

### 3. 廢棄設定清理
- **狀態**：✅ 已確認無需清理
- **檢查結果**：代碼中沒有使用以下廢棄環境變數：
  - `ADMIN_USERNAME` - 未使用（已改用 Teacher 模型）
  - `ADMIN_PASSWORD` - 未使用（已改用 Teacher 模型）
  - `WORKER_USERNAME` - 未使用（已改用 Teacher 模型）
  - `WORKER_PASSWORD` - 未使用（已改用 Teacher 模型）
  - `BCRYPT_ROUNDS` - 未使用（代碼中硬編碼為 12）
  - `RATE_LIMIT_*` - 未使用（速率限制未實作）
  - `CORS_ORIGIN` - 未使用（使用 `cors()` 無參數）
  - `LOG_LEVEL/LOG_FILE` - 未使用（日誌系統未實作）
  - `BACKUP_*` - 未使用（備份腳本未檢查這些設定）

**注意**：`eventRouter.js` 第 623 行有硬編碼的 `ADMIN_PASSWORD = '5808'`，這是用於強制刪除活動的額外安全驗證，不是環境變數，屬於業務邏輯，無需清理。

## 📋 需要補充實作的部分

### 一、備份功能需要補充的部分

#### 1. 自動備份排程功能
**目前狀態**：❌ 未實作
- 備份腳本只能手動執行
- 未實作自動排程功能
- 環境變數 `BACKUP_SCHEDULE` 已定義但未使用

**需要補充**：
- [ ] 實作自動備份排程功能（使用 node-cron 或類似套件）
- [ ] 檢查 `BACKUP_ENABLED` 環境變數決定是否啟用自動備份
- [ ] 解析 `BACKUP_SCHEDULE` 環境變數（cron 格式：`0 2 * * *`）
- [ ] 在 `server.js` 啟動時初始化備份排程
- [ ] 提供 API 端點手動觸發備份（管理員專用）

**建議實作方式**：
```javascript
// 在 server.js 中
if (process.env.BACKUP_ENABLED === 'true') {
  const cron = require('node-cron');
  const schedule = process.env.BACKUP_SCHEDULE || '0 2 * * *';
  cron.schedule(schedule, () => {
    require('./scripts/backup-database');
  });
}
```

#### 2. 自動清理舊備份功能
**目前狀態**：❌ 未實作
- 備份腳本會列出舊備份，但不會自動清理
- 環境變數 `BACKUP_RETENTION_DAYS` 已定義但未使用

**需要補充**：
- [ ] 實作自動清理功能，根據 `BACKUP_RETENTION_DAYS` 刪除過期備份
- [ ] 在每次備份後自動清理舊備份
- [ ] 記錄清理的備份檔案清單

**建議實作方式**：
```javascript
// 在 backup-database.js 中
const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS) || 30;
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

// 刪除過期備份
const oldBackups = fs.readdirSync(BACKUP_DIR)
  .filter(file => file.startsWith('activity_reservation_backup_'))
  .filter(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);
    return stats.mtime < cutoffDate;
  });
```

#### 3. 備份驗證功能
**目前狀態**：❌ 未實作
- 備份完成後未驗證備份檔案完整性

**需要補充**：
- [ ] 實作備份檔案完整性驗證
- [ ] 檢查備份檔案大小是否合理（不為 0）
- [ ] 驗證 SQL 檔案格式是否正確
- [ ] 記錄驗證結果

#### 4. 備份通知功能
**目前狀態**：❌ 未實作
- 備份成功或失敗時未發送通知

**需要補充**：
- [ ] 備份成功時發送 Email 通知（可選）
- [ ] 備份失敗時發送 Email 警告
- [ ] 記錄備份狀態到日誌

#### 5. 備份路徑配置
**目前狀態**：⚠️ 硬編碼
- 備份路徑硬編碼為 `G:\資料夾備份`

**需要補充**：
- [ ] 將備份路徑改為環境變數 `BACKUP_DIR`
- [ ] 提供預設值
- [ ] 驗證備份路徑可寫入

### 二、錯誤處理需要補充的部分

#### 1. 日誌系統實作
**目前狀態**：❌ 未實作
- 錯誤僅輸出到控制台
- 環境變數 `LOG_LEVEL` 和 `LOG_FILE` 已定義但未使用

**需要補充**：
- [ ] 實作日誌系統（使用 winston 或類似套件）
- [ ] 支援不同日誌級別（error, warn, info, debug）
- [ ] 根據 `LOG_LEVEL` 環境變數過濾日誌
- [ ] 將日誌寫入檔案（`LOG_FILE` 環境變數）
- [ ] 實作日誌輪轉（避免檔案過大）
- [ ] 在 `errorHandler.js` 中使用日誌系統

**建議實作方式**：
```javascript
// utils/logger.js
const winston = require('winston');
const logLevel = process.env.LOG_LEVEL || 'info';
const logFile = process.env.LOG_FILE || 'logs/app.log';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: logFile }),
    new winston.transports.Console()
  ]
});
```

#### 2. 錯誤監控與告警
**目前狀態**：❌ 未實作
- 錯誤僅記錄，未發送告警

**需要補充**：
- [ ] 實作錯誤監控（可選：整合 Sentry 或類似服務）
- [ ] 嚴重錯誤時發送 Email 通知
- [ ] 錯誤統計與分析

#### 3. 速率限制實作
**目前狀態**：❌ 未實作
- 環境變數 `RATE_LIMIT_WINDOW_MS` 和 `RATE_LIMIT_MAX_REQUESTS` 已定義但未使用
- `errorHandler.js` 中有處理速率限制錯誤的邏輯，但未實作限制功能

**需要補充**：
- [ ] 實作速率限制中間件（使用 express-rate-limit）
- [ ] 根據環境變數配置限制參數
- [ ] 針對不同端點設定不同的限制規則
- [ ] 記錄速率限制觸發事件

**建議實作方式**：
```javascript
// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000; // 15分鐘
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

const limiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: '請求過於頻繁，請稍後再試'
});
```

#### 4. CORS 配置
**目前狀態**：⚠️ 使用預設設定
- `server.js` 中使用 `cors()` 無參數，允許所有來源
- 環境變數 `CORS_ORIGIN` 已定義但未使用

**需要補充**：
- [ ] 根據 `CORS_ORIGIN` 環境變數配置 CORS
- [ ] 生產環境限制允許的來源
- [ ] 開發環境允許所有來源

**建議實作方式**：
```javascript
// 在 server.js 中
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
};
app.use(cors(corsOptions));
```

#### 5. 錯誤追蹤與分析
**目前狀態**：❌ 未實作
- 錯誤僅記錄，未進行分析

**需要補充**：
- [ ] 實作錯誤統計功能
- [ ] 記錄錯誤頻率與類型
- [ ] 提供錯誤分析 API（管理員專用）

## 📝 總結

### 已完成
1. ✅ Gmail 應用程式密碼確認（連線成功）
2. ✅ 後端目錄 .env 更新（補充 DB_PORT 和 NODE_ENV）
3. ✅ 確認無廢棄環境變數代碼需要清理

### 需要補充實作

#### 備份功能（5 項）
1. 自動備份排程功能
2. 自動清理舊備份功能
3. 備份驗證功能
4. 備份通知功能
5. 備份路徑配置

#### 錯誤處理（5 項）
1. 日誌系統實作
2. 錯誤監控與告警
3. 速率限制實作
4. CORS 配置
5. 錯誤追蹤與分析

### 優先順序建議
1. **高優先級**：日誌系統實作、自動備份排程功能
2. **中優先級**：自動清理舊備份、速率限制實作、CORS 配置
3. **低優先級**：備份驗證、備份通知、錯誤監控、錯誤追蹤

### 注意事項
- 所有補充實作都應以不影響現有系統運行為前提
- 建議逐步實作，每次實作後進行測試
- 環境變數應提供合理的預設值，確保未設定時系統仍可正常運作

