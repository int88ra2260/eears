# 安全性強化與程式碼重構實施指南

## 🎯 專案概述

本指南提供完整的實施步驟，用於對 EEARS 預約系統進行安全性強化與程式碼重構。採用小步快跑、可回滾的策略，確保系統穩定性的同時提升安全性。

## 📋 實施清單

### 階段一：基礎安全強化 (已完成)

#### ✅ 1. 環境變數管理
- [x] 建立 `env.example` 範本檔案
- [x] 建立 `config/security.js` 安全配置模組
- [x] 更新 `middlewares/auth.js` 使用環境變數
- [x] 更新 `routes/loginRouter.js` 移除硬編碼密碼
- [x] 建立環境變數設定輔助腳本 `scripts/setup-env.js`

#### ✅ 2. 安全中介軟體
- [x] 建立 `middlewares/security.js` 安全中介軟體
- [x] 實施登入限流保護
- [x] 實施 API 限流保護
- [x] 設定安全 HTTP 標頭
- [x] 實施輸入清理機制

#### ✅ 3. 測試框架
- [x] 建立 `tests/setup.js` 測試環境設定
- [x] 建立 `tests/auth.test.js` 認證測試
- [x] 建立 `tests/security.test.js` 安全測試
- [x] 建立 `scripts/security-test.js` 安全測試腳本

#### ✅ 4. 文件與指南
- [x] 建立 `SECURITY_REFACTOR_PLAN.md` 實施計劃
- [x] 建立 `docs/adr/001-env-management.md` ADR 文件
- [x] 建立 `docs/adr/002-auth-refactor.md` ADR 文件
- [x] 建立 `docs/deployment-guide.md` 部署指南
- [x] 建立 `docs/PR_TEMPLATE.md` PR 模板

## 🚀 部署步驟

### 1. 環境準備

```bash
# 1. 安裝新依賴
cd reservation-backend
npm install express-rate-limit helmet

# 2. 設定環境變數
node scripts/setup-env.js

# 3. 驗證環境變數
node scripts/setup-env.js --validate
```

### 2. 測試驗證

```bash
# 1. 執行單元測試
npm test

# 2. 執行安全測試
node scripts/security-test.js

# 3. 執行整合測試
npm run test:coverage
```

### 3. 部署到測試環境

```bash
# 1. 建置前端
cd ../reservation-frontend
npm run build
cp -r build/* ../reservation-backend/build/

# 2. 啟動測試伺服器
cd ../reservation-backend
npm start
```

### 4. 生產環境部署

```bash
# 1. 設定生產環境變數
cp env.example .env.production
# 編輯 .env.production 設定生產環境參數

# 2. 部署到生產環境
NODE_ENV=production npm start
```

## 🔍 驗收標準

### 安全性驗收
- [ ] 所有密鑰移至環境變數
- [ ] 密碼使用 bcrypt 加密
- [ ] JWT 使用強密鑰
- [ ] 所有輸入都有驗證
- [ ] 設定安全 HTTP 標頭
- [ ] 通過 OWASP Top 10 檢查

### 功能驗收
- [ ] 管理員登入正常
- [ ] 工讀生登入正常
- [ ] 所有 API 端點正常
- [ ] 前端功能正常
- [ ] 資料庫操作正常

### 效能驗收
- [ ] 回應時間 < 500ms
- [ ] 記憶體使用正常
- [ ] 無記憶體洩漏
- [ ] 資料庫查詢效率正常

## 🔄 回滾程序

### 緊急回滾
```bash
# 1. 停止服務
pm2 stop reservation-backend

# 2. 回滾程式碼
git checkout previous-stable-tag

# 3. 恢復舊配置
git checkout HEAD~1 -- routes/loginRouter.js
git checkout HEAD~1 -- middlewares/auth.js

# 4. 重啟服務
pm2 start reservation-backend
```

### 資料回滾
```bash
# 恢復資料庫備份
mysql -u root -p activity_reservation < backup_$(date +%Y%m%d).sql
```

## 📊 監控指標

### 系統監控
- 系統可用性 > 99.5%
- 平均回應時間 < 500ms
- 錯誤率 < 0.1%
- CPU 使用率 < 80%
- 記憶體使用率 < 80%

### 安全監控
- 登入失敗率 < 5%
- 限流觸發次數
- 異常請求數量
- 安全事件數量

### 業務監控
- 預約成功率 > 95%
- 使用者滿意度 > 4.0/5.0
- 系統使用率
- 功能使用統計

## 🛠️ 故障排除

### 常見問題

#### 1. 環境變數未載入
```bash
# 檢查 .env 檔案
ls -la .env

# 檢查環境變數
node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
```

#### 2. 認證失敗
```bash
# 檢查密碼加密
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('test', 12))"

# 檢查 JWT 密鑰
echo $JWT_SECRET
```

#### 3. 限流問題
```bash
# 檢查限流配置
grep "RATE_LIMIT" .env

# 檢查限流日誌
grep "RATE_LIMIT" logs/app.log
```

### 日誌分析
```bash
# 查看認證日誌
grep "AUTH" logs/app.log

# 查看安全事件
grep "SECURITY" logs/app.log

# 查看錯誤日誌
grep "ERROR" logs/app.log
```

## 📚 相關資源

### 文件
- [安全重構計劃](./SECURITY_REFACTOR_PLAN.md)
- [部署指南](./docs/deployment-guide.md)
- [ADR-001: 環境變數管理](./docs/adr/001-env-management.md)
- [ADR-002: 認證系統重構](./docs/adr/002-auth-refactor.md)

### 腳本
- [環境變數設定](./scripts/setup-env.js)
- [安全測試](./scripts/security-test.js)

### 測試
- [認證測試](./tests/auth.test.js)
- [安全測試](./tests/security.test.js)

## 🎉 成功指標

### 短期目標 (1-2 週)
- [ ] 消除所有硬編碼密鑰
- [ ] 通過安全掃描
- [ ] 測試覆蓋率 > 80%
- [ ] 系統穩定運行

### 中期目標 (1 個月)
- [ ] 零安全漏洞
- [ ] 效能優化完成
- [ ] 監控系統建立
- [ ] 文件完善

### 長期目標 (3 個月)
- [ ] 系統架構優化
- [ ] 新功能開發
- [ ] 使用者體驗提升
- [ ] 系統擴展性提升

## 📞 支援聯絡

- **技術支援**: tech-support@example.com
- **安全問題**: security@example.com
- **緊急聯絡**: emergency@example.com
- **文件更新**: docs@example.com

---

**注意**: 請確保在實施任何變更前，先備份現有系統和資料。如有任何問題，請立即聯絡技術支援團隊。
