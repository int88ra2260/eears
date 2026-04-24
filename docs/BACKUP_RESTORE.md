# EEARS 資料庫還原與測試指引

本文件說明如何將 **Level 1 備份**（`eears_YYYY-MM-DD_HH-mm.sql.gz`）還原至 MySQL，以及建議的驗證流程。

## 1. 備份檔格式

- 檔名範例：`eears_2026-03-30_03-00.sql.gz`
- 內容為 **gzip 壓縮的 SQL**（mysqldump 產出）。

## 2. 解壓縮（取得 .sql）

### Windows 10+（內建 tar）

在 PowerShell 或命令提示字元：

```bat
cd /d D:\EEARS_backup\local
tar -xzf eears_2026-03-30_03-00.sql.gz
```

完成後會得到同名之 `.sql` 檔（或依 tar 行為產生對應檔名）。

### 7-Zip

以 7-Zip 解壓 `.gz` 後，再取得 `.sql` 文字檔。

## 3. 使用 mysql 用戶端還原

### 3.1 還原至「空白資料庫」（較安全）

1. 建立目標資料庫（名稱建議與 `.env` 的 `DB_NAME` 一致，例如 `activity_reservation`）：

   ```bat
   mysql -h localhost -u root -p -e "CREATE DATABASE IF NOT EXISTS activity_reservation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

2. 還原：

   ```bat
   mysql -h localhost -u root -p activity_reservation < eears_2026-03-30_03-00.sql
   ```

### 3.2 管線直接還原（不解壓成檔案）

若已安裝可讀 gzip 的工具鏈，可視環境使用；Windows 上較直觀的方式仍為先 **tar -xzf** 再 **mysql < file.sql**。

## 4. 建議測試流程（正式環境前必做）

1. **在測試機或本機第二個 MySQL 實例**建立新資料庫（勿直接覆蓋正式庫）。
2. 還原備份檔至該測試庫。
3. 抽查：
   - 資料表數量與關鍵資料筆數是否合理；
   - 應用程式以測試 `.env` 指向該庫，執行登入／查詢等**唯讀**操作。
4. 記錄測試日期、備份檔名、測試人員。

## 5. 注意事項（覆蓋風險）

| 風險 | 說明 |
|------|------|
| **覆蓋正式資料** | 還原至「已存在且使用中」的資料庫會**取代**其中物件與資料（依 dump 內容）。正式還原前務必**再備份一次現況**或於停機維護時段執行。 |
| **版本不相容** | mysqldump 來源與目標 MySQL 主版本差異過大時，可能需調整參數或升級測試。 |
| **字元集** | 若還原後亂碼，請確認資料庫／連線字元集為 `utf8mb4`。 |
| **權限與帳號** | 還原後使用者密碼、權限與備份當下一致；若與現行應用 `.env` 不一致，需同步調整。 |

## 6. 還原後應用程式

- 將 `DB_HOST`、`DB_NAME` 等指向還原後之**實例與資料庫名稱**。
- 重新啟動 Node 後端服務，並確認健康檢查或 API 抽樣。

## 7. 與既有腳本的關係

- 專案內另有 `reservation-backend\scripts\backup-database.js`（備份至 `G:\資料夾備份` 等），與本 Level 1 路徑 `D:\EEARS_backup\` **獨立**；還原時請確認**實際使用的備份檔**來源與時間點。
