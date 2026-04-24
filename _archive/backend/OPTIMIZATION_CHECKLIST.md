# 優化實施檢查清單

## ✅ 實施前準備

- [ ] **備份資料庫**

  **方法一：使用 PowerShell 腳本（推薦，Windows）**
  ```powershell
  cd reservation-backend
  .\scripts\backup-database.ps1
  ```

  **方法二：使用 Node.js 腳本（跨平台）**
  ```bash
  cd reservation-backend
  node scripts/backup-database.js
  ```

  **方法三：使用命令行**

  **PowerShell（Windows）**：
  ```powershell
  $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
  mysqldump -u root -p activity_reservation > "backup_before_optimization_$timestamp.sql"
  ```

  **Bash（Linux/Mac/Git Bash）**：
  ```bash
  mysqldump -u root -p activity_reservation > backup_before_optimization_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **檢查當前資料庫狀態**
  ```sql
  SHOW INDEXES FROM english_test_registrations;
  SELECT COUNT(*) FROM english_test_registrations;
  ```

- [ ] **檢查是否有重複的 studentId**（如果有，需要先清理）
  ```sql
  SELECT studentId, COUNT(*) as count
  FROM english_test_registrations
  GROUP BY studentId
  HAVING count > 1;
  ```

---

## 🚀 實施步驟

### 步驟 1：執行資料庫遷移

- [ ] **執行遷移**
  ```bash
  cd reservation-backend
  node scripts/run-migration.js
  ```

- [ ] **驗證遷移結果**
  ```bash
  node scripts/verify-optimization.js
  ```

- [ ] **檢查遷移日誌**
  - 確認所有索引和約束都成功添加
  - 如果有錯誤，檢查錯誤訊息

---

### 步驟 2：重啟後端服務

- [ ] **重啟服務**
  ```bash
  # 如果使用 npm
  npm start
  
  # 如果使用 PM2
  pm2 restart reservation-backend
  ```

- [ ] **檢查服務日誌**
  - 確認服務正常啟動
  - 確認資料庫連接成功
  - 確認無錯誤訊息

---

### 步驟 3：功能驗證

#### 3.1 測試報名流程

- [ ] **正常報名**
  - 使用新的學號報名
  - 確認返回成功訊息
  - 確認記錄已建立

- [ ] **重複報名**
  - 使用相同學號再次報名
  - 確認返回 409 錯誤："您已經報名過了"
  - 確認錯誤格式正確

- [ ] **並發報名**（可選，建議測試）
  - 同時發送兩個相同學號的報名請求
  - 確認只有一個成功
  - 確認另一個返回 409

#### 3.2 測試寄信功能

- [ ] **檢查 API 響應時間**
  - 報名成功後立即得到回應（不等待寄信）
  - 響應時間應該明顯縮短

- [ ] **檢查郵件佇列**
  - 查看日誌，確認郵件加入佇列
  - 確認郵件最終發送成功

- [ ] **測試郵件失敗場景**（可選）
  - 模擬郵件服務失敗
  - 確認報名仍然成功
  - 確認錯誤被正確記錄

#### 3.3 測試統計查詢

- [ ] **檢查統計結果正確性**
  - 訪問報名列表 API
  - 對比優化前後的統計數值（應該完全一致）
  - 測試各種篩選條件

- [ ] **檢查查詢性能**
  - 查看 API 響應時間（應該明顯縮短）
  - 檢查資料庫查詢日誌
  - 確認使用索引

- [ ] **測試不同資料量**
  - 少量資料（< 100 筆）
  - 中等資料（100-1000 筆）
  - 大量資料（> 1000 筆）

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
- [ ] 記憶體使用降低（統計查詢）

### 穩定性驗證

- [ ] 無錯誤日誌
- [ ] 無記憶體洩漏
- [ ] 系統負載正常
- [ ] 郵件佇列正常運作

---

## 🚨 問題排查

### 問題 1：遷移失敗 - 唯一約束錯誤

**症狀**：執行遷移時出現 "Duplicate entry" 錯誤

**原因**：資料庫中存在重複的 studentId

**解決方案**：
```sql
-- 1. 檢查重複資料
SELECT studentId, COUNT(*) as count
FROM english_test_registrations
GROUP BY studentId
HAVING count > 1;

-- 2. 清理重複資料（保留最新的）
DELETE t1 FROM english_test_registrations t1
INNER JOIN english_test_registrations t2
WHERE t1.studentId = t2.studentId
AND t1.id < t2.id;

-- 3. 重新執行遷移
```

### 問題 2：報名時出現唯一約束錯誤

**症狀**：報名時返回 409 錯誤，但學生認為沒有報名過

**原因**：可能是舊資料或測試資料

**解決方案**：
```sql
-- 檢查該學號的報名記錄
SELECT * FROM english_test_registrations WHERE studentId = '學號';
```

### 問題 3：統計結果不正確

**症狀**：統計數值與預期不符

**原因**：SQL 聚合查詢邏輯錯誤

**解決方案**：
1. 檢查 SQL 查詢邏輯
2. 對比優化前後的統計結果
3. 檢查 WHERE 條件構建是否正確

### 問題 4：郵件沒有發送

**症狀**：報名成功但沒有收到郵件

**原因**：郵件佇列問題或配置問題

**解決方案**：
1. 檢查郵件佇列日誌
2. 檢查 emailQueue 配置
3. 檢查郵件服務配置（Gmail 帳號、密碼等）

---

## 📊 監控指標

實施後需要監控以下指標（建議監控 24-48 小時）：

### 性能指標

- [ ] API 響應時間（應該降低）
- [ ] 資料庫查詢時間（應該降低）
- [ ] 記憶體使用（應該降低）
- [ ] CPU 使用率（應該正常）

### 錯誤指標

- [ ] 錯誤率（應該保持或降低）
- [ ] 唯一約束錯誤次數（正常情況應該很少）
- [ ] 郵件發送失敗率（應該保持或降低）

### 業務指標

- [ ] 報名成功率（應該保持 100%）
- [ ] 重複報名錯誤率（應該正常）
- [ ] 統計查詢準確性（應該 100%）

---

## ✅ 完成確認

所有步驟完成後，確認：

- [ ] 所有功能測試通過
- [ ] 性能提升符合預期
- [ ] 無錯誤日誌
- [ ] 系統穩定運行
- [ ] 監控指標正常

---

**檢查清單建立時間**：2024-12-11  
**版本**：1.0
