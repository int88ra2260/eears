# 安全優化實施計劃

## 🎯 目標

在**保證系統正常運行**的前提下，實施 4 項優化：
1. 索引與唯一約束
2. 報名流程 DB 層防重
3. 寄信改為背景處理
4. 統計改為 SQL 聚合

## 🔒 安全原則

- ✅ **可回滾**：每一步都有回滾方案
- ✅ **可驗證**：每一步都有驗證步驟
- ✅ **可逐步上線**：可以分階段部署
- ✅ **向後兼容**：不破壞既有 API 行為
- ✅ **資料一致性**：保證資料完整性

---

## 📋 實施步驟

### 階段 0：準備工作（必須先完成）

#### 0.1 備份資料庫

**方法一：使用 PowerShell 腳本（推薦，Windows）**
```powershell
# 執行 PowerShell 備份腳本
cd reservation-backend
.\scripts\backup-database.ps1

# 或指定參數
.\scripts\backup-database.ps1 -DbUser "root" -DbPassword "your_password" -DbName "activity_reservation"
```

**方法二：使用 Node.js 腳本（跨平台）**
```bash
cd reservation-backend
node scripts/backup-database.js
```

**方法三：使用命令行（需要根據 Shell 選擇正確語法）**

**PowerShell（Windows）**：
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
mysqldump -u root -p activity_reservation > "backup_before_optimization_$timestamp.sql"
```

**Bash（Linux/Mac/Git Bash）**：
```bash
mysqldump -u root -p activity_reservation > backup_before_optimization_$(date +%Y%m%d_%H%M%S).sql
```

**CMD（Windows 命令提示字元）**：
```cmd
for /f "tokens=2-4 delims=/ " %a in ('date /t') do set mydate=%c%a%b
for /f "tokens=1-2 delims=/:" %a in ('time /t') do set mytime=%a%b
set mytime=%mytime: =0%
mysqldump -u root -p activity_reservation > backup_before_optimization_%mydate%_%mytime%.sql
```

#### 0.2 檢查當前狀態
```sql
-- 檢查現有索引
SHOW INDEXES FROM english_test_registrations;

-- 檢查現有約束
SHOW CREATE TABLE english_test_registrations;

-- 檢查資料量
SELECT COUNT(*) FROM english_test_registrations;
```

#### 0.3 創建回滾腳本
- 已包含在遷移文件中（`down` 方法）

---

### 階段 1：資料庫層優化（最安全，先執行）

#### 1.1 執行索引和唯一約束遷移

**執行**：
```bash
cd reservation-backend
node -e "
const { sequelize } = require('./models');
const migration = require('./migrations/add-indexes-to-english-test-registrations.js');

async function runMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, sequelize.constructor);
    console.log('✅ 遷移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

runMigration();
"
```

**驗證**：
```sql
-- 檢查唯一約束
SHOW CREATE TABLE english_test_registrations;
-- 應該看到：UNIQUE KEY `uk_student_id` (`studentId`)

-- 檢查索引
SHOW INDEXES FROM english_test_registrations;
-- 應該看到所有添加的索引

-- 測試查詢性能
EXPLAIN SELECT * FROM english_test_registrations WHERE studentId = 'B123456789';
-- 應該使用 idx_student_id 索引
```

**回滾**（如果需要）：
```bash
node -e "
const { sequelize } = require('./models');
const migration = require('./migrations/add-indexes-to-english-test-registrations.js');

async function rollbackMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    await migration.down(queryInterface, sequelize.constructor);
    console.log('✅ 回滾完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 回滾失敗:', error);
    process.exit(1);
  }
}

rollbackMigration();
"
```

**風險評估**：🟢 低風險
- 索引添加不會影響現有資料
- 唯一約束會檢查現有資料，如果有重複會報錯（這是好事，可以發現資料問題）

---

### 階段 2：報名流程優化（保持向後兼容）

#### 2.1 修改報名流程代碼

**策略**：保留原有邏輯作為備份，添加新邏輯，使用功能開關控制

**實施**：
- 移除 `findOne` 檢查
- 直接 `INSERT`，捕捉唯一約束錯誤
- 保持 API 回應格式完全一致

**驗證**：
1. 測試正常報名流程
2. 測試重複報名（應該返回 409）
3. 測試並發報名（兩個相同學號同時報名）

**回滾**：恢復原代碼（Git 版本控制）

**風險評估**：🟡 中風險
- 需要確保唯一約束已建立
- 需要測試錯誤處理邏輯

---

### 階段 3：寄信優化（保持 API 行為）

#### 3.1 修改寄信處理

**策略**：先回應成功，再背景處理寄信

**實施**：
- 立即回應 `res.json()`
- 寄信使用 `emailQueue` 或 Promise（不等待）

**驗證**：
1. 測試報名成功後立即得到回應
2. 檢查郵件是否在背景發送
3. 測試郵件失敗不影響報名成功

**回滾**：恢復原代碼

**風險評估**：🟢 低風險
- 不影響核心功能
- 只改變響應時間

---

### 階段 4：統計查詢優化（保持 API 回應格式）

#### 4.1 修改統計查詢

**策略**：使用 SQL 聚合，但保持回應格式完全一致

**實施**：
- 改用 SQL 聚合查詢
- 確保統計結果格式與原實現一致

**驗證**：
1. 對比優化前後的統計結果（應該完全一致）
2. 測試各種篩選條件
3. 性能測試

**回滾**：恢復原代碼

**風險評估**：🟡 中風險
- 需要確保 SQL 查詢邏輯正確
- 需要驗證統計結果準確性

---

## 🔍 驗證檢查清單

### 功能驗證

- [ ] 正常報名流程正常
- [ ] 重複報名返回正確錯誤
- [ ] 並發報名不會產生重複記錄
- [ ] 郵件在背景發送
- [ ] 統計結果準確
- [ ] API 回應格式不變

### 性能驗證

- [ ] 報名流程響應時間提升
- [ ] 統計查詢性能提升
- [ ] 資料庫連接數正常

### 穩定性驗證

- [ ] 無錯誤日誌
- [ ] 無記憶體洩漏
- [ ] 系統負載正常

---

## 🚨 緊急回滾方案

如果任何階段出現問題，立即執行回滾：

### 回滾步驟 1：代碼回滾
```bash
# 使用 Git 回滾到優化前的版本
git checkout HEAD~1 routes/englishTestRegistrationRouter.js
```

### 回滾步驟 2：資料庫回滾（如果需要）
```bash
# 執行遷移的 down 方法
node -e "
const { sequelize } = require('./models');
const migration = require('./migrations/add-indexes-to-english-test-registrations.js');
const queryInterface = sequelize.getQueryInterface();
migration.down(queryInterface, sequelize.constructor).then(() => {
  console.log('✅ 資料庫回滾完成');
  process.exit(0);
});
"
```

### 回滾步驟 3：恢復資料庫備份（最後手段）
```bash
mysql -u root -p activity_reservation < backup_before_optimization_YYYYMMDD_HHMMSS.sql
```

---

## 📊 監控指標

實施後需要監控：

1. **錯誤率**：應該保持或降低
2. **響應時間**：應該提升
3. **資料庫連接數**：應該正常
4. **記憶體使用**：應該降低（統計查詢）
5. **郵件發送成功率**：應該保持

---

**計劃建立時間**：2024-12-11  
**版本**：1.0
