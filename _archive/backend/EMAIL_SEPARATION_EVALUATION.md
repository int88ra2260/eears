# 郵件帳號分離評估報告

## 📋 評估目標

評估系統使用不同信箱分別發送「活動預約相關郵件」和「培力英檢報名相關郵件」的可行性與實作方案。

## 🔍 現況分析

### 當前郵件架構

1. **統一郵件配置**
   - 使用單一 Gmail 帳號（`GMAIL_USER` 和 `GMAIL_PASS`）
   - 所有郵件通過同一個 `transporter` 實例發送
   - 發件人地址統一為 `process.env.GMAIL_USER`

2. **郵件類型分類**

   **活動預約相關郵件**：
   - `reservationSuccess` - 預約成功通知
   - `reservationCancellation` - 預約取消通知
   - `blacklistNotification` - 黑名單違規通知

   **培力英檢報名相關郵件**：
   - `englishTestRegistrationSuccess` - 報名完成通知
   - `englishTestRegistrationApproved` - 報名審核通過通知
   - `englishTestRegistrationRejected` - 報名審核拒絕通知

3. **郵件發送流程**
   - 活動預約郵件：使用 `emailQueue` 佇列系統（非阻塞）
   - 培力英檢郵件：直接調用 `sendEmail` 函數

## ✅ 可行性評估

### 技術可行性：**完全可行**

#### 優點
1. **職責分離**：不同業務使用不同郵件帳號，職責清晰
2. **管理便利**：可以分別管理兩類郵件的發送量、監控和統計
3. **風險隔離**：一個帳號出現問題不會影響另一個業務
4. **專業形象**：可以使用更專業的郵件地址（如 `bestep@mail.nsysu.edu.tw`）

#### 技術實現方式
- Nodemailer 支援多個 transporter 實例
- 可以根據郵件模板類型選擇對應的 transporter
- 環境變數配置簡單，易於維護

### 實作複雜度：**中等**

需要修改的檔案：
1. `config/email.js` - 核心郵件配置
2. `.env` 檔案 - 新增環境變數
3. 郵件模板中的 `from` 欄位

## 🛠️ 實作方案

### 方案一：雙 Transporter 架構（推薦）

#### 架構設計
```javascript
// 活動預約郵件 transporter
let reservationTransporter = null;

// 培力英檢郵件 transporter  
let englishTestTransporter = null;
```

#### 環境變數配置
```env
# 活動預約郵件帳號
GMAIL_USER=reservation@example.com
GMAIL_PASS=app_password_1

# 培力英檢郵件帳號
BESTEP_GMAIL_USER=bestep@example.com
BESTEP_GMAIL_PASS=app_password_2
```

#### 優點
- 完全隔離，互不影響
- 配置清晰，易於維護
- 可以分別設定不同的發送策略

#### 缺點
- 需要管理兩個 Gmail 帳號
- 需要兩個應用程式密碼

### 方案二：單 Transporter + 動態 From 欄位

#### 架構設計
```javascript
// 單一 transporter，但根據模板類型動態設定 from 欄位
const getSenderEmail = (template) => {
  const englishTestTemplates = [
    'englishTestRegistrationSuccess',
    'englishTestRegistrationApproved',
    'englishTestRegistrationRejected'
  ];
  
  if (englishTestTemplates.includes(template)) {
    return process.env.BESTEP_GMAIL_USER || process.env.GMAIL_USER;
  }
  return process.env.GMAIL_USER;
};
```

#### 優點
- 只需要一個 Gmail 帳號（如果使用 Gmail 別名）
- 實作簡單，改動較小

#### 缺點
- 如果使用不同帳號，仍需要兩個 transporter（Gmail 不允許用 A 帳號的 transporter 發送 B 帳號的郵件）
- 功能上等同於方案一

## 📝 建議實作步驟

