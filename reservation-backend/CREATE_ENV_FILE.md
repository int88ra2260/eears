# Windows 系統建立 .env 檔案指南

## 🖥️ **Windows 命令**

由於您使用 Windows 系統，請使用以下命令：

### **方法 1: 使用 Windows 命令**
```cmd
cd reservation-backend
copy env.example .env
```

### **方法 2: 使用 PowerShell**
```powershell
cd reservation-backend
Copy-Item env.example .env
```

### **方法 3: 手動建立** (最簡單)

1. **開啟檔案總管**，進入 `reservation-backend` 目錄
2. **複製 `env.example` 檔案**
3. **貼上並重新命名為 `.env`** (注意開頭的點)
4. **編輯 `.env` 檔案**，填入以下內容：

```env
# Gmail 郵件服務設定
GMAIL_USER=siwansalon@gmail.com
GMAIL_PASS=your_app_password_here

# 伺服器設定
PORT=3000
```

## 📧 **Gmail 應用程式密碼設定**

### **步驟 1: 啟用兩步驟驗證**
1. 前往 https://myaccount.google.com/
2. 點選左側「安全性」
3. 找到「兩步驟驗證」並啟用

### **步驟 2: 產生應用程式密碼**
1. 在「安全性」頁面，找到「應用程式密碼」
2. 點選「選取應用程式」→「郵件」
3. 點選「選取裝置」→「其他 (自訂名稱)」
4. 輸入「預約系統」
5. 點選「產生」
6. **複製 16 位密碼** (格式如：abcd efgh ijkl mnop)

### **步驟 3: 更新 .env 檔案**
將複製的密碼填入 `.env` 檔案：
```env
GMAIL_USER=siwansalon@gmail.com
GMAIL_PASS=abcd efgh ijkl mnop
```

## 🔧 **驗證設定**

### **檢查檔案是否建立成功**
```cmd
cd reservation-backend
dir .env
```
應該看到 `.env` 檔案列出。

### **測試環境變數載入**
```cmd
cd reservation-backend
node check_env_config.js
```

### **重啟後端服務**
```cmd
# 停止目前服務 (Ctrl+C)
node server.js
```

## ✅ **預期結果**

設定完成後，當有人預約時應該看到：
```
✅ Gmail 郵件服務已配置
📧 Email sent successfully: reservationSuccess to student@example.com
```

而不是：
```
❌ Failed to send email: reservationSuccess Error: Missing credentials
```

## 🚨 **如果仍有問題**

### **常見問題**
1. **密碼錯誤**：確認使用應用程式密碼，不是Gmail登入密碼
2. **格式錯誤**：密碼可能包含空格，請完整複製
3. **帳戶問題**：確認Gmail帳戶已啟用兩步驟驗證

### **除錯步驟**
1. 檢查 `.env` 檔案是否在正確位置
2. 確認檔案內容格式正確（沒有多餘空格）
3. 重啟後端服務載入新的環境變數
4. 查看控制台輸出的詳細錯誤訊息

## 💡 **替代方案**

如果暫時不需要郵件功能：
- 系統已經優化，會自動跳過郵件發送
- 預約功能完全正常運作
- 可以稍後再設定郵件功能

**最簡單的方法：手動複製 `env.example` 為 `.env`，然後編輯填入 Gmail 設定！**
