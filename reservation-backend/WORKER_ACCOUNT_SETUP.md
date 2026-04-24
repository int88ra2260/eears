# Worker帳號設置說明

## 概述
已成功新增一個Worker權限的管理員帳號，具有以下特點：
- **帳號**: `emiptworker`
- **密碼**: `1215`
- **權限**: 僅能查看預約、對學生進行簽到和標記違規

## 修改的檔案

### 1. `routes/loginRouter.js`
- 新增Worker帳號的登入邏輯
- 支援兩種角色：`admin` 和 `worker`
- 登入成功時回傳角色資訊

### 2. `middlewares/auth.js`
- 新增 `adminMiddleware`: 僅允許管理員
- 新增 `workerMiddleware`: 允許管理員和Worker
- 新增 `workerOnlyMiddleware`: 僅允許Worker

### 3. `routes/blacklistRouter.js`
- 所有違規相關功能都加上 `authMiddleware` 和 `workerMiddleware`
- Worker可以：
  - 登記違規
  - 批次登記違規
  - 匯入CSV違規資料
  - 下載CSV範本
  - 查看違規紀錄
  - 刪除違規紀錄

### 4. `routes/reservationRouter.js`
- 預約查詢功能加上 `authMiddleware` 和 `workerMiddleware`
- Worker可以查看所有預約資料

### 5. `routes/eventRouter.js`
- 查看功能加上 `workerMiddleware`：
  - 查看活動詳情
  - 查看活動報表
  - 查看活動預約
  - 匯出Excel報表
- 管理功能加上 `adminMiddleware`：
  - 創建活動
  - 修改活動
  - 刪除活動

## 權限對比

| 功能 | 管理員 (admin) | Worker (worker) |
|------|----------------|-----------------|
| 查看活動 | ✅ | ✅ |
| 查看預約 | ✅ | ✅ |
| 查看報表 | ✅ | ✅ |
| 匯出Excel | ✅ | ✅ |
| 登記違規 | ✅ | ✅ |
| 查看違規紀錄 | ✅ | ✅ |
| 創建活動 | ✅ | ❌ |
| 修改活動 | ✅ | ❌ |
| 刪除活動 | ✅ | ❌ |
| 問卷設定 | ✅ | ❌ |

## 測試方法

### 1. 登入測試
```bash
# Worker帳號登入
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"emiptworker","password":"1215"}'

# 管理員帳號登入
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"emieearsweb","password":"5808"}'
```

### 2. 權限測試
使用登入獲得的token來測試不同功能：

```bash
# 查看預約 (Worker和管理員都可以)
curl -X GET http://localhost:3000/api/reservations \
  -H "Authorization: Bearer YOUR_TOKEN"

# 登記違規 (Worker和管理員都可以)
curl -X POST http://localhost:3000/api/blacklist/recordViolation \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"studentId":"B12345678","reason":"無故未到"}'

# 創建活動 (僅管理員可以)
curl -X POST http://localhost:3000/api/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"測試活動","date":"2024-12-15","startTime":"10:00","endTime":"12:00","maxCapacity":30}'
```

## 安全注意事項

1. **密碼安全**: 建議在生產環境中更改預設密碼
2. **Token過期**: 目前設定為1小時過期
3. **權限分離**: Worker無法進行系統管理操作
4. **審計日誌**: 建議記錄所有違規操作

## 部署說明

1. 確保所有修改的檔案都已更新
2. 重啟後端服務
3. 測試Worker帳號登入
4. 驗證權限控制是否正常運作

## 故障排除

如果遇到問題，請檢查：
1. 伺服器是否正常啟動
2. 資料庫連線是否正常
3. Token是否正確傳遞
4. 權限中間件是否正確載入
