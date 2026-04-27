# Learning Journey v3 Read Model 試切換 UAT 與操作手冊

本文件目的：提供營運與工程在 **不直接正式切換** 的前提下，安全執行 V2 read model 試切換（feature flag）與回復流程。

> 重要原則  
> - 不可自動修改 `.env`。  
> - 不可跳過 reconciliation / readiness。  
> - 不可移除 fallback。  
> - 不可刪除 legacy 流程與資料。  

---

## 1) 試切換前檢查

1. 確認環境資料庫可連線，且後端可正常啟動。  
2. 確認本學期 `semesterId`（例如 `114-1`）。  
3. 確認本次為「試切換」，非正式全面切換。  
4. 確認已可使用以下 API：  
   - `/api/v3/learning-journey/admin/reconciliation?semesterId=...`  
   - `/api/v3/learning-journey/admin/readiness?semesterId=...`  
5. 確認 fallback 邏輯仍存在（admin summary/students/detail 在 v3 失敗時回 legacy）。  

---

## 2) reconciliation 必須檢查

建議順序：

1. 執行 reconciliation：
   - API：`GET /api/v3/learning-journey/admin/reconciliation?semesterId=114-1`
   - 或 CLI：`node scripts/check-learning-journey-reconciliation.js 114-1`
2. 必看項目：
   - `queryErrors` 是否為空
   - 各 section 是否有 `status=error`
3. 若有 error：不得進入試切換，先排除 DB/查詢/資料問題。  
4. 若僅 warning：可繼續，但必須在 UAT 記錄差異來源與解釋。  

---

## 3) sync dryRun / apply 流程

### 3.1 dryRun（預設）

```bash
node scripts/sync-learning-journey.js --semesterId=114-1 --sections=all --dryRun
```

或省略 `--dryRun`，不帶 `--apply` 也會是 dry run。

### 3.2 apply（需審核同意）

```bash
node scripts/sync-learning-journey.js --semesterId=114-1 --sections=all --apply
```

### 3.3 建議流程

1. 先 dryRun，確認 `inserted/updated/skipped/errors`。  
2. 若 dryRun 結果可接受，再 apply。  
3. apply 後重新跑 reconciliation 與 readiness。  

---

## 4) readiness check 流程

### 4.1 API

`GET /api/v3/learning-journey/admin/readiness?semesterId=114-1`

### 4.2 CLI（Phase 5-14）

```bash
node scripts/check-learning-journey-readiness.js --semesterId=114-1
```

CLI 輸出重點：
- reconciliation status
- summary compare status
- students compare status
- detail sample status
- final readiness status
- recommendation

exit code：
- `ready` / `not_ready` => `0`
- `error` => `1`

### 4.3 判讀

- `ready`：可進入試切換（仍需人工 spot check）。  
- `not_ready`：不得開 flag，先處理 checks 中 warning。  
- `error`：系統/查詢錯誤，先修復再重試。  

---

## 5) 如何開啟 ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true

> 本步驟只在 readiness = ready，且 UAT 負責人同意後執行。

1. 人工編輯後端環境設定（例如 `.env` 或部署平台變數）。  
2. 設定：
   - `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true`
3. 重啟後端服務。  
4. 立即執行「切換後頁面檢查」與驗收表。  

---

## 6) 如何回復 false（rollback）

1. 將環境變數改回：
   - `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=false`
2. 重啟後端服務。  
3. 再次檢查 `/admin/learning-journey` 與相容 API 輸出 `source` 是否回到 legacy。  
4. 記錄 rollback 時間、操作者、原因。  

---

## 7) 切換後必檢頁面與重點

1. `/admin/learning-journey`
   - 頁面可載入
   - summary 顯示合理
2. summary KPI
   - 人數/達成率與對照結果一致（允許小幅差異）
3. students list
   - 筆數與主要欄位（attained、best skills）符合預期
4. student detail
   - roster、bestSkills、attempts 顯示正常
   - 無明顯 critical diff（bestSkills / attempts）
5. `/admin/learning-journey`
   - readiness/reconciliation/compare 可正常顯示

---

## 8) 人工 spot check 建議

- 隨機抽 10 位學生（含高分/臨界/無成績個案）  
- 逐一對照：
  - summary KPI 是否可解釋
  - students list 欄位是否一致
  - detail（bestSkills、attempts）是否一致
- 任一不可解釋差異，先標記 not ready，勿正式切換。  

---

## 9) 驗收表格（UAT Checklist）

| 項目 | 結果（Pass/Fail） | 證據（連結/截圖/輸出） | 備註 |
|------|-------------------|--------------------------|------|
| reconciliation 無 queryErrors 且無 section error |  |  |  |
| sync dryRun 已執行並審閱結果 |  |  |  |
| （必要時）sync apply 已執行，且重新對帳 |  |  |  |
| readiness 結果為 ready |  |  |  |
| summary compare 符合門檻 |  |  |  |
| students compare 符合門檻 |  |  |  |
| detail sample compare 無 critical diff |  |  |  |
| 開啟 flag 後 `/admin/learning-journey` 正常 |  |  |  |
| 開啟 flag 後 students list 正常 |  |  |  |
| 開啟 flag 後 student detail 正常 |  |  |  |
| `/admin/learning-journey` 各區塊正常 |  |  |  |
| rollback（false）演練成功 |  |  |  |

---

## 10) 建議決策

- 僅當上表全部 Pass，且營運已簽核，才可進入下一階段。  
- 若任一核心項目 Fail，維持 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=false`。  
