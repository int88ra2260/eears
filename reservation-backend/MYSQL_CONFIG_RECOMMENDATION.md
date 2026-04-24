# MySQL 連接配置建議

## 📊 伺服器規格分析

**硬體配置**：
- CPU: Intel I5 7500 (4核心4線程)
- RAM: 16GB
- 存儲體: 932GB
- **預期並發負載**: 250個學生同時進行預約

## 🔢 連接數計算

### 計算依據

1. **預期並發量**: 250個學生
2. **峰值緩衝**: 考慮峰值流量，增加 20-30% 緩衝
3. **系統預留**: 預留連接給管理操作和監控
4. **CPU 限制**: I5 7500 為4核心，過多連接會導致上下文切換開銷
5. **記憶體限制**: 每個 MySQL 連接約消耗 256KB-512KB

### 計算結果

**MySQL `max_connections` 建議值**: **300-350**

**計算邏輯**：
- 基礎需求：250個並發學生
- 峰值緩衝：250 × 1.3 = 325
- 系統預留：25-50個連接（管理、監控、備份等）
- **建議值：350**（留有安全邊際）

**應用層連接池配置**：
- `max`: **120**（約為 MySQL max_connections 的 1/3）
- `min`: **20**（保持基本連接池，減少連接建立開銷）

### 記憶體使用估算

- MySQL 連接記憶體：350 × 512KB ≈ **175MB**
- 應用層連接池記憶體：120 × 512KB ≈ **60MB**
- **總計約 235MB**（遠低於可用記憶體，安全）

---

## ⚙️ MySQL 配置設定

### 方法一：臨時設定（重啟後失效）

```sql
-- 連接到 MySQL
mysql -u root -p

-- 設定 max_connections
SET GLOBAL max_connections = 350;

-- 驗證設定
SHOW VARIABLES LIKE 'max_connections';
```

### 方法二：永久設定（推薦）

編輯 MySQL 配置文件：

**Windows (my.ini)**：
```ini
[mysqld]
max_connections = 350
max_connect_errors = 10000
```

**Linux (my.cnf)**：
```ini
[mysqld]
max_connections = 350
max_connect_errors = 10000
```

**配置文件位置**：
- Windows: `C:\ProgramData\MySQL\MySQL Server X.X\my.ini`
- Linux: `/etc/mysql/my.cnf` 或 `/etc/my.cnf`

**重啟 MySQL 服務**：
```bash
# Windows
net stop MySQL
net start MySQL

# Linux
sudo systemctl restart mysql
# 或
sudo service mysql restart
```

### 其他相關配置建議

```ini
[mysqld]
# 連接相關
max_connections = 350
max_connect_errors = 10000
connect_timeout = 10
wait_timeout = 600
interactive_timeout = 600

# 緩衝區配置（根據 16GB RAM）
innodb_buffer_pool_size = 4G
innodb_log_file_size = 512M
innodb_log_buffer_size = 64M

# 查詢緩存（MySQL 8.0 已移除，如果是舊版本）
# query_cache_size = 256M
# query_cache_type = 1
```

---

## 🔧 應用層連接池配置更新

根據計算結果，更新 `db.js` 配置：

```javascript
pool: {
  max: 120,         // 最大連接數：支援 250 個並發學生
  min: 20,          // 最小連接數：保持基本連接池
  acquire: 30000,   // 獲取連接的最大等待時間（30秒）
  idle: 10000,      // 連接空閒時間（10秒後釋放）
  evict: 1000,      // 檢查空閒連接的間隔（1秒）
  handleDisconnects: true  // 自動處理斷線重連
}
```

---

## 📈 性能監控

### 檢查當前連接數

