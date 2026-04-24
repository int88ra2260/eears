# 資安整改實施計劃

**制定日期**：2024-12-11  
**目標**：在不破壞既有功能的前提下，逐步修復所有高風險漏洞  
**原則**：可回滾、可驗證、可逐步上線、不破壞既有 API 行為

---

## 📋 實施原則

### ✅ 安全原則
1. **可回滾**：每個步驟都有明確的回滾方案
2. **可驗證**：每個步驟都有驗證方法
3. **可逐步上線**：可以分階段部署，不影響現有服務
4. **向後兼容**：不破壞既有 API 行為和資料一致性
5. **最小權限**：每個改動都遵循最小權限原則

### 📝 實施流程
1. **準備階段**：備份、測試環境驗證
2. **實施階段**：代碼修改、配置更新
3. **驗證階段**：功能測試、安全測試
4. **部署階段**：逐步上線、監控
5. **回滾準備**：隨時準備回滾

---

## 🔴 第一階段：立即處理（P0）

### 1.1 JWT 密鑰硬編碼修復

**目標**：強制要求 JWT_SECRET 環境變數，驗證密鑰強度

**實施步驟**：

#### 步驟 1：創建安全配置模組
**檔案**：`config/security.js`（新建）

```javascript
// config/security.js
require('dotenv').config();

/**
 * 驗證 JWT 密鑰強度
 * @param {string} secret - JWT 密鑰
 * @returns {boolean} 是否符合強度要求
 */
function validateJWTSecret(secret) {
  if (!secret) {
    return false;
  }
  
  // 至少 32 字元
  if (secret.length < 32) {
    return false;
  }
  
  // 包含大小寫字母、數字和特殊字符
  const hasUpperCase = /[A-Z]/.test(secret);
  const hasLowerCase = /[a-z]/.test(secret);
  const hasNumbers = /[0-9]/.test(secret);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(secret);
  
  return hasUpperCase && hasLowerCase && hasNumbers && hasSpecial;
}

/**
 * 獲取 JWT 密鑰（帶驗證）
 */
function getJWTSecret() {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error(
      '❌ JWT_SECRET 環境變數未設定！\n' +
      '請在 .env 檔案中設定 JWT_SECRET（至少 32 字元，包含大小寫、數字、特殊字符）\n' +
      '可以使用以下命令生成：\n' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  if (!validateJWTSecret(secret)) {
    throw new Error(
      '❌ JWT_SECRET 強度不足！\n' +
      '要求：至少 32 字元，包含大小寫字母、數字和特殊字符\n' +
      '可以使用以下命令生成：\n' +
      'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  return secret;
}

module.exports = {
  getJWTSecret,
  validateJWTSecret
};
```

#### 步驟 2：更新 auth.js
**檔案**：`middlewares/auth.js`

```javascript
// 修改前
const secretKey = process.env.JWT_SECRET || 'MY_SUPER_SECRET_KEY';

// 修改後
const { getJWTSecret } = require('../config/security');
const secretKey = getJWTSecret();
```

#### 步驟 3：更新 loginRouter.js
**檔案**：`routes/loginRouter.js`

```javascript
// 修改前
const { secretKey } = require('../middlewares/auth');

// 修改後
const { getJWTSecret } = require('../config/security');
const secretKey = getJWTSecret();
```

#### 步驟 4：生成強密鑰腳本
**檔案**：`scripts/generate-jwt-secret.js`（新建）

```javascript
// scripts/generate-jwt-secret.js
const crypto = require('crypto');

function generateJWTSecret() {
  // 生成 64 字元的隨機字串（32 bytes = 64 hex characters）
  const secret = crypto.randomBytes(32).toString('hex');
  
  console.log('\n✅ JWT 密鑰已生成：');
  console.log(`JWT_SECRET=${secret}\n`);
  console.log('請將此值添加到 .env 檔案中\n');
  
  return secret;
}

generateJWTSecret();
```

