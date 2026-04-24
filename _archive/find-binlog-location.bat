@echo off
echo 🔍 尋找 MySQL 二進位日誌檔案位置
echo.

echo 📋 步驟 1: 檢查 MySQL 資料目錄
mysql -u root -p -e "SHOW VARIABLES LIKE 'datadir';"

echo.
echo 📋 步驟 2: 檢查二進位日誌檔案
mysql -u root -p -e "SHOW BINARY LOGS;"

echo.
echo 📋 步驟 3: 檢查常見的二進位日誌位置
echo 檢查 C:\ProgramData\MySQL\MySQL Server 8.0\Data\
dir "C:\ProgramData\MySQL\MySQL Server 8.0\Data\binlog.*" 2>nul

echo.
echo 檢查 C:\Program Files\MySQL\MySQL Server 8.0\Data\
dir "C:\Program Files\MySQL\MySQL Server 8.0\Data\binlog.*" 2>nul

echo.
echo 檢查當前目錄
dir "binlog.*" 2>nul

echo.
echo 檢查 F:\ 根目錄
dir "F:\binlog.*" 2>nul

echo.
echo 檢查 D:\ 根目錄
dir "D:\binlog.*" 2>nul

pause

