#!/bin/bash
# 修復 npm run build 編譯錯誤的腳本

echo "🔧 開始修復編譯錯誤..."

# 1. 更新 browserslist 資料庫
echo "📦 更新 browserslist 資料庫..."
npx update-browserslist-db@latest

# 2. 清除快取
echo "🧹 清除 npm 快取..."
npm cache clean --force

# 3. 刪除 node_modules 和 package-lock.json
echo "🗑️  刪除 node_modules 和 package-lock.json..."
rm -rf node_modules package-lock.json

# 4. 重新安裝
echo "📥 重新安裝依賴..."
npm install

# 5. 嘗試編譯
echo "🏗️  開始編譯..."
npm run build

echo "✅ 完成！"
