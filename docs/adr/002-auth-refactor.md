# ADR-002: 認證系統重構

## 狀態
已接受

## 背景
現有認證系統存在以下問題：
1. 密碼以明文形式存儲和比較
2. JWT 密鑰強度不足
3. 缺乏密碼加密機制
4. 沒有登入限流保護
5. 錯誤處理不夠完善

## 決策
重構認證系統，實施以下改進：
1. 使用 bcrypt 加密密碼
2. 強化 JWT 配置
3. 實施登入限流
4. 改善錯誤處理
5. 統一認證中介軟體

## 選項考慮

### 選項 1: 保持現狀
- 優點：無需變更
- 缺點：安全風險高，不符合最佳實踐

### 選項 2: 漸進式改進
- 優點：風險可控，可逐步實施
- 缺點：實施時間較長

### 選項 3: 全面重構
- 優點：一次性解決所有問題
- 缺點：變更風險高

## 決策理由
選擇選項 2（漸進式改進）因為：
1. 降低實施風險
2. 可以逐步驗證改進效果
3. 保持系統穩定性
4. 便於回滾

## 實施細節

### 密碼加密
```javascript
// 使用 bcrypt 加密密碼
const bcrypt = require('bcrypt');
const saltRounds = 12;

async function hashPassword(password) {
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
```

### JWT 強化
```javascript
// 強化 JWT 配置
const jwtConfig = {
  secret: process.env.JWT_SECRET, // 至少 32 字元
  expiresIn: '1h',
  algorithm: 'HS256'
};
```

### 登入限流
```javascript
// 實施登入限流
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 最多 5 次嘗試
  skipSuccessfulRequests: true
});
```

### 統一錯誤處理
```javascript
// 統一錯誤回應格式
const errorResponse = {
  error: 'ERROR_CODE',
  message: '使用者友善的錯誤訊息'
};
```

## 實施步驟

### 階段 1: 基礎設施
1. 建立安全配置模組
2. 實施密碼加密函數
3. 更新 JWT 配置

### 階段 2: 認證流程
1. 更新登入路由
2. 實施登入限流
3. 改善錯誤處理

### 階段 3: 測試與驗證
1. 建立認證測試
2. 進行安全測試
3. 效能測試

## 後果

### 正面影響
- 大幅提升系統安全性
- 符合安全最佳實踐
- 防止暴力攻擊
- 改善使用者體驗

### 負面影響
- 密碼變更需要重新加密
- 現有 Token 需要重新生成
- 部署複雜度增加

### 風險
- 密碼加密可能影響效能
- 限流可能影響正常使用者
- 配置錯誤可能導致認證失敗

### 緩解措施
- 提供密碼遷移工具
- 設定合理的限流參數
- 建立完整的測試覆蓋
- 提供詳細的部署文件

## 測試策略

### 單元測試
- 密碼加密/驗證測試
- JWT 生成/驗證測試
- 限流功能測試

### 整合測試
- 登入流程測試
- 認證中介軟體測試
- 錯誤處理測試

### 安全測試
- 暴力攻擊測試
- Token 安全性測試
- 輸入驗證測試

## 監控指標
- 登入成功率
- 登入失敗率
- 限流觸發次數
- 認證回應時間

## 相關文件
- [安全配置檔案](../config/security.js)
- [認證中介軟體](../middlewares/auth.js)
- [登入路由](../routes/loginRouter.js)
- [測試檔案](../tests/auth.test.js)