### 步驟 1：修改環境變數配置
在 `.env` 檔案中新增培力英檢專用郵件帳號：
```env
BESTEP_GMAIL_USER=bestep@mail.nsysu.edu.tw
BESTEP_GMAIL_PASS=your_app_password
```

### 步驟 2：修改 `config/email.js`
- 建立第二個 transporter 實例
- 修改 `sendEmail` 函數，根據模板類型選擇對應的 transporter
- 更新郵件模板中的 `from` 欄位

### 步驟 3：測試驗證
- 測試活動預約郵件發送
- 測試培力英檢郵件發送
- 確認發件人地址正確

### 步驟 4：更新文檔
- 更新 `EMAIL_SETUP_GUIDE.md`
- 更新部署文檔

## ⚠️ 注意事項

1. **Gmail 應用程式密碼**
   - 兩個帳號都需要啟用兩步驟驗證
  向 Gmail 申請兩個應用程式密碼

2. **郵件發送限制**
   - Gmail 免費帳號每日發送限制約 500 封
   - 如果郵件量大，考慮使用 Gmail Workspace 或專業郵件服務

3. **向後兼容性**
   - 如果 `BESTEP_GMAIL_USER` 未設定，可以回退使用 `GMAIL_USER`
   - 確保現有功能不受影響

4. **監控與日誌**
   - 分別記錄兩類郵件的發送狀態
   - 便於問題排查和統計分析

## 📊 影響範圍評估

### 需要修改的檔案
1. `config/email.js` - 核心修改
2. `.env.example` - 新增環境變數範例
3. `EMAIL_SETUP_GUIDE.md` - 更新設定指南

### 不需要修改的檔案
- `routes/reservationRouter.js` - 無需修改（使用 emailQueue）
- `routes/englishTestRegistrationRouter.js` - 無需修改（直接調用 sendEmail）
- `utils/emailQueue.js` - 無需修改（使用 sendEmail 函數）

## 🎯 結論

**建議採用方案一（雙 Transporter 架構）**

理由：
1. ✅ 技術實現簡單明確
2. ✅ 職責分離清晰
3. ✅ 風險隔離良好
4. ✅ 易於維護和擴展
5. ✅ 符合最佳實踐

**實作難度**：⭐⭐☆☆☆（簡單到中等）

**預估工作量**：2-4 小時（包含測試）

**風險等級**：低（向後兼容，可逐步遷移）

---

## ✅ 實作完成狀態

**實作日期**：2025-01-11

**實作內容**：
1. ✅ 已建立雙 Transporter 架構
   - `reservationTransporter` - 活動預約相關郵件
   - `bestepTransporter` - 培力英檢報名相關郵件
2. ✅ 已實作自動選擇機制
   - 根據郵件模板類型自動選擇對應的 transporter
   - 培力英檢模板：`englishTestRegistrationSuccess`, `englishTestRegistrationApproved`, `englishTestRegistrationRejected`
   - 活動預約模板：`reservationSuccess`, `reservationCancellation`, `blacklistNotification`
3. ✅ 已更新所有郵件模板的 `from` 欄位
4. ✅ 已實作向後兼容機制
   - 如果未設定 `BESTEP_GMAIL_USER`，會回退使用 `GMAIL_USER`

**環境變數配置**：
```env
# 活動預約相關郵件帳號
GMAIL_USER=siwansalon@gmail.com
GMAIL_PASS=armodvorszqwimwt

# 培力英檢報名相關郵件帳號
BESTEP_GMAIL_USER=emi.t.c@g-mail.nsysu.edu.tw
BESTEP_GMAIL_PASS=fvpchzqtvkbjtcmu
```

**注意事項**：
- 應用程式密碼中的空格會自動移除
- 如果 `BESTEP_GMAIL_USER` 未設定，系統會自動使用 `GMAIL_USER` 作為備用
- 所有郵件發送都會記錄使用的發件人地址，便於追蹤和除錯
