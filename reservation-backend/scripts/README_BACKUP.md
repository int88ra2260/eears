# 資料庫備份腳本使用說明

## 📋 可用的備份腳本

### 1. PowerShell 腳本（Windows）

**檔案**：`scripts/backup-database.ps1`

**使用方法**：
```powershell
cd reservation-backend
.\scripts\backup-database.ps1
```

**參數**（可選）：
```powershell
.\scripts\backup-database.ps1 `
  -DbUser "root" `
  -DbPassword "your_password" `
  -DbName "activity_reservation" `
  -DbHost "localhost" `
  -BackupDir ".\backups"
```

**預設備份目錄**：`.\backups`（當前目錄下的 backups 資料夾）

**功能**：
- ✅ 自動生成帶時間戳的備份檔名
- ✅ 自動創建備份目錄
- ✅ 顯示備份進度和結果
- ✅ 列出備份目錄中的檔案

---

### 2. Node.js 腳本（跨平台）

**檔案**：`scripts/backup-database.js`

**使用方法**：
```bash
cd reservation-backend
node scripts/backup-database.js
```

**功能**：
- ✅ 跨平台支援（Windows/Linux/Mac）
- ✅ 自動從 `.env` 讀取資料庫配置
- ✅ 支援 mysqldump 和 Node.js 直接備份兩種方式
- ✅ 自動備份到 `G:\資料夾備份`（可在腳本中修改）

---

## 🔧 快速備份命令

### Windows PowerShell

**使用腳本（推薦）**：
```powershell
cd reservation-backend
.\scripts\backup-database.ps1
```

**使用命令行**：
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
mysqldump -u root -p activity_reservation > "backup_$timestamp.sql"
```

### Linux/Mac/Git Bash

**使用腳本（推薦）**：
```bash
cd reservation-backend
node scripts/backup-database.js
```

**使用命令行**：
```bash
mysqldump -u root -p activity_reservation > backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## ⚠️ 常見錯誤

### 錯誤：PowerShell 中 `$(date +%Y%m%d_%H%M%S)` 無法使用

**原因**：這是 Bash 語法，PowerShell 不支持

**解決方案**：
```powershell
# 使用 PowerShell 語法
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
mysqldump -u root -p activity_reservation > "backup_$timestamp.sql"

# 或使用備份腳本
.\scripts\backup-database.ps1
```

---

## 📝 備份檔名格式

- **PowerShell 腳本**：`backup_before_optimization_20241211_143025.sql`
- **Node.js 腳本**：`activity_reservation_backup_2024-12-11_14-30-25.sql`
- **手動命令**：根據使用的命令而定

---

**最後更新**：2024-12-11