#### 驗證步驟
```bash
# 1. 測試未設定環境變數（應該報錯）
unset JWT_SECRET
node server.js  # 應該顯示錯誤訊息

# 2. 測試弱密鑰（應該報錯）
export JWT_SECRET="weak"
node server.js  # 應該顯示強度不足錯誤

# 3. 生成並設定強密鑰
node scripts/generate-jwt-secret.js
# 複製輸出的 JWT_SECRET 到 .env

# 4. 測試正常啟動
node server.js  # 應該正常啟動
```

#### 回滾方案
```bash
# 如果出現問題，恢復原代碼
git checkout HEAD -- middlewares/auth.js routes/loginRouter.js
# 刪除新文件
rm config/security.js scripts/generate-jwt-secret.js
```

---

### 1.2 CORS 配置修復

**目標**：限制允許的來源域名，根據環境動態配置

**實施步驟**：

#### 步驟 1：更新 server.js
**檔案**：`server.js`

```javascript
// 修改前
app.use(cors());

// 修改後
const corsOptions = {
  origin: function (origin, callback) {
    // 允許的來源列表（從環境變數讀取）
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000']; // 預設僅允許本地開發
    
    // 允許無來源的請求（如 Postman、移動應用）
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('不允許的 CORS 來源'));
    }
  },
  credentials: true, // 允許憑證（cookies）
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // 24 小時
};

app.use(cors(corsOptions));
```

#### 步驟 2：更新 .env.example
**檔案**：`.env.example`（如果存在）

```env
# CORS 配置（多個來源用逗號分隔）
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

#### 驗證步驟
```bash
# 1. 測試允許的來源
curl -H "Origin: http://localhost:3000" http://localhost:3000/api/events
# 應該成功

# 2. 測試不允許的來源
curl -H "Origin: http://evil.com" http://localhost:3000/api/events
# 應該返回 CORS 錯誤
```

#### 回滾方案
```bash
git checkout HEAD -- server.js
```

---

### 1.3 Rate Limiting 實施

**目標**：實施 API 頻率限制，防止暴力破解和 DDoS

**實施步驟**：

#### 步驟 1：安裝依賴
```bash
npm install express-rate-limit
```

#### 步驟 2：創建限流配置
**檔案**：`middlewares/rateLimiter.js`（新建）

```javascript
// middlewares/rateLimiter.js
const rateLimit = require('express-rate-limit');

// 一般 API 限流（每分鐘 60 次）
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: parseInt(process.env.RATE_LIMIT_GENERAL_MAX || '60'),
  message: {
    error: '請求過於頻繁，請稍後再試',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // 返回標準的 RateLimit 標頭
  legacyHeaders: false, // 禁用 X-RateLimit-* 標頭
});

// 登入限流（每 15 分鐘 5 次）
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX || '5'),
  message: {
    error: '登入嘗試過於頻繁，請 15 分鐘後再試',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true, // 成功登入不計入限制
  standardHeaders: true,
  legacyHeaders: false,
});

// 預約限流（每分鐘 3 次）
const reservationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分鐘
  max: parseInt(process.env.RATE_LIMIT_RESERVATION_MAX || '3'),
  message: {
    error: '預約請求過於頻繁，請稍後再試',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 文件上傳限流（每小時 10 次）
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小時
  max: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '10'),
  message: {
    error: '上傳請求過於頻繁，請 1 小時後再試',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  loginLimiter,
  reservationLimiter,
  uploadLimiter
};
```

#### 步驟 3：應用限流中間件
**檔案**：`server.js`

```javascript
const { generalLimiter } = require('./middlewares/rateLimiter');

// 在所有路由之前應用一般限流
app.use('/api', generalLimiter);
```

**檔案**：`routes/loginRouter.js`

```javascript
const { loginLimiter } = require('../middlewares/rateLimiter');

// 在登入路由應用登入限流
router.post('/login', loginLimiter, async (req, res) => {
  // ... 原有代碼
});
```

**檔案**：`routes/reservationRouter.js`

```javascript
const { reservationLimiter } = require('../middlewares/rateLimiter');

