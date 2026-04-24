# 郵件帳號配置快速指南

## 🚀 快速設定

在 `reservation-backend/.env` 檔案中加入以下設定：

```env
# 活動預約相關郵件帳號
GMAIL_USER=siwansalon@gmail.com
GMAIL_PASS=armodvorszqwimwt

# 培力英檢報名相關郵件帳號
BESTEP_GMAIL_USER=emi.t.c@g-mail.nsysu.edu.tw
BESTEP_GMAIL_PASS=fvpchzqtvkbjtcmu
```

## ✅ 驗證設定

啟動伺服器後，應該看到：

```
✅ 活動預約郵件服務已配置: siwansalon@gmail.com
✅ 培力英檢郵件服務已配置: emi.t.c@g-mail.nsysu.edu.tw
```

## 📧 郵件分類

| 郵件類型 | 使用帳號 | 發件人 |
|---------|---------|--------|
| 活動預約成功/取消/黑名單 | `GMAIL_USER` | siwansalon@gmail.com |
| 培力英檢報名/審核通知 | `BESTEP_GMAIL_USER` | emi.t.c@g-mail.nsysu.edu.tw |

## 🔍 測試建議

1. **測試活動預約郵件**：建立一個活動預約，確認收到來自 `siwansalon@gmail.com` 的郵件
2. **測試培力英檢郵件**：完成培力英檢報名，確認收到來自 `emi.t.c@g-mail.nsysu.edu.tw` 的郵件

## ⚠️ 注意事項

- 密碼中的空格會自動移除，但建議直接使用無空格的密碼
- 如果 `BESTEP_GMAIL_USER` 未設定，系統會自動使用 `GMAIL_USER` 作為備用
- 請確保兩個 Gmail 帳號都已啟用兩步驟驗證並產生應用程式密碼
