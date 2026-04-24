# Teachers 表索引問題修復報告

## 問題描述

在同步資料庫時遇到錯誤：
```
Too many keys specified; max 64 keys allowed
```

## 問題原因

1. **重複索引創建**：`Teacher` 模型中 `email` 和 `username` 欄位同時定義了兩次 UNIQUE 約束：
   - 欄位定義中的 `unique: true`
   - `indexes` 陣列中的 `unique: true`

2. **索引累積**：每次 Sequelize 嘗試同步時，都會嘗試創建新的索引，導致索引數量不斷累積，最終達到 MySQL 的 64 個索引限制。

3. **索引數量**：清理前有 64 個索引，包括：
   - `email` 欄位：30 個重複索引（email, email_2, email_3, ..., email_28）
   - `username` 欄位：30 個重複索引（username, username_2, username_3, ..., username_28）

## 修復方案

### 1. 修改模型定義

**檔案：** `models/Teacher.js`

**修改內容：**
- 移除欄位定義中的 `unique: true`
- 只保留 `indexes` 陣列中的 UNIQUE 索引定義

**修改前：**
```javascript
email: {
  type: DataTypes.STRING(100),
  allowNull: false,
  unique: true,  // ❌ 移除這個
  comment: '老師電子郵件'
},
```

**修改後：**
```javascript
email: {
  type: DataTypes.STRING(100),
  allowNull: false,
  // unique: true 已移至 indexes 陣列中定義，避免重複創建索引
  comment: '老師電子郵件'
},
```

### 2. 清理重複索引

**腳本：** `scripts/cleanup-teachers-duplicate-indexes.js`

**執行結果：**
- 刪除了 56 個重複索引
- 索引數量從 64 個降至 8 個
- 保留了必要的索引：
  - `PRIMARY` (id)
  - `teachers_email` (email) [UNIQUE]
  - `teachers_username` (username) [UNIQUE]
  - `teachers_is_active` (isActive)
  - `idx_teachers_email` (email)
  - `idx_teachers_username` (username)
  - `teachers_role` (role)
  - `teachers_role_idx` (role)

## 預防措施

1. **模型定義最佳實踐**：
   - 不要在欄位定義和 `indexes` 陣列中同時定義 UNIQUE 約束
   - 優先使用 `indexes` 陣列定義索引，因為更靈活且明確

2. **定期檢查索引**：
   - 使用 `scripts/check-teachers-indexes.js` 定期檢查索引數量
   - 如果索引數量接近 64，及時清理不必要的索引

3. **避免使用 `sync()`**：
   - 在生產環境中，避免使用 `sequelize.sync()`
   - 使用 migration 來管理資料庫結構變更

## 相關檔案

- `models/Teacher.js` - 模型定義（已修復）
- `scripts/check-teachers-indexes.js` - 檢查索引腳本
- `scripts/cleanup-teachers-duplicate-indexes.js` - 清理重複索引腳本

## 驗證

執行以下命令驗證修復：
```bash
node scripts/check-teachers-indexes.js
```

預期結果：索引數量應該遠低於 64 個（目前為 8 個）

## 注意事項

1. 如果未來需要添加新的索引，請確保不會超過 64 個的限制
2. 在修改模型定義時，避免同時在欄位定義和 `indexes` 陣列中定義相同的約束
3. 定期檢查並清理不必要的索引