// 在預約路由應用預約限流
router.post('/reservations', reservationLimiter, authMiddleware, async (req, res) => {
  // ... 原有代碼
});
```

#### 驗證步驟
```bash
# 1. 測試一般 API 限流（快速發送 61 個請求）
for i in {1..61}; do curl http://localhost:3000/api/events; done
# 第 61 個請求應該返回限流錯誤

# 2. 測試登入限流（快速發送 6 個登入請求）
for i in {1..6}; do curl -X POST http://localhost:3000/api/login -d '{"username":"test","password":"test"}'; done
# 第 6 個請求應該返回限流錯誤
```

#### 回滾方案
```bash
npm uninstall express-rate-limit
git checkout HEAD -- server.js routes/loginRouter.js routes/reservationRouter.js
rm middlewares/rateLimiter.js
```

---

### 1.4 錯誤訊息修復

**目標**：生產環境不洩露敏感資訊

**實施步驟**：

#### 步驟 1：更新 errorHandler.js
**檔案**：`middlewares/errorHandler.js`

```javascript
// 修改錯誤處理邏輯
const errorHandler = (err, req, res, next) => {
  // ... 原有錯誤分類邏輯 ...

  // 生成API錯誤響應
  const apiError = createAPIError(errorKey, statusCode, details);
  
  // 基本回應（不包含敏感資訊）
  const response = {
    ...apiError,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  };

  // 僅在開發環境顯示詳細錯誤
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.originalError = err.message;
    // 開發環境可以顯示更多資訊
  } else {
    // 生產環境：記錄詳細錯誤到日誌，但不返回給客戶端
    logError('SERVER_ERROR', err, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      user: req.user ? req.user.id : null
    });
    
    // 生產環境：統一錯誤訊息，不洩露技術細節
    if (statusCode === 500) {
      response.message = '伺服器發生錯誤，請稍後再試';
      response.details = null; // 不返回詳細錯誤
    }
  }

  res.status(statusCode).json(response);
};
```

#### 驗證步驟
```bash
# 1. 開發環境（應該顯示詳細錯誤）
NODE_ENV=development node server.js
curl http://localhost:3000/api/nonexistent
# 應該包含 stack trace

# 2. 生產環境（不應該顯示詳細錯誤）
NODE_ENV=production node server.js
curl http://localhost:3000/api/nonexistent
# 不應該包含 stack trace 或技術細節
```

#### 回滾方案
```bash
git checkout HEAD -- middlewares/errorHandler.js
```

---

### 1.5 文件上傳驗證增強

**目標**：驗證實際文件內容，防止惡意文件上傳

**實施步驟**：

#### 步驟 1：安裝依賴
```bash
npm install file-type
```

#### 步驟 2：創建文件驗證工具
**檔案**：`utils/fileValidator.js`（新建）

```javascript
// utils/fileValidator.js
const FileType = require('file-type');
const path = require('path');
const fs = require('fs');

// 允許的 MIME 類型
const ALLOWED_MIME_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/jpg'],
  document: ['application/pdf'],
  excel: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
};

/**
 * 驗證文件類型
 * @param {Buffer} fileBuffer - 文件緩衝區
 * @param {string} originalName - 原始檔名
 * @param {string} expectedType - 預期類型（'image', 'document', 'excel'）
 * @returns {Promise<{isValid: boolean, mimeType: string, error?: string}>}
 */
