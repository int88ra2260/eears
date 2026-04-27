# Learning Journey v3 Read Model 正式 UAT 執行清單與切換判定

本清單提供行政端與開發者「照表執行」之最終 UAT 流程，用於判定是否可維持 v3 read model，或必須回復 legacy。

> 本文件僅為操作與驗收清單。  
> 不會自動修改 `.env`、不會自動開啟 flag、不涉及 migration。

---

## 1) UAT 前置條件

- [ ] 後端/前端可正常啟動，資料庫連線正常。  
- [ ] 已確認本次 UAT 範圍為 V2 read model 試切換，不含匯入流程變更。  
- [ ] 已完成最新版 `readiness`、`read-model-status`、`switch-log` 文件準備。  
- [ ] 已指定 UAT 負責人、驗收者、簽核者。  
- [ ] 已確認 fallback 機制存在且未移除。  

---

## 2) 測試基本資訊

- 測試日期：
- 測試學期（semesterId）：
- 測試環境（staging/prod-like）：
- 測試帳號角色：
  - 行政端（admin / executive）：
  - 開發或維運（admin）：

---

## 3) Readiness Check（開 flag 前）

### 3.1 執行

- API：`GET /api/v3/learning-journey/admin/readiness?semesterId=<semesterId>`
- CLI：`node scripts/check-learning-journey-readiness.js --semesterId=<semesterId>`

### 3.2 必填紀錄

- readiness status（ready/not_ready/error）：
- reconciliation check：
- summary compare check：
- students compare check：
- detail sample check：
- recommendation：

### 3.3 判定

- [ ] readiness = `ready` 才可進入開 flag 驗收。  
- [ ] readiness = `not_ready` 或 `error`，不得開 flag。  

---

## 4) Read-Model-Status 檢查（開 flag 前 / 後都要做）

API：`GET /api/v3/learning-journey/admin/read-model-status`

### 4.1 開 flag 前（baseline）

- `enableLearningJourneyV3ReadModel` 應為 `false`（預設）。
- `currentReadModel` 應為 `legacy_et_v2`。
- `fallbackEnabled` 應為 `true`。
- `affectedApis` 應列出 summary/students/student-detail 三支 API。

### 4.2 開 flag 後（試切換）

- `enableLearningJourneyV3ReadModel` 應為 `true`。
- `currentReadModel` 應為 `learning_journey_v3`。
- `fallbackEnabled` 仍為 `true`。

---

## 5) 開 flag 前後比較流程

1. 先記錄「開 flag 前」數據（summary / students / detail）。  
2. 人工開啟 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true` 並重啟後端。  
3. 再記錄「開 flag 後」同一批數據。  
4. 對照差異是否在容許範圍。  
5. 任何重大異常立即進入 rollback。  

---

## 6) Summary KPI 驗收

必填欄位：
- `rosterActiveStudentCount`
- `validBestScoreStudentCount`
- `attainedStudentCount`
- `attainmentRate`

檢核：
- [ ] 指標差異在容許範圍（參考 readiness 小幅差異規則或已核可之可解釋差異）。  
- [ ] 行政端可理解來源與數值。  

---

## 7) Students List 驗收

檢核：
- [ ] 無重大漏人（特別是 active 名冊學生）。  
- [ ] 主要欄位（attained、best skills）可解釋。  
- [ ] 頁面 source 提示可辨識目前資料來源。  

---

## 8) Student Detail 驗收

抽查建議：至少 10 位（高分、臨界、無成績、不同系所各類型）。

檢核：
- [ ] roster 顯示合理。  
- [ ] bestSkills 與 legacy 對照無 critical diff。  
- [ ] attempts 顯示與 CEFR 可解釋。  
- [ ] 頁面 source 提示可辨識目前資料來源。  

---

## 9) Learning Journey Hub 驗收

檢核：
- [ ] `readiness` 可查詢且結果可解讀。  
- [ ] `read-model-status` 可顯示 flag/currentReadModel/fallback/affectedApis。  
- [ ] compare 區塊可正常顯示（summary/students/detail）。  
- [ ] 行政端可理解頁面資訊與建議文字。  

---

## 10) Rollback 步驟（必要時立即執行）

1. 將 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL` 改回 `false`。  
2. 重啟後端服務。  
3. 呼叫 `read-model-status`，確認 `currentReadModel=legacy_et_v2`。  
4. 快速回歸檢查：
   - `/admin/english-test-tracking` summary/students/detail
   - `/admin/learning-journey` 狀態區塊
5. 於 switch log 記錄 rollback 時間、原因、處置人員。  

---

## 11) 切換判定規則（最終版）

### 11.1 可以維持 v3 條件（全部滿足）

- [ ] readiness = `ready`
- [ ] summary KPI 差異在容許範圍
- [ ] students list 無重大漏人
- [ ] student detail 抽查無 critical diff
- [ ] fallback 未頻繁觸發
- [ ] 行政端確認畫面可理解

### 11.2 必須回復 legacy 條件（任一成立即回復）

- [ ] readiness = `error`
- [ ] summary KPI 明顯不一致
- [ ] students list 漏掉 active 名冊學生
- [ ] student detail bestSkills 錯誤
- [ ] fallback 持續發生
- [ ] 行政端無法判讀資料來源

---

## 12) 最終簽核欄位

- UAT 執行者（姓名 / 日期）：
- 行政驗收者（姓名 / 日期）：
- 技術負責人（姓名 / 日期）：
- 最終決策（維持 v3 / 回復 legacy）：
- 決策說明：
- 後續追蹤事項：