```sql
-- 查看當前連接數
SHOW STATUS LIKE 'Threads_connected';

-- 查看最大連接數設定
SHOW VARIABLES LIKE 'max_connections';

-- 查看連接使用率
SELECT 
  VARIABLE_VALUE AS 'Current Connections',
  (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') AS 'Max Connections',
  ROUND(VARIABLE_VALUE / (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_VARIABLES WHERE VARIABLE_NAME = 'max_connections') * 100, 2) AS 'Usage %'
FROM information_schema.GLOBAL_STATUS 
WHERE VARIABLE_NAME = 'Threads_connected';

-- 查看所有活動連接
SHOW PROCESSLIST;
```

### 監控建議

1. **連接使用率**：應保持在 70% 以下
2. **等待連接數**：如果經常出現等待連接，需要增加 `max_connections`
3. **長時間運行的查詢**：檢查並優化慢查詢

---

## ⚠️ 注意事項

### CPU 限制考量

I5 7500 為4核心CPU，需要注意：
- **連接數過多**會導致上下文切換開銷增加
- **建議監控 CPU 使用率**，如果經常超過 80%，考慮：
  - 優化查詢性能
  - 減少連接數
  - 升級硬體

### 記憶體限制考量

16GB RAM 足夠應對 350 個連接，但需要考慮：
- **系統記憶體**：Windows/Linux 系統約需 2-4GB
- **應用程式記憶體**：Node.js 應用約需 1-2GB
- **MySQL 緩衝區**：建議設置 4-6GB
- **其他服務**：預留 2-4GB
- **可用記憶體**：約 6-8GB（足夠）

### 最佳實踐

1. **逐步調整**：先設置 300，觀察運行狀況後再調整
2. **監控優先**：設置監控告警，連接使用率超過 80% 時告警
3. **定期檢查**：每週檢查連接使用情況和慢查詢日誌
4. **備份配置**：修改前備份 MySQL 配置文件

---

## 🚀 實施步驟

### 步驟 1：更新 MySQL 配置

1. 編輯 MySQL 配置文件（my.ini 或 my.cnf）
2. 添加 `max_connections = 350`
3. 重啟 MySQL 服務
4. 驗證設定：`SHOW VARIABLES LIKE 'max_connections';`

### 步驟 2：更新應用層配置

1. 更新 `reservation-backend/db.js` 中的連接池配置
2. 重啟後端服務
3. 監控連接使用情況

### 步驟 3：驗證和監控

1. 進行負載測試（模擬 250 個並發請求）
2. 監控連接數使用情況
3. 監控 CPU 和記憶體使用率
4. 根據實際情況調整配置

---

## 📊 預期效果

### 優化前
- MySQL max_connections: 預設值（通常 151）
- 應用層連接池 max: 50
- **並發處理能力**: 約 50-100 個同時請求

### 優化後
- MySQL max_connections: 350
- 應用層連接池 max: 120
- **並發處理能力**: 約 250-300 個同時請求 ✅

---

## 🔍 故障排除

### 問題：連接數不足

**症狀**：
- 錯誤訊息：`Too many connections`
- 應用無法連接到資料庫

**解決方案**：
1. 檢查當前連接數：`SHOW STATUS LIKE 'Threads_connected';`
2. 如果接近 max_connections，增加設定值
3. 檢查是否有連接洩漏（長時間未釋放的連接）

### 問題：CPU 使用率過高

**症狀**：
- CPU 使用率持續超過 80%
- 系統響應緩慢

**解決方案**：
1. 檢查慢查詢：`SHOW PROCESSLIST;`
2. 優化慢查詢（添加索引、優化 SQL）
3. 如果必要，減少 max_connections（但需平衡連接需求）

### 問題：記憶體使用過高

**症狀**：
- 系統記憶體不足
- MySQL 可能被系統殺掉

**解決方案**：
1. 減少 `innodb_buffer_pool_size`
2. 減少 `max_connections`
3. 檢查是否有記憶體洩漏

---

**配置建議時間**：2024-12-11  
**適用環境**：生產環境  
**建議者**：AI Assistant
