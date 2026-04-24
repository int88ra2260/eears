# 優化快速啟動指南

## 🚀 5 分鐘快速實施

### 步驟 1：備份資料庫（必須）

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
mysqldump -u root -p activity_reservation > "backup_$timestamp.sql"
```

**Bash（Linux/Mac/Git Bash）**：
```bash
mysqldump -u root -p activity_reservation > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 步驟 2：執行資料庫遷移

```bash
cd reservation-backend
node scripts/run-migration.js
```

### 步驟 3：驗證遷移

```bash
node scripts/verify-optimization.js
```

### 步驟 4：重啟服務

```bash
npm start
# 或
pm2 restart reservation-backend
```

### 步驟 5：測試功能

```bash
# 測試報名（使用 Postman 或 curl）
# 測試重複報名（應該返回 409）
# 測試統計查詢（應該更快）
```

---

## 🔄 如果需要回滾

### 回滾代碼
```bash
git checkout HEAD -- routes/englishTestRegistrationRouter.js
npm start
```

### 回滾資料庫
```bash
node scripts/rollback-migration.js
```

---

## 📋 已完成的優化

✅ **索引與唯一約束** - 遷移文件已準備  
✅ **報名流程 DB 層防重** - 代碼已修改  
✅ **寄信背景處理** - 代碼已修改  
✅ **統計 SQL 聚合** - 代碼已修改  

---

## 📚 詳細文檔

- `OPTIMIZATION_IMPLEMENTATION_SUMMARY.md` - 實施總結
- `OPTIMIZATION_CHECKLIST.md` - 完整檢查清單
- `SAFE_OPTIMIZATION_PLAN.md` - 安全實施計劃
- `OPTIMIZATION_REVIEW_SUMMARY.md` - 優化建議審視

---

**最後更新**：2024-12-11
