# 備份腳本修正說明

## 🐛 問題描述

在 PowerShell 中執行備份命令時出現錯誤：
```
Get-Date : 無法繫結 'Date' 參數。無法將 "+%Y%m%d_%H%M%S" 值轉換為 "System.DateTime" 型別。
```

**原因**：使用了 Bash 語法 `$(date +%Y%m%d_%H%M%S)`，但 PowerShell 不支持這種語法。

---

## ✅ 解決方案

### 方案一：使用 PowerShell 備份腳本（推薦）

**已創建**：`scripts/backup-database.ps1`

**使用方法**：
```powershell
cd reservation-backend
.\scripts\backup-database.ps1
```

**優點**：
- ✅ 自動處理日期時間格式
- ✅ 自動創建備份目錄
- ✅ 顯示備份進度和結果
- ✅ 列出備份目錄中的檔案

---

### 方案二：使用 Node.js 備份腳本（跨平台）

**已存在**：`scripts/backup-database.js`

**使用方法**：
```bash
cd reservation-backend
node scripts/backup-database.js
```

**優點**：
- ✅ 跨平台（Windows/Linux/Mac）
- ✅ 自動處理日期時間格式
- ✅ 支援多種備份方式（mysqldump 或 Node.js 直接備份）

---

### 方案三：使用正確的命令行語法

#### PowerShell（Windows）

**錯誤語法**（會出錯）：
```powershell
mysqldump -u root -p activity_reservation > backup_$(date +%Y%m%d_%H%M%S).sql
```

**正確語法**：
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
mysqldump -u root -p activity_reservation > "backup_$timestamp.sql"
```

#### Bash（Linux/Mac/Git Bash）

```bash
mysqldump -u root -p activity_reservation > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### CMD（Windows 命令提示字元）

```cmd
for /f "tokens=2-4 delims=/ " %a in ('date /t') do set mydate=%c%a%b
for /f "tokens=1-2 delims=/:" %a in ('time /t') do set mytime=%a%b
set mytime=%mytime: =0%
mysqldump -u root -p activity_reservation > backup_%mydate%_%mytime%.sql
```

---

## 📋 已更新的文檔

以下文檔已更新，提供正確的 PowerShell 語法：

1. ✅ `SAFE_OPTIMIZATION_PLAN.md` - 安全實施計劃
2. ✅ `QUICK_START_OPTIMIZATION.md` - 快速啟動指南
3. ✅ `OPTIMIZATION_CHECKLIST.md` - 檢查清單
4. ✅ `OPTIMIZATION_IMPLEMENTATION_SUMMARY.md` - 實施總結
5. ✅ `OPTIMIZATION_COMPLETE.md` - 完成報告

---

## 🚀 快速使用

### Windows PowerShell（推薦）

```powershell
cd reservation-backend
.\scripts\backup-database.ps1
```

### 跨平台（Node.js）

```bash
cd reservation-backend
node scripts/backup-database.js
```

---

## 📝 PowerShell 日期時間格式說明

PowerShell 使用 `Get-Date -Format` 來格式化日期時間：

| 格式字串 | 說明 | 範例 |
|---------|------|------|
| `yyyyMMdd_HHmmss` | 年月日_時分秒 | 20241211_143025 |
| `yyyy-MM-dd HH:mm:ss` | 標準格式 | 2024-12-11 14:30:25 |
| `yyyyMMdd` | 僅日期 | 20241211 |

**常用格式**：
```powershell
# 日期時間戳（用於檔名）
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

# 可讀格式
$readable = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
```

---

**修正時間**：2024-12-11  
**狀態**：✅ 已修正