async function validateFileType(fileBuffer, originalName, expectedType) {
  try {
    // 檢查文件大小
    if (fileBuffer.length === 0) {
      return { isValid: false, error: '文件為空' };
    }

    // 使用 file-type 檢查實際文件類型
    const fileType = await FileType.fromBuffer(fileBuffer);
    
    if (!fileType) {
      // 對於某些文件類型（如 .xls），file-type 可能無法識別
      // 回退到副檔名檢查
      const ext = path.extname(originalName).toLowerCase();
      if (expectedType === 'excel' && ['.xls', '.xlsx'].includes(ext)) {
        return { isValid: true, mimeType: 'application/vnd.ms-excel' };
      }
      return { isValid: false, error: '無法識別文件類型' };
    }

    // 檢查 MIME 類型是否在允許列表中
    const allowedTypes = ALLOWED_MIME_TYPES[expectedType] || [];
    if (!allowedTypes.includes(fileType.mime)) {
      return {
        isValid: false,
        error: `不允許的文件類型：${fileType.mime}。允許的類型：${allowedTypes.join(', ')}`
      };
    }

    // 檢查副檔名是否匹配
    const ext = path.extname(originalName).toLowerCase();
    const expectedExts = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    };

    if (expectedExts[fileType.mime] && !expectedExts[fileType.mime].includes(ext)) {
      return {
        isValid: false,
        error: `文件副檔名與實際類型不匹配。預期：${expectedExts[fileType.mime].join(', ')}`
      };
    }

    return { isValid: true, mimeType: fileType.mime };
  } catch (error) {
    return { isValid: false, error: `文件驗證失敗：${error.message}` };
  }
}

/**
 * 清理檔名，防止路徑遍歷
 * @param {string} filename - 原始檔名
 * @returns {string} 清理後的檔名
 */
function sanitizeFilename(filename) {
  // 移除路徑分隔符和危險字符
  return path.basename(filename)
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .substring(0, 255); // 限制長度
}

module.exports = {
  validateFileType,
  sanitizeFilename,
  ALLOWED_MIME_TYPES
};
```

#### 步驟 3：更新文件上傳路由
**檔案**：`routes/englishTestRegistrationRouter.js`

```javascript
const { validateFileType, sanitizeFilename } = require('../utils/fileValidator');

// 更新 multer 配置
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: async (req, file, cb) => {
    // 先檢查副檔名和 MIME type（快速檢查）
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (!mimetype || !extname) {
      return cb(new Error('只允許上傳 JPG、PNG 或 PDF 檔案'));
    }
    
    // 注意：multer 的 fileFilter 是同步的，實際文件內容驗證需要在路由處理中進行
    cb(null, true);
  }
});

// 在路由處理中添加文件內容驗證
router.post('/english-test/register', upload.fields([...]), async (req, res) => {
  try {
    // 驗證上傳的文件
    if (req.files) {
      for (const fieldName in req.files) {
        const files = Array.isArray(req.files[fieldName]) ? req.files[fieldName] : [req.files[fieldName]];
        
        for (const file of files) {
          const fileBuffer = fs.readFileSync(file.path);
          const expectedType = file.fieldname === 'idPhoto' || file.fieldname.includes('Cert') ? 'image' : 'document';
          
          const validation = await validateFileType(fileBuffer, file.originalname, expectedType);
          
          if (!validation.isValid) {
            // 刪除已上傳的文件
            fs.unlinkSync(file.path);
            return res.status(400).json({ error: validation.error });
          }
        }
      }
    }
    
    // ... 原有處理邏輯 ...
  } catch (error) {
    // ... 錯誤處理 ...
  }
});
```

#### 驗證步驟
```bash
# 1. 測試正常文件上傳
curl -X POST http://localhost:3000/api/english-test/register \
  -F "idPhoto=@test.jpg" \
  -F "studentId=B123456789"
# 應該成功

# 2. 測試偽裝文件（將 PHP 文件重命名為 .jpg）
echo "<?php phpinfo(); ?>" > evil.php
mv evil.php evil.jpg
curl -X POST http://localhost:3000/api/english-test/register \
  -F "idPhoto=@evil.jpg" \
  -F "studentId=B123456789"
# 應該被拒絕
```

#### 回滾方案
```bash
npm uninstall file-type
git checkout HEAD -- routes/englishTestRegistrationRouter.js
rm utils/fileValidator.js
```

---

### 1.6 安全標頭實施

**目標**：使用 Helmet 設定安全標頭

**實施步驟**：

#### 步驟 1：安裝依賴
```bash
npm install helmet
```

#### 步驟 2：配置 Helmet
**檔案**：`server.js`

```javascript
const helmet = require('helmet');

