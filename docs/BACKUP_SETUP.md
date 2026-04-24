# EEARS Level 1 備份：rclone 與 Google Drive 設定

本文件說明如何在 **Windows Server／Windows 10+** 上安裝 **rclone**，並將 `D:\EEARS_backup\local` 同步到 **Google Drive**（remote 名稱：`gdrive`）。

## 前置需求

- 已安裝 **MySQL Client**（含 `mysqldump`），且可從命令列執行。
- **Windows 10 1803+** 或 **Windows Server 2019+**（內建 `tar`，可用於產生 `.sql.gz`）。
- 備份腳本會讀取 **`reservation-backend\.env`** 中的 `DB_HOST`、`DB_PORT`、`DB_USER`、`DB_PASSWORD`、`DB_NAME`（可透過環境變數 `EEARS_ENV_FILE` 指定其他 `.env` 路徑）。
- Level 1 備份只使用 **`mysqldump`**（由 `MYSQDUMP_PATH` 指定完整路徑），**已移除 Node fallback**。
- 若 `mysqldump` 失敗或輸出 `.sql` 為 **0 bytes**，備份流程會直接失敗並停止後續壓縮／上傳。

## 1. 安裝 rclone

1. 開啟 [https://rclone.org/downloads/](https://rclone.org/downloads/)，下載 **Windows AMD64** ZIP。
2. 解壓縮後，將 `rclone.exe` 放到固定目錄（例如 `C:\Tools\rclone\`）。
3. 將該目錄加入系統 **PATH**，或在「工作排程器」的工作目錄／`PATH` 中一併設定，使排程執行時可找到 `rclone`。

驗證：

```bat
rclone version
```

## 2. 設定 Google Drive（remote 名稱：gdrive）

1. 在具備管理員權限的命令提示字元或 PowerShell 執行：

   ```bat
   rclone config
   ```

2. 選擇 **New remote**，名稱輸入 **`gdrive`**（須與 `scripts\backup-db.bat` 內一致）。
3. 儲存類型選 **Google Drive**（依 rclone 版本選單可能顯示編號，請選對應 Google Drive 的選項）。
4. 依提示完成 **OAuth 瀏覽器授權**（或使用 rclone 文件中的服務帳號／進階流程；生產環境請限制該 Google 帳號與資料夾權限）。
5. 完成後可用下列指令測試（會列出遠端根目錄）：

   ```bat
   rclone lsd gdrive:
   ```

## 3. 與備份腳本的對應關係

`scripts\backup-db.bat` 內含（概念上等同）：

```bat
rclone copy D:\EEARS_backup\local gdrive:EEARS_backup
```

實際執行會帶入變數與 log：

- 來源：`%LOCAL_DIR%`（預設 `D:\EEARS_backup\local`）
- 目的：`gdrive:EEARS_backup`（Google Drive 上名為 `EEARS_backup` 的資料夾，若不存在 rclone 通常會建立）
- 詳細傳輸 log：`D:\EEARS_backup\logs\rclone.log`

若未安裝 rclone 或 remote 未設定，腳本會**記錄警告並略過雲端**，不中斷整體流程（本地與 USB 仍會依前面步驟處理）。

## 4. 安全注意事項

- **勿**將資料庫密碼寫入 `.bat`；密碼僅應存在 `.env`（或您以 `EEARS_ENV_FILE` 指定的檔案），並限制檔案 ACL（僅備份帳號／管理員可讀）。
- `.env` 若誤提交版本庫會外洩機密；請確認 `.gitignore` 已排除。
- Google Drive 上的備份檔仍為敏感資料，請啟用 **Google 帳號雙因素驗證**，並定期檢閱共用連結與權限。

## 5. MySQL 版本一致性（必要）

目前正式服務的 MySQL client 安裝路徑為：

- `D:\mysql-8.0.41-winx64\bin\mysqld`

備份工具必須優先使用與正式服務相同版本的 mysqldump，例如：

- `D:\mysql-8.0.41-winx64\bin\mysqldump.exe`

Level 1 備份唯一正式預設路徑為 `D:\mysql-8.0.41-winx64\bin\mysqldump.exe`（由 `scripts\backup-db.bat` 的 `MYSQDUMP_PATH` 指定）。

若主機存在多個 MySQL 版本，**不可**任意使用其他版本（例如其他 `Program Files\MySQL...`）的 `mysqldump.exe`，否則可能導致：

- `mysqldump` crash（0xC0000005）
- 產出 0-byte `.sql`（空白備份）

## 6. 故障排除

| 現象 | 處理方向 |
|------|----------|
| `rclone` 不是內部或外部命令 | 將 `rclone.exe` 所在目錄加入 PATH，或改以完整路徑呼叫。 |
| `Failed to copy: ...` | 檢查 `D:\EEARS_backup\logs\rclone.log`、網路、OAuth 是否過期。 |
| `gdrive:` 找不到 | 確認 `rclone config` 中 remote 名稱為 **`gdrive`**。 |
