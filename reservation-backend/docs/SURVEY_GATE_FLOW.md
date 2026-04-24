# 問卷 Gate 流程圖

## 流程概述

問卷 Gate 功能確保學生在預約活動前必須完成對應的問卷（本學期一次）。

## 流程圖（Mermaid）

```mermaid
graph TD
    A[使用者點擊預約] --> B[填寫預約表單]
    B --> C[提交預約請求]
    C --> D{檢查問卷狀態}
    
    D -->|已填寫| E[繼續預約流程]
    D -->|未填寫| F[返回 409 狀態碼]
    
    F --> G[前端導向問卷頁]
    G --> H[保存預約資訊到 sessionStorage]
    H --> I[使用者填寫問卷]
    
    I --> J{問卷驗證}
    J -->|驗證失敗| I
    J -->|驗證成功| K[提交問卷]
    
    K --> L[檢查是否有待完成預約]
    L -->|有| M[自動嘗試預約]
    L -->|無| N[跳轉到首頁]
    
    M --> O{預約結果}
    O -->|成功| P[顯示成功訊息]
    O -->|失敗| Q[顯示錯誤訊息]
    
    P --> N
    Q --> N
    E --> R[預約成功]
    R --> S[發送 Email 通知]
```

## 狀態轉移圖

```mermaid
stateDiagram-v2
    [*] --> 預約表單填寫
    預約表單填寫 --> 檢查問卷: 提交預約
    檢查問卷 --> 問卷已填: 已填寫
    檢查問卷 --> 導向問卷頁: 未填寫
    
    導向問卷頁 --> 填寫問卷: 開始填寫
    填寫問卷 --> 驗證問卷: 提交
    驗證問卷 --> 填寫問卷: 驗證失敗
    驗證問卷 --> 檢查待完成預約: 驗證成功
    
    檢查待完成預約 --> 自動預約: 有待完成預約
    檢查待完成預約 --> 首頁: 無待完成預約
    
    自動預約 --> 預約成功: 預約成功
    自動預約 --> 預約失敗: 預約失敗
    預約成功 --> 首頁
    預約失敗 --> 首頁
    
    問卷已填 --> 預約成功: 通過檢查
    預約成功 --> 發送通知: 完成預約
    發送通知 --> [*]
```

## 資料流

### 1. 預約請求階段

```
前端 EventDetail.js
  ↓
POST /api/reservations
  ↓
middleware: checkSurvey
  ↓
檢查問卷狀態
  ↓
[已填] → 繼續預約
[未填] → 返回 409 + redirectUrl
```

### 2. 問卷填寫階段

```
前端 SurveyPage.js
  ↓
載入問卷配置 (surveys.json)
  ↓
從 localStorage 取得學生資訊
  ↓
填寫問卷
  ↓
POST /api/surveys/:surveyId
  ↓
後端驗證並儲存
```

### 3. 自動回跳預約階段

```
問卷完成
  ↓
檢查 sessionStorage.pendingReservation
  ↓
[有] → 自動 POST /api/reservations
  ↓
顯示結果
  ↓
清除 sessionStorage
  ↓
跳轉到首頁
```

## 關鍵檔案

### 後端
- `backend/middlewares/checkSurvey.js` - 問卷檢查 middleware
- `backend/routes/surveyRouter.js` - 問卷 API
- `backend/models/EnglishTableSurvey.js` - ET 問卷模型
- `backend/models/EnglishClubSurveyResponse.js` - EC 問卷模型
- `backend/models/SurveySettings.js` - 問卷設定模型

### 前端
- `frontend/src/components/EventDetail.js` - 預約表單與問卷 Gate 邏輯
- `frontend/src/components/SurveyPage.js` - 問卷頁面與自動回跳
- `frontend/src/components/DynamicSurveyModal.js` - 動態問卷表單
- `frontend/public/surveys.json` - 問卷配置

## Admin 管理功能

### 問卷開關
- 路徑：`/admin/survey-settings`
- 功能：開啟/關閉問卷 Gate
- 影響：問卷關閉時，所有學生無需填寫問卷即可預約

### 問卷狀態查詢
- 路徑：`/admin/surveys`
- 功能：查看問卷填寫統計
- 功能：匯出問卷資料 Excel

---

**文件版本**: v1.0.0
**最後更新**: 2025-01-XX