// 配置 Helmet（在 CORS 之前）
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Bootstrap 需要 unsafe-inline
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // 如果需要嵌入外部資源，設為 false
  hsts: {
    maxAge: 31536000, // 1 年
    includeSubDomains: true,
    preload: true
  }
}));
```

#### 驗證步驟
```bash
# 檢查安全標頭
curl -I http://localhost:3000/api/events
# 應該看到：
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# X-XSS-Protection: 1; mode=block
# Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

#### 回滾方案
```bash
npm uninstall helmet
git checkout HEAD -- server.js
```

---

### 1.7 環境變數文件保護

**目標**：確保 .env 不被提交到版本控制

**實施步驟**：

#### 步驟 1：檢查 .gitignore
**檔案**：`.gitignore`

```gitignore
# 環境變數文件
.env
.env.local
.env.*.local
*.env

# 但保留範本
!.env.example
```

#### 步驟 2：檢查 Git 歷史
```bash
# 檢查 .env 是否被提交過
git log --all --full-history -- .env

# 如果發現 .env 被提交，需要從歷史中移除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 強制推送（謹慎操作！）
# git push origin --force --all
```

#### 步驟 3：創建 .env.example
**檔案**：`.env.example`（新建）

```env
# 資料庫配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=activity_reservation
DB_USER=root
DB_PASSWORD=your_password_here

# JWT 配置（使用 scripts/generate-jwt-secret.js 生成）
JWT_SECRET=your_jwt_secret_here_min_32_chars

# Email 配置
GMAIL_USER=your_email@gmail.com
GMAIL_PASS=your_app_password

# CORS 配置
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Rate Limiting 配置
RATE_LIMIT_GENERAL_MAX=60
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_RESERVATION_MAX=3
RATE_LIMIT_UPLOAD_MAX=10

# 伺服器配置
PORT=3000
NODE_ENV=production
```

#### 驗證步驟
```bash
# 1. 確認 .env 在 .gitignore 中
git check-ignore .env
# 應該輸出 .env

# 2. 確認 .env 不會被提交
git status
# .env 不應該出現在待提交列表中
```

#### 回滾方案
無需回滾（這是配置更改）

---

### 1.8 登入失敗鎖定機制

**目標**：實施登入失敗次數限制和帳號鎖定

**實施步驟**：

#### 步驟 1：安裝依賴
```bash
npm install express-rate-limit
# 如果已安裝，跳過此步驟
```

#### 步驟 2：創建登入鎖定中間件
**檔案**：`middlewares/loginLockout.js`（新建）

```javascript
// middlewares/loginLockout.js
const { Teacher } = require('../models');
const { Op } = require('sequelize');

// 記憶體存儲登入失敗次數（生產環境應使用 Redis）
const loginAttempts = new Map();

// 清理過期記錄的間隔（每 5 分鐘）
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now - value.lastAttempt > 15 * 60 * 1000) { // 15 分鐘
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * 記錄登入失敗
 */
async function recordLoginFailure(username, ip) {
  const key = `${username}:${ip}`;
  const now = Date.now();
  
  if (!loginAttempts.has(key)) {
    loginAttempts.set(key, { count: 0, lastAttempt: now, lockedUntil: null });
  }
  
  const record = loginAttempts.get(key);
  record.count += 1;
  record.lastAttempt = now;
  
  // 如果失敗次數達到 5 次，鎖定 15 分鐘
  if (record.count >= 5) {
    record.lockedUntil = now + 15 * 60 * 1000;
  }
  
  loginAttempts.set(key, record);
}

/**
 * 清除登入失敗記錄（登入成功時調用）
 */
function clearLoginFailure(username, ip) {
  const key = `${username}:${ip}`;
  loginAttempts.delete(key);
}

/**
 * 檢查是否被鎖定
 */
function isLocked(username, ip) {
  const key = `${username}:${ip}`;
  const record = loginAttempts.get(key);
  
  if (!record) {
    return { locked: false };
  }
  
  const now = Date.now();
  
  // 如果鎖定時間已過，清除記錄
  if (record.lockedUntil && now > record.lockedUntil) {
    loginAttempts.delete(key);
    return { locked: false };
  }
  
  // 如果仍在鎖定期間
  if (record.lockedUntil && now <= record.lockedUntil) {
    const remainingMinutes = Math.ceil((record.lockedUntil - now) / (60 * 1000));
    return {
      locked: true,
      remainingMinutes,
      attempts: record.count
    };
  }
  
  return { locked: false, attempts: record.count };
}

module.exports = {
  recordLoginFailure,
  clearLoginFailure,
  isLocked
};
```

