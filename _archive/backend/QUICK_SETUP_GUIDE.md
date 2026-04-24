# 快速設定指南：資料庫連接配置

## 🎯 目標

支援 **250 個學生同時進行預約**的並發負載。

## ⚡ 快速設定步驟

### 步驟 1：設定 MySQL max_connections

#### 選項 A：臨時設定（立即生效，重啟後失效）

```bash
# 連接到 MySQL
mysql -u root -p

# 執行 SQL 腳本
source scripts/set-mysql-max-connections.sql

# 或直接執行命令
SET GLOBAL max_connections = 350;
```

#### 選項 B：永久設定（推薦）

1. **找到 MySQL 配置文件**：
   - Windows: `C:\ProgramData\MySQL\MySQL Server X.X\my.ini`
   - Linux: `/etc/mysql/my.cnf` 或 `/etc/my.cnf`

2. **編輯配置文件**，在 `[mysqld]` 區段添加：
   ```ini
   [mysqld]
   max_connections = 350
   max_connect_errors = 10000
   ```

3. **重啟 MySQL 服務**：
   ```bash
   # Windows
   net stop MySQL
   net start MySQL
   
   # Linux
   sudo systemctl restart mysql
   ```

4. **驗證設定**：
   ```sql
   SHOW VARIABLES LIKE 'max_connections';
   ```

### 步驟 2：應用層配置已更新 ✅

`reservation-backend/db.js` 已更新為：
- `max: 120`
- `min: 20`

**無需手動修改**，只需重啟後端服務。

### 步驟 3：重啟後端服務

```bash
cd reservation-backend
npm start
# 或使用 PM2
pm2 restart reservation-backend
```

### 步驟 4：驗證配置

```sql
-- 檢查 MySQL 連接數設定
SHOW VARIABLES LIKE 'max_connections';

-- 檢查當前連接數
SHOW STATUS LIKE 'Threads_connected';

-- 檢查連接使用率
SELECT 
  VARIABLE_VALUE AS 'Current Connections',
  (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') AS 'Max Connections',
  ROUND(VARIABLE_VALUE / (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') * 100, 2) AS 'Usage %'
FROM information_schema.GLOBAL_STATUS 
WHERE VARIABLE_NAME = 'Threads_connected';
```

## 📊 配置摘要

| 項目 | 設定值 | 說明 |
|------|--------|------|
| MySQL max_connections | **350** | 資料庫最大連接數 |
| 應用層連接池 max | **120** | 應用程式最大連接數 |
| 應用層連接池 min | **20** | 應用程式最小連接數 |
| 預期並發處理能力 | **250-300** | 同時處理的請求數 |

## ⚠️ 重要提醒

1. **必須設定 MySQL max_connections**：應用層配置已更新，但 MySQL 端也需要設定
2. **重啟服務**：修改配置後需要重啟 MySQL 和後端服務
3. **監控連接使用率**：建議保持在 70% 以下
4. **CPU 監控**：I5 7500 為4核心，注意 CPU 使用率

## 🔍 故障排除

### 問題：設定後仍然出現 "Too many connections"

**檢查清單**：
1. ✅ MySQL max_connections 是否已設定為 350？
2. ✅ MySQL 服務是否已重啟？
3. ✅ 後端服務是否已重啟？
4. ✅ 檢查當前連接數：`SHOW STATUS LIKE 'Threads_connected';`

### 問題：如何確認配置是否生效？

```sql
-- 1. 檢查 MySQL 設定
SHOW VARIABLES LIKE 'max_connections';
-- 應該顯示：max_connections | 350

-- 2. 檢查應用層連接（需要查看應用日誌）
-- 或使用監控工具查看連接池狀態
```

## 📚 詳細文件

- `MYSQL_CONFIG_RECOMMENDATION.md` - 完整的配置說明和計算邏輯
- `OPTIMIZATION_LOG.md` - 優化記錄
- `scripts/set-mysql-max-connections.sql` - SQL 設定腳本

---

**最後更新**：2024-12-11
