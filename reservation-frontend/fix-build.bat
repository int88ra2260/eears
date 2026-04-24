@echo off
REM 修復 npm run build 編譯錯誤的腳本（Windows）

echo 🔧 開始修復編譯錯誤...

REM 1. 更新 browserslist 資料庫
echo 📦 更新 browserslist 資料庫...
call npx update-browserslist-db@latest

REM 2. 清除快取
echo 🧹 清除 npm 快取...
call npm cache clean --force

REM 3. 刪除 node_modules 和 package-lock.json
echo 🗑️  刪除 node_modules 和 package-lock.json...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

REM 4. 重新安裝
echo 📥 重新安裝依賴...
call npm install

REM 5. 嘗試編譯
echo 🏗️  開始編譯...
call npm run build

echo ✅ 完成！
pause
