# 郵件帳號配置說明

## 📧 雙帳號郵件系統

系統已實作雙 Transporter 架構，分別使用不同的 Gmail 帳號發送不同類型的郵件。

## 🔧 環境變數配置

在 `reservation-backend/.env` 檔案中設定以下環境變數：

```env
# 活動預約相關郵件帳號
GMAIL_USER=siwansalon@gmail.com
GMAIL_PASS=armodvorszqwimwt

# 培力英檢報名相關郵件帳號
BESTEP_GMAIL_USER=emi.t.c@g-mail.nsysu.edu.tw
BESTEP_GMAIL_PASS=fvpchzqtvkbjtcmu
```

## 📋 郵件分類

### 活動預約相關郵件（使用 `GMAIL_USER`）
- `reservationSuccess` - 預約成功通知
- `reservationCancellation` - 預約取消通知
- `blacklistNotification` - 黑名單違規通知

**發件人**：`siwansalon@gmail.com`

### 培力英檢報名相關郵件（使用 `BESTEP_GMAIL_USER`）
- `englishTestRegistrationSuccess` - 報名完成通知（僅在學生完成報名時發送）
- `englishTestRegistrationRejected` - 報名資料請修正通知
- `englishTestRegistrationUpdated` - 報名資料修改通知（發送給中心）
- `englishTestRegistrationModificationComplete` - 報名資料修改完成通知（發送給學生）
- `englishTestRegistrationFinalSuccess` - 報名成功通知（名單確認後）
- `englishTestRegistrationFinalFailure` - 報名失敗通知（名單確認後）

**發件人**：`emi.t.c@g-mail.nsysu.edu.tw`

## ⚙️ 系統行為

1. **自動選擇機制**：系統會根據郵件模板類型自動選擇對應的 transporter 和發件人
2. **向後兼容**：如果 `BESTEP_GMAIL_USER` 未設定，系統會自動使用 `GMAIL_USER` 作為備用
3. **密碼處理**：應用程式密碼中的空格會自動移除
4. **日誌記錄**：所有郵件發送都會記錄使用的發件人地址

## 🔍 驗證配置

啟動伺服器後，檢查控制台輸出：

```
✅ 活動預約郵件服務已配置: siwansalon@gmail.com
✅ 培力英檢郵件服務已配置: emi.t.c@g-mail.nsysu.edu.tw
```

如果看到警告訊息，請檢查環境變數設定。

## 📝 注意事項

1. **應用程式密碼**：請使用 Gmail 應用程式密碼，不是登入密碼
2. **空格處理**：系統會自動移除密碼中的空格，但建議在 `.env` 檔案中直接使用無空格的密碼
3. **安全性**：請勿將 `.env` 檔案提交到版本控制系統
4. **測試**：建議在測試環境中先驗證郵件發送功能

## 🛠️ 故障排除

### 問題：郵件發送失敗

1. 檢查環境變數是否正確設定
2. 確認 Gmail 帳號已啟用兩步驟驗證
3. 確認應用程式密碼是否正確
4. 檢查網路連線
5. 查看伺服器日誌中的錯誤訊息

### 問題：使用錯誤的發件人

1. 確認環境變數設定正確
2. 檢查郵件模板類型是否正確
3. 查看日誌中的發件人資訊
