# backup-database-simple.ps1
# 簡化版 Windows PowerShell 資料庫備份腳本

# 設定資料庫連接資訊
$dbName = "activity_reservation"
$dbUser = "root"

# 生成備份檔名
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "backup_before_optimization_$timestamp.sql"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "資料庫備份腳本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "資料庫: $dbName" -ForegroundColor Gray
Write-Host "備份檔案: $backupFile" -ForegroundColor Gray
Write-Host ""

# 檢查 mysqldump
try {
    $null = Get-Command mysqldump -ErrorAction Stop
} catch {
    Write-Host "[錯誤] 找不到 mysqldump 命令" -ForegroundColor Red
    Write-Host "請確認 MySQL 已安裝並在 PATH 中" -ForegroundColor Yellow
    exit 1
}

Write-Host "[執行中] 開始備份..." -ForegroundColor Cyan
Write-Host ""

# 構建命令（使用臨時批次檔來處理重定向）
$batchFile = "temp_backup_$timestamp.bat"
$batchContent = @"
@echo off
mysqldump -u $dbUser -p $dbName > "$backupFile"
"@

$batchContent | Out-File -FilePath $batchFile -Encoding ASCII

# 執行批次檔
& cmd.exe /c $batchFile

# 等待一下確保檔案寫入完成
Start-Sleep -Seconds 2

# 清理臨時批次檔
Remove-Item $batchFile -ErrorAction SilentlyContinue

# 檢查結果
if (Test-Path $backupFile) {
    $fileSize = (Get-Item $backupFile).Length / 1MB
    if ($fileSize -gt 0) {
        Write-Host ""
        Write-Host "[成功] 備份完成！" -ForegroundColor Green
        Write-Host "檔案位置: $PWD\$backupFile" -ForegroundColor Gray
        Write-Host "檔案大小: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "[錯誤] 備份失敗，檔案為空" -ForegroundColor Red
        Write-Host "請檢查 MySQL 連接資訊和密碼" -ForegroundColor Yellow
        Remove-Item $backupFile -ErrorAction SilentlyContinue
        exit 1
    }
} else {
    Write-Host ""
    Write-Host "[錯誤] 備份失敗" -ForegroundColor Red
    Write-Host "請檢查：" -ForegroundColor Yellow
    Write-Host "  1. MySQL root 密碼是否正確" -ForegroundColor Yellow
    Write-Host "  2. 資料庫名稱是否正確: $dbName" -ForegroundColor Yellow
    Write-Host "  3. MySQL 服務是否運行中" -ForegroundColor Yellow
    exit 1
}
