# Settings API 使用說明

## 新增的 API 端點

### 1. 取得問卷需求設定
```
GET /api/settings/survey-required
```

**回應格式：**
```json
{
  "enabled": false
}
```

**說明：**
- 不需要認證
- 返回當前問卷是否為必填狀態
- `enabled: true` 表示需要填寫問卷才能預約
- `enabled: false` 表示不需要填寫問卷即可預約

### 2. 更新問卷需求設定
```
PUT /api/settings/survey-required
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "enabled": true
}
```

**請求參數：**
- `enabled` (boolean, 必填): 是否啟用問卷需求

**回應格式：**
```json
{
  "message": "設定已更新",
  "enabled": true
}
```

**說明：**
- 需要管理員權限
- 需要有效的 JWT token
- 只有 `role: 'admin'` 的使用者可以修改設定

## 資料庫變更

### 新增 Settings 資料表
```sql
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT,
  createdAt DATETIME NOT NULL,
  updatedAt DATETIME NOT NULL
);
```

### 預設資料
系統啟動時會自動插入：
```sql
INSERT INTO settings (key, value) VALUES ('survey_required', 'false');
```

## 部署步驟

1. **執行 Migration：**
   ```bash
   npm run migrate
   ```

2. **安裝測試依賴（可選）：**
   ```bash
   npm install
   ```

3. **執行測試（可選）：**
   ```bash
   npm test
   ```

## 測試範例

### 使用 curl 測試

**取得設定：**
```bash
curl -X GET http://localhost:3000/api/settings/survey-required
```

**更新設定（需要先登入取得 token）：**
```bash
# 1. 登入取得 token
TOKEN=$(curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"emieearsweb","password":"5808"}' | \
  jq -r '.token')

# 2. 更新設定
curl -X PUT http://localhost:3000/api/settings/survey-required \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

## 錯誤處理

### 常見錯誤回應

**401 Unauthorized：**
```json
{
  "error": "未提供 Token"
}
```

**403 Forbidden：**
```json
{
  "error": "需要管理員權限"
}
```

**400 Bad Request：**
```json
{
  "error": "enabled 必須為布林值"
}
```

**500 Internal Server Error：**
```json
{
  "error": "伺服器錯誤"
}
```












