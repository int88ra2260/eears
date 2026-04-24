# 測試指南

文件索引（Phase 2.6 封版）：`docs/PHASE_2_6_PERMISSION_MATRIX.md`、`docs/DEVELOPER_PERMISSION_GUIDE.md`

## 測試架構

本專案使用 **Jest** 作為測試框架，支援單元測試、整合測試與 E2E 測試。

## 執行測試

```bash
# 執行所有測試
npm test

# 執行測試並產生覆蓋率報告
npm run test:coverage

# 監聽模式（自動重新執行）
npm run test:watch
```

## 測試類型

### 1. 單元測試

位置：`tests/*.test.js`

- **問卷檢查 Middleware** (`tests/checkSurvey.test.js`)
  - 測試 `studentId` 參數驗證
  - 測試問卷 Gate 邏輯（已填/未填/開關）
  - 測試錯誤處理

- **參數驗證** (`tests/studentIdValidation.test.js`)
  - 測試所有 API 端點的 `studentId` 參數驗證
  - 驗證錯誤回應格式

- **黑名單規則** (`tests/blacklistRules.test.js`)
  - 測試違規累積邏輯
  - 測試黑名單解除時間計算
  - 測試 No-Show 自動標記

### 2. 整合測試

位置：`tests/integration/*.test.js`

- **預約流程** (`tests/integration/reservationFlow.test.js`)
  - 測試完整的預約流程（問卷 Gate → 黑名單檢查 → 預約建立）
  - 驗證各步驟的錯誤處理

### 3. E2E 測試

> **注意**：E2E 測試需要實際的資料庫和前端環境。建議使用 Playwright 或 Cypress。

關鍵測試場景：

1. **問卷 Gate 流程**
   - 未填問卷 → 導向問卷頁 → 完成問卷 → 自動回跳預約 → 成功預約

2. **黑名單阻擋**
   - 黑名單使用者嘗試預約 → 顯示警告 Modal → 無法繼續

3. **報表簽到流程**
   - Admin 登入 → 進入報表頁 → 搜尋/排序 → 簽到 → 驗證狀態更新

## 覆蓋率要求

- **關鍵模組**：至少 70% 行數覆蓋率
- **重點路徑**：問卷檢查、參數驗證、黑名單規則

### 驗證覆蓋率

```bash
npm run test:coverage
node scripts/verify-coverage.mjs --lines 70 --branches 70 --functions 70 --statements 70
```

## 測試資料準備

### 測試資料庫

建議使用獨立的測試資料庫，並在測試前後重置資料：

```javascript
beforeAll(async () => {
  // 連接測試資料庫
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  // 關閉連接
  await sequelize.close();
});
```

### Mock 資料

使用 Jest 的 `jest.mock()` 來模擬外部依賴：

```javascript
jest.mock('../models', () => ({
  User: {
    findOne: jest.fn()
  }
}));
```

## 持續整合 (CI)

### GitHub Actions 範例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - run: node scripts/verify-coverage.mjs --lines 70
```

## 故障排除

### 常見問題

1. **測試超時**
   - 增加 `jest.setTimeout(10000)` 或設定環境變數 `jest --testTimeout=10000`

2. **資料庫連接錯誤**
   - 確認測試環境變數設定正確
   - 使用測試專用的資料庫

3. **Mock 未生效**
   - 確認 `jest.mock()` 在 `describe` 或 `it` 之前呼叫
   - 檢查模組路徑是否正確

## 最佳實踐

1. **測試命名**：使用描述性的測試名稱（例如：`應該返回 400 當 studentId 為 undefined`）

2. **測試隔離**：每個測試應該獨立，不依賴其他測試的執行順序

3. **清理資料**：使用 `beforeEach` 和 `afterEach` 清理測試資料

4. **錯誤處理**：測試應該驗證錯誤情況，不僅僅是成功情況

5. **測試覆蓋率**：定期檢查覆蓋率報告，確保關鍵路徑有足夠的測試

## 相關文件

- [Jest 官方文件](https://jestjs.io/)
- [Supertest 文件](https://github.com/visionmedia/supertest)
- [CHANGELOG.md](../CHANGELOG.md) - 功能變更記錄
- [TASKS.md](../TASKS.md) - 任務清單

