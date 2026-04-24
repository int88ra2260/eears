# 資料庫備份指南

## 概述

系統提供了自動化的資料庫備份功能，可以將資料庫內容備份到指定路徑。

## 備份位置

預設備份路徑：`G:\資料夾備份`

## 使用方法

### 方法 1：使用 npm 腳本（推薦）

```bash
cd reservation-backend
npm run backup
```

### 方法 2：直接執行腳本

```bash
cd reservation-backend
node scripts/backup-database.js
```

## 備份檔案格式

備份檔案命名格式：
```
activity_reservation_backup_YYYY-MM-DD_HH-MM-SS.sql
```

範例：
```
activity_reservation_backup_2025-12-11_17-32-30.sql
```

## 備份內容

備份檔案包含：
- 所有資料表的結構（CREATE TABLE 語句）
- 所有資料表的資料（INSERT 語句）
- 外鍵約束設定
- 資料庫設定

## 備份方式

系統會自動嘗試兩種備份方式：

1. **mysqldump**（優先）
   - 如果系統已安裝 MySQL 且 mysqldump 在 PATH 中
   - 使用 `--single-transaction` 確保資料一致性
   - 包含 stored procedures 和 triggers

2. **Node.js 直接備份**（備用）
   - 如果 mysqldump 不可用
   - 使用 Sequelize 直接查詢資料庫
   - 生成標準 SQL 備份檔案

## 備份資訊檔案

每次備份會同時創建一個資訊檔案：
```
backup_info_YYYY-MM-DD_HH-MM-SS.txt
```

包含：
- 備份時間
- 資料庫名稱
- 資料庫主機
- 備份檔案名稱
- 檔案大小
- 備份路徑

## 還原資料庫

### 使用 MySQL 命令列

```bash
mysql -u root -p activity_reservation < G:\資料夾備份\activity_reservation_backup_2025-12-11_17-32-30.sql
```

### 使用 MySQL Workbench

1. 開啟 MySQL Workbench
2. 連接到資料庫
3. 選擇 `Server` → `Data Import`
4. 選擇 `Import from Self-Contained File`
5. 選擇備份檔案
6. 選擇目標資料庫
7. 點擊 `Start Import`

## 自動備份（可選）

### Windows 工作排程器

1. 開啟「工作排程器」
2. 建立基本工作
3. 設定觸發條件（例如：每天凌晨 2 點）
4. 設定動作：啟動程式
5. 程式：`node`
6. 引數：`D:\EEARS\reservation-backend\scripts\backup-database.js`
7. 開始位置：`D:\EEARS\reservation-backend`

### 使用 cron（Linux/Mac）

```bash
# 編輯 crontab
crontab -e

# 添加以下行（每天凌晨 2 點備份）
0 2 * * * cd /path/to/reservation-backend && node scripts/backup-database.js
```

## 備份管理

### 查看備份檔案

備份腳本會自動列出備份目錄中的檔案，顯示：
- 檔案名稱
- 檔案大小
- 備份時間

### 清理舊備份

建議定期清理舊備份以節省空間：

```powershell
# PowerShell 範例：刪除 30 天前的備份
Get-ChildItem "G:\資料夾備份\activity_reservation_backup_*.sql" | 
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } | 
  Remove-Item
```

## 注意事項

1. **備份路徑**：確保備份路徑有足夠的寫入權限
2. **磁碟空間**：確保備份路徑有足夠的磁碟空間
3. **定期備份**：建議每天至少備份一次
4. **備份驗證**：定期檢查備份檔案是否完整
5. **異地備份**：建議將備份複製到其他位置或雲端

## 故障排除

### 問題：mysqldump 找不到

**解決方案：**
- 確認 MySQL 已安裝
- 確認 mysqldump 在系統 PATH 中
- 系統會自動使用 Node.js 備份作為備用方案

### 問題：備份檔案大小為 0

**可能原因：**
- 資料庫連線失敗
- 權限不足
- 備份路徑無法寫入

**解決方案：**
- 檢查資料庫連線設定（.env 檔案）
- 確認資料庫使用者有備份權限
- 確認備份路徑可寫入

### 問題：備份時間過長

**可能原因：**
- 資料庫很大
- 網路連線慢（遠端資料庫）

**解決方案：**
- 這是正常現象，請耐心等待
- 可以考慮只備份特定資料表

## 相關檔案

- `scripts/backup-database.js` - 備份腳本
- `package.json` - npm 腳本定義

## 技術細節

### 備份選項

**mysqldump 選項：**
- `--single-transaction`：確保備份時資料一致性
- `--routines`：包含 stored procedures 和 functions
- `--triggers`：包含 triggers

**Node.js 備份：**
- 使用 Sequelize ORM 查詢資料庫
- 生成標準 SQL 語句
- 支援所有資料類型和約束

