# 日誌工具使用說明

## 概述

為了讓終端機輸出更清晰、不雜亂，我們建立了統一的日誌工具 `utils/logger.js`。

## 日誌級別

日誌工具支援以下級別（從詳細到簡潔）：

1. **DEBUG** - 最詳細的調試資訊（如請求 body、檔案路徑等）
2. **INFO** - 一般資訊（如操作成功、記錄建立等）
3. **WARN** - 警告訊息（如檔案不存在、解析失敗等）
4. **ERROR** - 錯誤訊息（如 API 錯誤、資料庫錯誤等）
5. **NONE** - 不輸出任何日誌

## 環境變數設定

在 `.env` 檔案中設定 `LOG_LEVEL` 來控制輸出級別：

```env
# 開發環境：顯示所有日誌（包括 DEBUG）
LOG_LEVEL=DEBUG

# 生產環境：只顯示重要資訊（INFO、WARN、ERROR）
LOG_LEVEL=INFO

# 只顯示警告和錯誤
LOG_LEVEL=WARN

# 只顯示錯誤
LOG_LEVEL=ERROR

# 不輸出任何日誌
LOG_LEVEL=NONE
```

## 使用方式

### 1. 引入日誌工具

```javascript
const logger = require('../utils/logger');
```

### 2. 使用不同級別的日誌

```javascript
// DEBUG - 詳細調試資訊（只在開發環境顯示）
logger.debug('收到請求', { body: req.body, files: req.files });

// INFO - 一般資訊
logger.info(`報名記錄建立成功，ID: ${registration.id}`);

// WARN - 警告訊息
logger.warn('解析 JSON 失敗', error);

// ERROR - 錯誤訊息
logger.error('更新報名資料錯誤', error);

// 簡潔的成功訊息（不帶時間戳）
logger.simple.success('已發送郵件');
logger.simple.error('操作失敗');
logger.simple.warn('警告訊息');
logger.simple.info('資訊訊息');
```

## 輸出格式

### 標準格式（帶時間戳）

```
2025-01-20 10:30:45 [INFO]  報名記錄建立成功，ID: 123
2025-01-20 10:30:46 [ERROR] 更新報名資料錯誤
  └─ {
    "message": "Validation error",
    "stack": "..."
  }
```

### 簡潔格式（不帶時間戳）

```
✅ 已發送郵件
❌ 操作失敗
⚠️  警告訊息
ℹ️  資訊訊息
```

## 顏色標示

- **DEBUG** - 灰色（低調）
- **INFO** - 青色（資訊）
- **WARN** - 黃色（警告）
- **ERROR** - 紅色（錯誤）
- **SUCCESS** - 綠色（成功）

## 最佳實踐

1. **開發環境**：使用 `LOG_LEVEL=DEBUG` 查看所有詳細資訊
2. **生產環境**：使用 `LOG_LEVEL=INFO` 或 `LOG_LEVEL=WARN` 減少輸出
3. **調試時**：臨時改為 `LOG_LEVEL=DEBUG` 查看詳細資訊
4. **敏感資訊**：避免在日誌中輸出密碼、token 等敏感資訊

## 範例

### 之前（雜亂）

```javascript
console.log('收到更新報名請求，body:', req.body);
console.log('收到檔案:', req.files);
console.log('報名資料更新成功，ID:', registration.id);
console.error('更新報名資料錯誤:', error);
console.error('錯誤詳情:', {
  message: error.message,
  stack: error.stack,
  name: error.name
});
```

### 之後（清晰）

```javascript
logger.debug('收到更新報名請求', { body: req.body, files: req.files });
logger.info(`報名資料更新成功，ID: ${registration.id}`);
logger.error('更新報名資料錯誤', error);
```

在生產環境（`LOG_LEVEL=INFO`）中，DEBUG 訊息不會顯示，終端機輸出會更簡潔。
