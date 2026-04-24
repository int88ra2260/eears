# ADR-001: 環境變數管理策略

## 狀態
已接受

## 背景
現有系統中存在多個安全風險：
1. 硬編碼的管理員和工讀生密碼
2. 弱 JWT 密鑰
3. 資料庫密碼直接寫在程式碼中
4. Email 認證資訊硬編碼

這些問題違反了安全最佳實踐，需要立即修復。

## 決策
採用環境變數管理所有敏感配置資訊，包括：
- 資料庫連線資訊
- JWT 密鑰
- 管理員和工讀生帳號密碼
- Email 服務配置
- 其他安全相關設定

## 選項考慮

### 選項 1: 繼續使用硬編碼
- 優點：簡單，無需額外配置
- 缺點：嚴重安全風險，密碼洩露風險高

### 選項 2: 使用環境變數
- 優點：安全性高，符合最佳實踐，易於管理
- 缺點：需要額外的配置管理

### 選項 3: 使用配置管理服務
- 優點：集中管理，支援動態更新
- 缺點：複雜度高，需要額外基礎設施

## 決策理由
選擇選項 2（環境變數）因為：
1. 立即解決安全風險
2. 實施成本低
3. 符合 12-Factor App 原則
4. 易於部署和管理

## 實施細節

### 環境變數清單
```bash
# 資料庫配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=activity_reservation
DB_USER=root
DB_PASSWORD=your_strong_password_here

# JWT 配置
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=1h

# 管理員帳號
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_strong_admin_password_here

# 工讀生帳號
WORKER_USERNAME=worker
WORKER_PASSWORD=your_strong_worker_password_here

# Email 配置
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_gmail_app_password
```

### 安全要求
1. JWT 密鑰長度至少 32 字元
2. 密碼必須包含大小寫字母、數字和特殊字元
3. 生產環境必須使用強密碼
4. 環境變數檔案不得提交到版本控制

### 驗證機制
- 啟動時驗證必要環境變數是否存在
- 驗證密碼強度
- 驗證 JWT 密鑰長度

## 後果

### 正面影響
- 消除硬編碼密碼的安全風險
- 提高系統安全性
- 符合安全最佳實踐
- 便於不同環境的配置管理

### 負面影響
- 部署複雜度略微增加
- 需要管理環境變數檔案
- 開發人員需要了解環境變數配置

### 風險
- 環境變數檔案洩露風險
- 配置錯誤可能導致系統無法啟動

### 緩解措施
- 提供詳細的部署文件
- 建立環境變數範本檔案
- 實施配置驗證機制
- 定期安全審查

## 相關文件
- [環境變數範本](../env.example)
- [安全配置檔案](../config/security.js)
- [部署指南](../deployment-guide.md)
