# 自定義活動類型功能說明

## 🎯 **功能概述**

新增了「其他」活動類型選項，允許管理員創建自定義的活動類型，並填寫該活動類型的預約時間規則說明。

## 📋 **活動類型選項**

現在系統支援以下五種活動類型：

1. **English Table** - 前一天 00:00 開放預約
2. **Job Talk** - 這個禮拜一 12:00 開放預約  
3. **English Club** - 上禮拜三 12:00 開放預約
4. **International Forum** - 上禮拜五 12:00 開放預約
5. **其他** - 使用 English Table 邏輯，但可填寫自定義規則說明

## 🔧 **實作細節**

### **資料庫層**
- ✅ Event 模型新增 `customReservationRule` 欄位 (TEXT, 可為空)
- ✅ 提供資料庫遷移腳本 `add-custom-reservation-rule.sql`

### **後端 API**
- ✅ POST /api/events - 支援 `customReservationRule` 參數
- ✅ PUT /api/events/:id - 支援編輯自定義規則
- ✅ GET /api/events - 回應包含 `customReservationRule`
- ✅ 所有相關 API 都已更新

### **前端介面**

#### **新增活動表單** (`AdminPage.js`)
- ✅ 重新設計為多行表單，提升使用體驗
- ✅ 活動類型下拉選單包含「其他」選項
- ✅ 選擇「其他」時顯示額外填寫欄位：
  - 自定義活動類型名稱
  - 預約時間規則說明
- ✅ 表單驗證確保必要欄位已填寫

#### **編輯活動功能**
- ✅ EditEventModal 支援「其他」活動類型
- ✅ AdminPage 內建編輯模態框同步更新
- ✅ 智能處理現有自定義活動的編輯

#### **活動顯示**
- ✅ EventDetail 組件顯示自定義活動的預約規則說明
- ✅ 活動列表正確顯示自定義活動類型

## 📊 **使用流程**

### **新增自定義活動類型**
1. 管理員選擇「其他」活動類型
2. 填寫自定義活動類型名稱（如：Workshop、Seminar等）
3. 填寫預約時間規則說明（如：活動開始前三天的下午2點）
4. 系統使用 English Table 邏輯計算實際預約時間
5. 儲存自定義規則說明供使用者參考

### **學生查看自定義活動**
1. 在活動詳情中看到活動類型
2. 查看系統計算的實際預約時間
3. 閱讀管理員提供的預約規則說明
4. 按照實際開放時間進行預約

## ⚙️ **技術實現**

### **預約時間計算邏輯**
```javascript
// 自定義活動類型使用 default 分支
switch (event.eventType) {
  case 'English Table':
  case 'Job Talk':
  case 'English Club':
  case 'International Forum':
    // 各自的特定邏輯
    break;
  default:
    // 自定義活動類型使用 English Table 邏輯
    openStart = eventStart.subtract(1, 'day').startOf('day');
    openEnd = eventStart.subtract(2, 'hour');
    break;
}
```

### **前端條件式顯示**
```javascript
// 檢查是否為自定義活動類型
const isCustomType = !['English Table', 'Job Talk', 'English Club', 'International Forum'].includes(event.eventType);

// 顯示自定義規則說明
{isCustomType && event.customReservationRule && (
  <div>預約規則：{event.customReservationRule}</div>
)}
```

## 🚀 **部署步驟**

### 1. **執行資料庫遷移**
```sql
-- 執行 migrations/add-custom-reservation-rule.sql
ALTER TABLE Events ADD COLUMN customReservationRule TEXT NULL;
```

### 2. **重啟服務**
- 重啟後端服務載入新的模型和 API
- 重新建置前端載入新的介面

### 3. **測試功能**
- 測試新增「其他」類型活動
- 驗證預約時間計算正確
- 確認規則說明正確顯示

## ✨ **功能特色**

- 🎯 **靈活性**：支援任意自定義活動類型
- 🛡️ **安全性**：自定義活動使用穩定的 English Table 邏輯
- 📝 **可讀性**：提供規則說明讓使用者了解預約時間
- 🔧 **易用性**：條件式表單，只在需要時顯示額外欄位
- 🔄 **一致性**：前後端邏輯保持同步

## 📋 **注意事項**

1. **自定義活動類型的預約時間**：固定使用 English Table 邏輯（前一天00:00開始）
2. **規則說明**：僅為參考資訊，實際預約時間以系統計算為準
3. **向後相容**：現有活動不受影響
4. **資料完整性**：customReservationRule 為可選欄位

這個功能既保持了系統的穩定性，又提供了足夠的靈活性來應對未來可能的新活動類型需求。