#### 步驟 3：更新登入路由
**檔案**：`routes/loginRouter.js`

```javascript
const { recordLoginFailure, clearLoginFailure, isLocked } = require('../middlewares/loginLockout');

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;
    
    if (!username || !password) {
      return res.status(400).json({ error: '缺少帳號或密碼' });
    }

    // 檢查是否被鎖定
    const lockStatus = isLocked(username, clientIp);
    if (lockStatus.locked) {
      return res.status(429).json({
        error: `帳號已被暫時鎖定，請 ${lockStatus.remainingMinutes} 分鐘後再試`,
        code: 'ACCOUNT_LOCKED',
        remainingMinutes: lockStatus.remainingMinutes
      });
    }

    const teacher = await Teacher.findOne({ where: { username } });

    if (!teacher || !teacher.isActive) {
      recordLoginFailure(username, clientIp);
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    const isValidPassword = await bcrypt.compare(password, teacher.password);
    if (!isValidPassword) {
      recordLoginFailure(username, clientIp);
      return res.status(401).json({ error: '帳號或密碼錯誤' });
    }

    // 登入成功，清除失敗記錄
    clearLoginFailure(username, clientIp);

    // ... 原有 JWT token 生成邏輯 ...
  } catch (error) {
    console.error('登入錯誤:', error);
    return res.status(500).json({ error: "登入過程中發生錯誤" });
  }
});
```

#### 驗證步驟
```bash
# 1. 測試正常登入
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"wrong"}'
# 應該返回 401

# 2. 連續失敗 5 次
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
# 第 5 次應該返回鎖定訊息

# 3. 測試鎖定期間登入
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"correct"}'
# 應該返回鎖定錯誤
```

#### 回滾方案
```bash
git checkout HEAD -- routes/loginRouter.js
rm middlewares/loginLockout.js
```

---

## 📋 實施檢查清單

### 準備階段
- [ ] 備份資料庫
- [ ] 備份代碼（Git commit）
- [ ] 在測試環境驗證所有改動
- [ ] 準備回滾方案

### 實施階段
- [ ] 1.1 JWT 密鑰修復
- [ ] 1.2 CORS 配置修復
- [ ] 1.3 Rate Limiting 實施
- [ ] 1.4 錯誤訊息修復
- [ ] 1.5 文件上傳驗證增強
- [ ] 1.6 安全標頭實施
- [ ] 1.7 環境變數文件保護
- [ ] 1.8 登入失敗鎖定機制

### 驗證階段
- [ ] 功能測試（所有 API 正常運作）
- [ ] 安全測試（使用 security-test.js）
- [ ] 性能測試（確認限流不影響正常使用）
- [ ] 回滾測試（確認可以回滾）

### 部署階段
- [ ] 逐步上線（先測試環境，再生產環境）
- [ ] 監控日誌和錯誤
- [ ] 確認所有功能正常
- [ ] 記錄部署過程

---

## 🔄 回滾計劃

如果任何改動導致問題，按以下順序回滾：

1. **立即回滾**：恢復代碼到上一個穩定版本
   ```bash
   git checkout HEAD~1 -- <affected_files>
   npm install  # 如果需要移除依賴
   npm start
   ```

2. **環境變數回滾**：恢復 .env 到之前的配置

3. **資料庫回滾**：如果有資料庫變更，使用備份恢復

---

## 📝 後續階段

完成第一階段後，繼續實施：
- **第二階段（P1）**：CSRF 保護、輸入驗證增強、SQL 注入審查等
- **第三階段（P2）**：API 版本控制、監控告警等

---

**計劃結束**
