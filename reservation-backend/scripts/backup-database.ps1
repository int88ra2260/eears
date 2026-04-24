# backup-database.ps1
# PowerShell 資料庫備份腳本

param(
    [string]$DbUser = "root",
    [string]$DbPassword = "",
    [string]$DbName = "activity_reservation",
    [string]$DbHost = "localhost",
    [string]$BackupDir = ".\backups"
)

# 載入環境變數（如果存在 .env 檔案）
if (Test-Path ".\.env") {
    Get-Content ".\.env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# 從環境變數讀取配置（如果存在）
if ($env:DB_USER) { $DbUser = $env:DB_USER }
if ($env:DB_PASSWORD) { $DbPassword = $env:DB_PASSWORD }
if ($env:DB_NAME) { $DbName = $env:DB_NAME }
if ($env:DB_HOST) { $DbHost = $env:DB_HOST }

# 生成備份檔案名稱（使用 PowerShell 日期格式）
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFileName = "backup_before_optimization_$timestamp.sql"
$backupFilePath = Join-Path $BackupDir $backupFileName

# 創建備份目錄（如果不存在）
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "✅ 創建備份目錄: $BackupDir" -ForegroundColor Green
}

Write-Host "🗄️  開始備份資料庫..." -ForegroundColor Cyan
Write-Host "📊 資料庫: $DbName" -ForegroundColor Yellow
Write-Host "📁 備份路徑: $backupFilePath" -ForegroundColor Yellow
Write-Host ""

# 檢查 mysqldump 是否可用
$mysqldumpPath = Get-Command mysqldump -ErrorAction SilentlyContinue
if (-not $mysqldumpPath) {
    Write-Host "❌ 錯誤: 找不到 mysqldump 命令" -ForegroundColor Red
    Write-Host "💡 請確認 MySQL 已安裝並在 PATH 環境變數中" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "或者使用 Node.js 備份腳本:" -ForegroundColor Yellow
    Write-Host "   node scripts/backup-database.js" -ForegroundColor Cyan
    exit 1
}

# 構建 mysqldump 命令
# 注意：在 PowerShell 中，密碼應該通過環境變數傳遞，而不是命令行參數
$env:MYSQL_PWD = $DbPassword

try {
    Write-Host "⏳ 正在備份資料庫..." -ForegroundColor Yellow
    
    # 執行 mysqldump（將輸出重定向到檔案）
    $mysqldumpCmd = "mysqldump -h $DbHost -u $DbUser --single-transaction --routines --triggers $DbName"
    
    # 執行命令並將輸出寫入檔案
    & cmd /c "$mysqldumpCmd > `"$backupFilePath`""
    
    # 檢查命令是否成功執行
    if ($LASTEXITCODE -eq 0) {
        if (Test-Path $backupFilePath) {
            $fileInfo = Get-Item $backupFilePath
            $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
            
            Write-Host ""
            Write-Host "✅ 備份完成！" -ForegroundColor Green
            Write-Host "📄 檔案名稱: $backupFileName" -ForegroundColor Cyan
            Write-Host "📦 檔案大小: $fileSizeMB MB" -ForegroundColor Cyan
            Write-Host "📅 備份時間: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
            Write-Host "💾 備份位置: $backupFilePath" -ForegroundColor Cyan
            Write-Host ""
            
            # 列出備份目錄中的檔案
            $backupFiles = Get-ChildItem -Path $BackupDir -Filter "backup_*.sql" | Sort-Object LastWriteTime -Descending
            if ($backupFiles.Count -gt 0) {
                Write-Host "📋 備份目錄中的檔案 (最新 5 個):" -ForegroundColor Yellow
                $backupFiles | Select-Object -First 5 | ForEach-Object {
                    $sizeMB = [math]::Round($_.Length / 1MB, 2)
                    Write-Host "   - $($_.Name) ($sizeMB MB, $($_.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss')))" -ForegroundColor Gray
                }
            }
        } else {
            Write-Host "❌ 錯誤: 備份檔案未成功創建" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ 錯誤: mysqldump 執行失敗 (退出代碼: $LASTEXITCODE)" -ForegroundColor Red
        Write-Host "💡 請檢查資料庫連線資訊和權限" -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "❌ 備份失敗: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 可能的解決方案:" -ForegroundColor Yellow
    Write-Host "   1. 確認 MySQL 已安裝並在 PATH 中" -ForegroundColor Gray
    Write-Host "   2. 確認資料庫連線資訊正確" -ForegroundColor Gray
    Write-Host "   3. 確認有備份權限" -ForegroundColor Gray
    Write-Host "   4. 使用 Node.js 備份腳本: node scripts/backup-database.js" -ForegroundColor Gray
    exit 1
} finally {
    # 清除環境變數中的密碼
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
}
