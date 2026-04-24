# 部署指南

## 環境準備

### 系統需求
- Node.js 16+ 
- MySQL 8.0+
- npm 或 yarn

### 必要套件安裝
```bash
# 安裝依賴
npm install

# 安裝安全相關套件
npm install express-rate-limit helmet bcrypt
```

## 環境變數配置

### 1. 複製環境變數範本
```bash
cp env.example .env
```

### 2. 配置必要環境變數
編輯 `.env` 檔案，設定以下變數：

```bash
# 資料庫配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=activity_reservation
DB_USER=root
DB_PASSWORD=your_strong_password_here

# JWT 配置 (至少 32 字元)
JWT_SECRET=your_super_secure_jwt_secret_key_here_minimum_32_characters
JWT_EXPIRES_IN=1h

# 管理員帳號 (建議使用強密碼)
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_strong_admin_password_here

# 工讀生帳號
WORKER_USERNAME=worker
WORKER_PASSWORD=your_strong_worker_password_here

# Email 配置
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASS=your_gmail_app_password

# 伺服器配置
PORT=3000
NODE_ENV=production
```

### 3. 密碼強度要求
- 至少 8 個字元
- 包含大小寫字母
- 包含數字
- 包含特殊字元 (@$!%*?&)

### 4. JWT 密鑰要求
- 至少 32 個字元
- 使用隨機字串
- 建議使用密碼生成器

## 資料庫設定

### 1. 建立資料庫
```sql
CREATE DATABASE activity_reservation CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. 建立使用者 (可選)
```sql
CREATE USER 'reservation_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON activity_reservation.* TO 'reservation_user'@'localhost';
FLUSH PRIVILEGES;
```

## 部署步驟

### 開發環境
```bash
# 1. 安裝依賴
npm install

# 2. 設定環境變數
cp env.example .env
# 編輯 .env 檔案

# 3. 啟動開發伺服器
npm run dev
```

### 生產環境
```bash
# 1. 安裝依賴
npm install --production

# 2. 設定環境變數
cp env.example .env
# 編輯 .env 檔案

# 3. 建置前端
cd ../reservation-frontend
npm install
npm run build
cp -r build/* ../reservation-backend/build/

# 4. 啟動生產伺服器
cd ../reservation-backend
npm start
```

## 安全檢查清單

### 部署前檢查
- [ ] 所有密碼都使用強密碼
- [ ] JWT 密鑰長度至少 32 字元
- [ ] 環境變數檔案未提交到版本控制
- [ ] 資料庫連線使用 SSL
- [ ] 生產環境使用 HTTPS

### 部署後檢查
- [ ] 系統正常啟動
- [ ] 登入功能正常
- [ ] 安全標頭正確設定
- [ ] 限流功能正常
- [ ] 錯誤處理正常

## 監控設定

### 日誌監控
```bash
# 查看應用程式日誌
tail -f logs/app.log

# 查看錯誤日誌
grep "ERROR" logs/app.log
```

### 效能監控
```bash
# 檢查記憶體使用
ps aux | grep node

# 檢查 CPU 使用
top -p $(pgrep node)
```

## 備份策略

### 資料庫備份
```bash
# 每日備份
mysqldump -u root -p activity_reservation > backup_$(date +%Y%m%d).sql

# 自動備份腳本
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p activity_reservation > /backup/activity_reservation_$DATE.sql
```

### 檔案備份
```bash
# 備份上傳檔案
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# 備份配置檔案
cp .env .env.backup
```

## 故障排除

### 常見問題

#### 1. 環境變數未載入
```bash
# 檢查 .env 檔案是否存在
ls -la .env

# 檢查環境變數是否正確載入
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
```

#### 2. 資料庫連線失敗
```bash
# 檢查資料庫服務狀態
systemctl status mysql

# 測試資料庫連線
mysql -u root -p -e "SHOW DATABASES;"
```

#### 3. 認證失敗
```bash
# 檢查 JWT 密鑰設定
echo $JWT_SECRET

# 檢查密碼加密
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('test', 12))"
```

### 日誌分析
```bash
# 查看認證相關錯誤
grep "AUTH" logs/app.log

# 查看安全相關事件
grep "SECURITY" logs/app.log

# 查看限流事件
grep "RATE_LIMIT" logs/app.log
```

## 回滾程序

### 緊急回滾
```bash
# 1. 停止當前服務
pm2 stop reservation-backend

# 2. 回滾到上一個版本
git checkout previous-stable-tag

# 3. 重新安裝依賴
npm install

# 4. 重啟服務
pm2 start reservation-backend
```

### 資料回滾
```bash
# 恢復資料庫備份
mysql -u root -p activity_reservation < backup_20240101.sql

# 恢復檔案備份
tar -xzf uploads_backup_20240101.tar.gz
```

## 聯絡資訊
- 技術支援：tech-support@example.com
- 緊急聯絡：emergency@example.com
- 文件更新：docs@example.com
