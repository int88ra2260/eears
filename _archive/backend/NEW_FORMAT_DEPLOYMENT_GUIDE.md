# 新檔案格式支援部署指南

## 📋 概述

本指南說明如何部署支援新檔案格式的班級參與概況功能。新格式支援：學號、姓名、系所、年級，班級名稱由使用者手動指定。

## 🔧 部署步驟

### 1. 數據庫遷移

```bash
cd backend
node -e "
const migration = require('./migrations/20241201000004-add-grade-to-class-memberships');
const { sequelize } = require('./models');

async function runMigration() {
  try {
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ 年級欄位添加成功');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

runMigration();
"
```

### 2. 重啟後端服務

```bash
cd backend
npm start
# 或
npm run dev
```

### 3. 重新建置前端

```bash
cd frontend
npm run build
```

### 4. 測試新功能

```bash
cd backend
node test-new-format.js
```

## 📁 檔案格式變更

### 舊格式
- 班級、學號、姓名、系所、Email

### 新格式
- 學號、姓名、系所、年級
- 班級名稱由使用者在上傳時手動指定

## 🎯 使用方式

### 1. 下載範例檔案
- 點擊「下載範例」按鈕獲取新格式範例
- 範例包含：學號、姓名、系所、年級

### 2. 準備班級名單
- 按照範例格式準備 Excel 檔案
- 必須包含：學號、姓名
- 可選包含：系所、年級

### 3. 匯入名單
- 點擊「匯入名單」按鈕
- 輸入班級名稱（例如：英文中級 GEEN116）
- 選擇準備好的 Excel 檔案
- 點擊「上傳」完成匯入

## 🔍 技術細節

### 數據庫變更
- 新增 `grade` 欄位到 `class_memberships` 表
- 支援年級資訊存儲和查詢

### API 變更
- 匯入 API 新增 `className` 查詢參數
- 支援年級欄位處理

### 前端變更
- 匯入 Modal 新增班級名稱輸入欄位
- 更新檔案格式說明
- 範例檔案更新為新格式

## ⚠️ 注意事項

1. **向後兼容**：舊格式仍可正常使用
2. **數據遷移**：現有數據不受影響
3. **欄位映射**：系統會自動識別中英文欄位名稱
4. **錯誤處理**：完整的驗證和錯誤提示

## 🧪 測試驗證

### 1. 基本功能測試
- 下載範例檔案
- 匯入測試檔案
- 查看匯入結果

### 2. 錯誤處理測試
- 缺少必填欄位
- 無效的檔案格式
- 網路錯誤處理

### 3. 數據驗證
- 年級欄位正確存儲
- 班級名稱正確應用
- 統計數據準確性

## 📞 支援

如有問題，請檢查：
1. 數據庫遷移是否成功
2. 後端服務是否正常運行
3. 前端是否正確建置
4. 網路連線是否正常

---

**部署完成後，系統將完全支援新的檔案格式！** 🎉
