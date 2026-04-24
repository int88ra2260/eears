# 郵件服務設定指南

## 🔧 **設定 Gmail 郵件服務**

### **問題說明**
錯誤訊息 `Missing credentials for "PLAIN"` 表示 Gmail 認證資訊缺失或不正確。

### **解決步驟**

#### **1. 建立 .env 檔案**
在 `reservation-backend` 目錄下建立 `.env` 檔案：

```bash
# 複製範例檔案
cp .env.example .env
```

#### **2. 設定 Gmail 應用程式密碼**

##### **步驟 A: 啟用兩步驟驗證**
1. 前往 [Google 帳戶設定](https://myaccount.google.com/)
2. 選擇「安全性」
3. 啟用「兩步驟驗證」

##### **步驟 B: 產生應用程式密碼**
1. 在「安全性」頁面找到「應用程式密碼」
2. 選擇「郵件」和「其他」
3. 輸入「預約系統」作為應用程式名稱
4. 複製產生的 16 位密碼

#### **3. 更新 .env 檔案**
```env
GMAIL_USER=your_actual_gmail@gmail.com
GMAIL_PASS=your_16_digit_app_password
```

**注意**: 
- `GMAIL_PASS` 使用應用程式密碼，不是 Gmail 登入密碼
- 應用程式密碼格式如：`abcd efgh ijkl mnop`

### **📧 郵件功能說明**

系統會在以下情況發送郵件：
1. **預約成功** - 發送確認通知
2. **預約取消** - 發送取消通知  
3. **黑名單通知** - 發送違規處理通知

### **🔒 安全性考量**

#### **生產環境**
- 使用專用的 Gmail 帳戶
- 定期更換應用程式密碼
- 限制帳戶權限

#### **開發環境**
- 可以暫時停用郵件功能進行測試
- 系統會在無法發送郵件時記錄日誌但不影響核心功能

### **🚫 暫時停用郵件功能**

如果暫時不需要郵件功能，可以：

#### **方法 1: 不設定環境變數**
- 不建立 `.env` 檔案或不設定 `GMAIL_USER`、`GMAIL_PASS`
- 系統會自動跳過郵件發送，僅記錄日誌

#### **方法 2: 使用測試模式**
在 `.env` 檔案中設定：
```env
# 留空表示停用郵件功能
GMAIL_USER=
GMAIL_PASS=
```

### **🧪 測試郵件功能**

設定完成後，可以測試郵件功能：

```bash
cd reservation-backend
node -e "
const { sendEmail } = require('./config/email');
sendEmail('reservationSuccess', {
  studentId: 'B123456789',
  studentName: '測試學生',
  studentEmail: 'test@example.com',
  eventName: '測試活動',
  date: '2024-01-15',
  startTime: '12:10',
  endTime: '13:00'
}).then(() => console.log('測試完成'));
"
```

### **❗ 常見問題**

#### **Q: 仍然出現認證錯誤**
A: 
1. 確認已啟用兩步驟驗證
2. 確認使用應用程式密碼，不是帳戶密碼
3. 檢查 `.env` 檔案是否在正確位置
4. 重啟後端服務載入新的環境變數

#### **Q: 郵件發送緩慢**
A: Gmail 有發送頻率限制，正常現象

#### **Q: 想要更換郵件服務商**
A: 修改 `config/email.js` 中的 transporter 設定即可

### **🎯 目前狀態**

- ✅ 郵件功能已優化，支援優雅降級
- ✅ 無郵件設定時系統仍可正常運作
- ✅ 提供詳細的錯誤日誌和設定指引
- ✅ 不影響核心預約功能

設定完成後，預約系統的郵件通知功能就能正常運作了！
