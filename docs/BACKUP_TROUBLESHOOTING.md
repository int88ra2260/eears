# EEARS 備份疑難排解（Level 1）

本文件針對 `scripts\backup-db.bat` / `scripts\backup-db-dump.ps1` 的常見失敗情境提供檢查步驟。

## 1. 產出 0-byte `.sql` 或 `mysqldump` crash

若發生以下任一狀況：

- `.sql` 檔案大小為 0 bytes
- `mysqldump` 失敗並顯示 `0xC0000005`（STATUS_ACCESS_VIOLATION）

**第一優先**請先確認：你使用的 `mysqldump.exe` 是否與正式服務使用的 MySQL client 主版本一致。

建議檢查方式：

1. 確認程式崩潰時，log/錯誤訊息中是否有清楚顯示實際使用的 `mysqldump` 路徑（此專案已要求顯示）。
2. 確認正式服務 MySQL 路徑（見第 2 節）。
3. 確認 `MYSQDUMP_PATH` 指向正確的 mysqldump（見第 3 節）。

## 2. 用 `sc qc` 確認正式 MySQL 服務路徑

在 `cmd`（以系統管理員執行）輸入：

```bat
sc qc MySQL
```

找到輸出中的 `BINARY_PATH_NAME`，例如會類似：

```text
BINARY_PATH_NAME   : D:\mysql-8.0.41-winx64\bin\mysqld --defaults...
```

此路徑的 **主版本** 必須與 `mysqldump.exe` 的版本一致。

> 注意：不同環境 MySQL 服務名稱可能不是 `MySQL`。若執行 `sc qc MySQL` 找不到服務，可用 `sc query state= all | findstr /i mysql` 查詢後再 `sc qc <服務名稱>`。

## 3. 檢查 `MYSQDUMP_PATH` 是否指向正確版本

Level 1 備份腳本要求使用同版本 mysqldump。你可以用下列方式確認設定：

1. 打開 `scripts\backup-db.bat`，確認其中包含：

   ```bat
   set "MYSQDUMP_PATH=D:\mysql-8.0.41-winx64\bin\mysqldump.exe"
   ```

2. 或在排程/執行用帳號的環境變數確認 `MYSQDUMP_PATH`：

   ```bat
   echo %MYSQDUMP_PATH%
   ```

3. 再確認該檔案存在：

   ```bat
   dir "%MYSQDUMP_PATH%"
   ```

若 `MYSQDUMP_PATH` 指向錯誤版本（或不存在），腳本會在 log 中明確告知。

## 4. 仍失敗時

若確認版本一致仍失敗，請提供以下資訊以便進一步判斷：

- `backup.log` 中 `mysqldump` 相關段落（可遮蔽密碼）
- `D:\EEARS_backup\local\` 目錄下最新的檔名與大小

## 5. 判斷是 mysqldump 問題還是「腳本殘留 fallback」問題

請先區分錯誤來源：

1. 若 `backup.log` 出現 **Node fallback** 相關文字，例如：
   - `Node fallback script missing`
   - `eears-dump-node.js`
   - 或任何 `Invoke-NodeSqlDump` / `Node SQL dump` 相關訊息

   代表你的系統仍在跑**舊版 backup-db-dump.ps1**（含 fallback 邏輯）。此時應該**移除舊邏輯並更新腳本**，而不是嘗試補上 Node 腳本。

2. 若 `backup.log` / 錯誤訊息僅包含 `mysqldump` 的 crash / exit code，且訊息內已清楚顯示：
   - `mysqldump_path`（實際使用的 mysqldump 路徑）
   - `sql_output`（SQL 輸出路徑）
   - `exit_code`

   則代表是 `mysqldump` 本身或其 client/DLL / 版本一致性問題；應先確認是否確實使用與正式 MySQL Server 相同版本的 `mysqldump.exe`（見 `MYSQDUMP_PATH` 與第 1 節）。
