# 班級參與概況功能故障排除指南

## 網路連線錯誤解決步驟

### 1. 檢查後端服務狀態
```bash
# 檢查後端是否正在運行
ps aux | grep node
# 或
netstat -tulpn | grep :3000
```

### 2. 檢查依賴包安裝
```bash
cd backend
npm install multer@^1.4.5-lts.1 xlsx@^0.18.5
```

### 3. 執行數據庫遷移
```bash
cd backend
node test-class-overview.js
```

### 4. 測試 API 端點
```bash
cd backend
node test-api-endpoint.js
```

### 5. 檢查後端日誌
查看後端控制台是否有錯誤訊息，特別注意：
- 數據庫連接錯誤
- 路由註冊錯誤
- 模型同步錯誤

### 6. 檢查前端建置
```bash
cd frontend
npm run build
```

## 常見錯誤及解決方法

### 錯誤 1: "Cannot find module 'multer'"
**解決方法**: 
```bash
cd backend
npm install multer@^1.4.5-lts.1
```

### 錯誤 2: "Cannot find module 'xlsx'"
**解決方法**:
```bash
cd backend
npm install xlsx@^0.18.5
```

### 錯誤 3: "Table 'Classes' doesn't exist"
**解決方法**:
執行數據庫遷移：
```bash
cd backend
node -e "
const { sequelize } = require('./models');
const migration1 = require('./migrations/20241201000002-create-classes');
const migration2 = require('./migrations/20241201000003-create-class-memberships');

async function runMigrations() {
  try {
    await migration1.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ Classes 表創建成功');
    
    await migration2.up(sequelize.getQueryInterface(), sequelize.constructor);
    console.log('✅ ClassMemberships 表創建成功');
    
    console.log('🎉 所有遷移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

runMigrations();
"
```

### 錯誤 4: "Route not found"
**解決方法**:
1. 確認後端已重啟
2. 檢查 server.js 中是否正確添加了路由：
```javascript
app.use('/api/admin/classes', adminClassesRouter);
```

### 錯誤 5: "Unauthorized"
**解決方法**:
1. 確認已登入管理員帳號
2. 檢查 token 是否有效
3. 重新登入

## 檢查清單

- [ ] 後端服務正在運行
- [ ] 所有依賴包已安裝
- [ ] 數據庫遷移已執行
- [ ] 路由已正確註冊
- [ ] 前端已重新建置
- [ ] 管理員權限正確
- [ ] 數據庫連接正常

## 測試步驟

1. 打開瀏覽器開發者工具 (F12)
2. 進入「後台 → 班級參與概況」
3. 查看 Console 和 Network 標籤的錯誤訊息
4. 檢查 API 請求是否成功發送
5. 查看後端控制台的錯誤日誌

## 如果問題仍然存在

1. 重啟後端服務
2. 清除瀏覽器快取
3. 重新建置前端
4. 檢查防火牆設定
5. 確認端口 3000 沒有被其他程式占用
