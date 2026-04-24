# 資安整改快速實施指南

**目標**：快速、安全地實施所有高風險漏洞修復  
**預計時間**：2-4 小時  
**風險等級**：低（所有改動都可回滾）

---

## 🚀 快速開始

### 步驟 1：準備工作（10 分鐘）

```bash
# 1. 備份資料庫
cd reservation-backend
node scripts/backup-database.js

# 2. 備份代碼（Git commit）
git add .
git commit -m "備份：資安整改前"

# 3. 檢查當前資安狀態
node scripts/security-check.js
```

### 步驟 2：生成 JWT 密鑰（5 分鐘）

```bash
# 生成強密鑰
node scripts/generate-jwt-secret.js

# 將輸出的 JWT_SECRET 添加到 .env 檔案
# 編輯 .env，設定：
# JWT_SECRET=<生成的密鑰>
```

### 步驟 3：安裝安全依賴（5 分鐘）

```bash
npm install helmet express-rate-limit file-type
```

### 步驟 4：實施整改（60-90 分鐘）

按照 `SECURITY_REMEDIATION_PLAN.md` 中的步驟逐一實施：

1. ✅ JWT 密鑰修復（10 分鐘）
2. ✅ CORS 配置修復（10 分鐘）
3. ✅ Rate Limiting 實施（15 分鐘）
4. ✅ 錯誤訊息修復（10 分鐘）
5. ✅ 文件上傳驗證增強（20 分鐘）
6. ✅ 安全標頭實施（5 分鐘）
7. ✅ 環境變數文件保護（5 分鐘）
8. ✅ 登入失敗鎖定機制（15 分鐘）

### 步驟 5：驗證（30 分鐘）

```bash
# 1. 運行資安檢查
node scripts/security-check.js

# 2. 啟動服務器
npm start

# 3. 測試功能
# - 測試登入
# - 測試 API 請求
# - 測試文件上傳
# - 測試 Rate Limiting（快速發送多個請求）

# 4. 檢查安全標頭
curl -I http://localhost:3000/api/events
```

### 步驟 6：部署（30 分鐘）

```bash
# 1. 在測試環境部署
# 2. 監控日誌和錯誤
# 3. 確認所有功能正常
# 4. 部署到生產環境
```

---

## 📋 實施檢查清單

### 準備階段
- [ ] 資料庫備份完成
- [ ] 代碼備份完成（Git commit）
- [ ] 測試環境準備就緒

### 實施階段
- [ ] JWT 密鑰已生成並設定
- [ ] 安全依賴已安裝
- [ ] 所有代碼修改已完成
- [ ] 環境變數已更新

### 驗證階段
- [ ] 資安檢查通過（`node scripts/security-check.js`）
- [ ] 所有 API 功能正常
- [ ] Rate Limiting 正常工作
- [ ] 文件上傳驗證正常
- [ ] 安全標頭已設定

### 部署階段
- [ ] 測試環境部署成功
- [ ] 生產環境部署成功
- [ ] 監控正常運作
- [ ] 無錯誤日誌

---

## 🔄 如果出現問題

### 立即回滾

```bash
# 1. 停止服務
# Ctrl+C 或 kill <pid>

# 2. 恢復代碼
git checkout HEAD~1 -- <affected_files>

# 3. 恢復環境變數
# 編輯 .env，恢復之前的配置

# 4. 重新啟動
npm start
```

### 部分回滾

如果只有部分功能有問題，可以只回滾相關文件：

```bash
# 例如：只回滾 Rate Limiting
git checkout HEAD~1 -- middlewares/rateLimiter.js routes/loginRouter.js server.js
npm uninstall express-rate-limit
npm start
```

---

## 📞 支援

如果遇到問題：

1. 檢查 `SECURITY_REMEDIATION_PLAN.md` 中的詳細步驟
2. 查看錯誤日誌
3. 確認環境變數設定正確
4. 運行 `node scripts/security-check.js` 檢查配置

---

**最後更新**：2024-12-11
