@echo off
chcp 65001 >nul 2>&1
set "MYSQDUMP_PATH=D:\mysql-8.0.41-winx64\bin\mysqldump.exe"
setlocal EnableExtensions EnableDelayedExpansion

REM EEARS Level 1 DB backup (Windows). Log lines are ASCII-only so cmd->PowerShell args stay valid on zh-TW.
REM Node fallback was removed; the script fails immediately if mysqldump fails.
REM If mysqldump crashes (exit -1073741819 / 0xC0000005), make sure MYSQDUMP_PATH points to the SAME MySQL client version used by the server.

set "SCRIPT_DIR=%~dp0"
set "LOG_DIR=D:\EEARS_backup\logs"
set "LOCAL_DIR=D:\EEARS_backup\local"
set "USB_ROOT=E:\EEARS_backup"
set "ENV_FILE=%SCRIPT_DIR%..\reservation-backend\.env"

if defined EEARS_ENV_FILE set "ENV_FILE=%EEARS_ENV_FILE%"

if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" 2>nul
if not exist "%LOCAL_DIR%" mkdir "%LOCAL_DIR%" 2>nul

call :log_ps INFO "======== backup job start ========"
call :log_ps INFO "ENV_FILE=%ENV_FILE%"

if not exist "%ENV_FILE%" (
  call :log_ps ERROR "Missing .env (set EEARS_ENV_FILE to override path)"
  call :log_ps ERROR "Abort: cannot read DB credentials."
  exit /b 1
)

set "GZ_FILE="
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%backup-db-dump.ps1" -EnvFile "%ENV_FILE%" -OutputDir "%LOCAL_DIR%" > "%TEMP%\eears_last_backup.txt" 2> "%TEMP%\eears_last_err.txt"
set DUMP_ERR=!ERRORLEVEL!
if not "!DUMP_ERR!"=="0" (
  call :log_ps ERROR "mysqldump or gzip step failed."
  if exist "%TEMP%\eears_last_err.txt" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Test-Path -LiteralPath ([System.IO.Path]::Combine($env:TEMP,'eears_last_err.txt'))) { Get-Content -LiteralPath ([System.IO.Path]::Combine($env:TEMP,'eears_last_err.txt')) -Raw -Encoding UTF8 | Add-Content -LiteralPath '%LOG_DIR%\backup.log' -Encoding UTF8 }" 2>nul
  )
  call :log_ps WARN "Skipped USB, rclone, retention (no new backup file)."
  call :log_ps INFO "======== backup job end (FAILED) ========"
  exit /b 1
)

set "GZ_FILE="
for /f "usebackq delims=" %%A in ("%TEMP%\eears_last_backup.txt") do set "GZ_FILE=%%A"

if "!GZ_FILE!"=="" (
  call :log_ps ERROR "Empty backup path from dump script."
  exit /b 1
)
call :log_ps OK "Backup file: !GZ_FILE!"

if exist E:\ (
  if not exist "%USB_ROOT%" mkdir "%USB_ROOT%" 2>nul
  copy /Y "!GZ_FILE!" "%USB_ROOT%\" >nul 2>&1
  if errorlevel 1 (
    call :log_ps WARN "USB copy failed (check ACL or write-protect): %USB_ROOT%"
  ) else (
    call :log_ps OK "Copied to USB: %USB_ROOT%"
  )
) else (
  call :log_ps WARN "Drive E: not present, skip USB (not an error)."
)

where rclone >nul 2>&1
if errorlevel 1 (
  call :log_ps WARN "rclone not in PATH, skip cloud. See docs\BACKUP_SETUP.md"
) else (
  rclone copy "%LOCAL_DIR%" "gdrive:EEARS_backup" --log-file "%LOG_DIR%\rclone.log" --log-level INFO
  if errorlevel 1 (
    call :log_ps WARN "rclone may have failed; see %LOG_DIR%\rclone.log"
  ) else (
    call :log_ps OK "rclone synced to gdrive:EEARS_backup"
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$d='%LOCAL_DIR%'; Get-ChildItem -LiteralPath $d -Filter 'eears_*.sql.gz' -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue; Write-Output $_.FullName }" > "%TEMP%\eears_del_local.txt" 2>&1
if exist "%TEMP%\eears_del_local.txt" (
  for /f "usebackq delims=" %%L in ("%TEMP%\eears_del_local.txt") do call :log_ps INFO "Deleted old local: %%L"
)

if exist E:\ (
  if exist "%USB_ROOT%" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$d='%USB_ROOT%'; Get-ChildItem -LiteralPath $d -Filter 'eears_*.sql.gz' -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | ForEach-Object { Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue; Write-Output $_.FullName }" > "%TEMP%\eears_del_usb.txt" 2>&1
    for /f "usebackq delims=" %%L in ("%TEMP%\eears_del_usb.txt") do call :log_ps INFO "Deleted old USB: %%L"
  )
)

call :log_ps INFO "======== backup job end (OK) ========"
exit /b 0

:log_ps
REM Pass ASCII-only messages; avoid double-quotes inside message.
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%backup-log.ps1" -Level "%~1" -Message "%~2" -LogDir "%LOG_DIR%"
goto :eof
