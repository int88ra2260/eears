# 老師功能部署指南

## 📋 概述

本指南說明如何部署支援老師名稱和未來老師帳號功能的班級參與概況系統。

## 🔧 部署步驟

### 1. 數據庫遷移

```bash
cd backend

# 添加老師名稱欄位到班級表
node -e "
const migration = require('./migrations/20241201000005-add-teacher-to-classes');
const { sequelize } = require('./models');
migration.up(sequelize.getQueryInterface(), sequelize.constructor)
  .then(() => console.log('✅ 班級表老師欄位添加成功'))
  .catch(console.error);
"

# 創建老師表
node -e "
const migration = require('./migrations/20241201000006-create-teachers');
const { sequelize } = require('./models');
migration.up(sequelize.getQueryInterface(), sequelize.constructor)
  .then(() => console.log('✅ 老師表創建成功'))
  .catch(console.error);
"

# 創建班級老師關聯表
node -e "
const migration = require('./migrations/20241201000007-create-class-teachers');
const { sequelize } = require('./models');
migration.up(sequelize.getQueryInterface(), sequelize.constructor)
  .then(() => console.log('✅ 班級老師關聯表創建成功'))
  .catch(console.error);
"
```

### 2. 安裝依賴

```bash
cd backend
npm install bcryptjs jsonwebtoken
```

### 3. 重啟後端服務

```bash
cd backend
npm start
# 或
npm run dev
```

### 4. 重新建置前端

```bash
cd frontend
npm run build
```

### 5. 測試功能

```bash
cd backend
node test-teacher-functionality.js
```

## 🎯 新功能說明

### 1. 老師名稱支援
- **匯入時輸入**：匯入班級名單時需要輸入老師姓名
- **顯示老師名稱**：班級總覽頁面顯示每個班級的老師姓名
- **數據存儲**：老師姓名存儲在班級表中

### 2. 未來老師帳號功能（已準備）
- **老師表**：存儲老師基本資訊（姓名、Email、帳號、密碼）
- **關聯表**：班級與老師的多對多關聯
- **API 端點**：老師登入、查看學生參與狀況等

## 📁 檔案結構

### 新增檔案
- `models/Teacher.js` - 老師模型
- `models/ClassTeacher.js` - 班級老師關聯模型
- `controllers/teacherController.js` - 老師控制器
- `routes/teacherRoutes.js` - 老師路由
- `migrations/20241201000005-add-teacher-to-classes.js` - 班級表遷移
- `migrations/20241201000006-create-teachers.js` - 老師表遷移
- `migrations/20241201000007-create-class-teachers.js` - 關聯表遷移

### 修改檔案
- `models/Class.js` - 新增 teacherName 欄位
- `models/index.js` - 新增老師相關模型和關聯
- `controllers/adminClassesController.js` - 支援老師名稱處理
- `frontend/src/components/ClassOverview.js` - 新增老師名稱輸入和顯示
- `server.js` - 新增老師路由

## 🔍 API 端點

### 現有功能（已啟用）
- **匯入班級名單**：`POST /api/admin/classes/roster/import?semester=114-1&className=班級名稱&teacherName=老師姓名`
- **班級總覽**：`GET /api/admin/classes/overview` - 返回包含老師名稱的班級列表

### 未來功能（已準備）
- **老師登入**：`POST /api/teachers/login`
- **查看學生參與狀況**：`GET /api/teachers/students/participation`
- **創建老師帳號**：`POST /api/admin/teachers`（管理員）
- **獲取老師列表**：`GET /api/admin/teachers`（管理員）
- **獲取老師負責的班級**：`GET /api/admin/teachers/:id/classes`（管理員）

## 🎯 使用流程

### 1. 匯入班級名單
1. 點擊「匯入名單」按鈕
2. 輸入班級名稱（例如：英文中級 GEEN116）
3. 輸入老師姓名（例如：張老師）
4. 選擇包含學號、姓名、系所、年級的 Excel 檔案
5. 點擊「上傳」完成匯入

### 2. 查看班級總覽
1. 進入「後台 → 班級參與概況」
2. 查看包含老師姓名的班級列表
3. 點擊「查看明細」查看具體學生參與狀況

### 3. 未來老師帳號功能（可選啟用）
1. 管理員為老師創建帳號
2. 老師使用帳號登入
3. 老師查看自己負責班級的學生參與狀況

## ⚠️ 注意事項

1. **向後兼容**：現有功能完全保持不變
2. **數據遷移**：現有數據不受影響
3. **老師名稱**：匯入時必須輸入，但可以為空字串
4. **未來擴展**：老師帳號功能已準備就緒，可隨時啟用

## 🧪 測試驗證

### 1. 基本功能測試
- 匯入班級名單（包含老師姓名）
- 查看班級總覽（確認老師姓名顯示）
- 查看班級明細（確認數據正確）

### 2. 錯誤處理測試
- 缺少老師姓名的匯入
- 無效的檔案格式
- 網路錯誤處理

### 3. 數據驗證
- 老師姓名正確存儲
- 班級統計數據準確性
- 關聯關係正確性

## 📞 支援

如有問題，請檢查：
1. 數據庫遷移是否成功執行
2. 後端服務是否正常運行
3. 前端是否正確建置
4. 網路連線是否正常

---

**部署完成後，系統將支援老師名稱功能，並為未來的老師帳號功能做好準備！** 🎉
