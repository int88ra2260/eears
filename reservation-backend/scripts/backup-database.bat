@echo off
REM backup-database.bat
REM Windows 批次檔資料庫備份腳本

REM 設定資料庫名稱
set DB_NAME=activity_reservation
set DB_USER=root

REM 生成備份檔名（使用 Windows 日期格式）
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=backup_before_optimization_%timestamp%.sql

echo.
echo ========================================
echo 資料庫備份腳本
echo ========================================
echo.
echo 資料庫: %DB_NAME%
echo 備份檔案: %BACKUP_FILE%
echo.

REM 提示輸入密碼
set /p DB_PASSWORD=請輸入 MySQL root 密碼: 

echo.
echo 正在備份資料庫...

REM 執行備份
mysqldump -u %DB_USER% -p%DB_PASSWORD% %DB_NAME% > %BACKUP_FILE%

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [成功] 備份完成！
    echo 檔案位置: %CD%\%BACKUP_FILE%
    echo.
) else (
    echo.
    echo [錯誤] 備份失敗，請檢查：
    echo    1. MySQL 是否已安裝
    echo    2. mysqldump 是否在 PATH 中
    echo    3. 資料庫連接資訊是否正確
    echo.
    pause
    exit /b 1
)

pause
