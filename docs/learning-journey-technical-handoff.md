# Learning Journey 技術交接文件

本文件提供工程/維運交接重點，聚焦架構、資料來源、fallback、上線/回滾流程與 legacy 收斂策略。

---

## 1) API 架構

### 主體讀取 API（v3）

- `/api/v3/learning-journey/...`
- 包含總覽、risk students、readiness、data freshness、reconciliation 等

### 相容層 API（compatibility layer）

- `/api/admin/english-tests/*`
- 目前預設讀 v3，僅在 flag 明確為 false 時回 legacy
- 仍保留 fallback（v3 錯誤時回 legacy）

### 資料流圖（Data Flow）

1. 匯入/來源資料進入 canonical tables（`exam_attempts`、`exam_registrations`、`activity_participations`）
2. 透過 sync/rebuild 產出學期聚合（`student_semester_profiles`）
3. `/api/v3/learning-journey/*` 讀取 canonical + read model，輸出 KPI/學生/風險資料
4. `/api/admin/english-tests/*` 作為 compatibility layer，優先讀 v3，失敗時 fallback legacy
5. 前端 `/admin/learning-journey` 顯示資料來源與警示；舊 `/admin/english-test-tracking` 僅保留相容導向

---

## 2) Source of Truth

### Canonical tables

- `exam_attempts`
- `exam_registrations`
- `activity_participations`
- `student_semester_profiles`

### Legacy / deprecated tables（保留）

- `et_*` 系列（含 `et_exam_attempts`）
- 用途：fallback、對帳、稽核、回滾安全網

參考：`docs/data-source-of-truth.md`

---

## 3) Fallback 機制

對 `/api/admin/english-tests/*`：

1. 先嘗試 v3 路徑
2. v3 查詢失敗或不完整時
3. 自動 fallback 到 legacy
4. response 帶 `source` / `warnings` / `meta.debug.readModel`

目標：不中斷營運，同時可觀測切換風險。

---

## 4) Feature Flag

- `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL`
  - 預設策略：v3（Phase 6）
  - rollback：明確設為 `false`

注意：
- 不可在未完成 UAT/readiness 時任意變更旗標
- 旗標切換需搭配觀測與簽核流程

---

## 5) sync / reconciliation / readiness

- **sync**：資料同步（含 dry run / apply）
- **reconciliation**：來源與聚合差異對帳
- **readiness**：切換門檻判定（ready/not_ready/error）
- **data freshness**：canonical 資料時效狀態

建議順序：
1. sync（必要時）
2. reconciliation
3. readiness
4. data freshness
5. 再做切換判斷

---

## 6) Rollback 步驟

1. 設定 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=false`
2. 重啟後端
3. 驗證 `/api/admin/english-tests/*` 來源回 legacy
4. 核心頁面 smoke test：
   - summary
   - students list
   - student detail
5. 記錄 rollback 原因與時間

---

## 7) Deprecated legacy 模組列表（不刪除）

已標記 `@deprecated` 或視為 deprecated 的區塊：

- `routes/englishTestTrackingRouter.js`
- `services/englishTestTracking/englishTestReportService.js`
- `services/englishTestTracking/enrollmentImportService.js`
- `services/englishTestTracking/examAttemptImportService.js`
- `services/englishTestTracking/semesterBestSkillService.js`
- `services/englishTestTracking/reportService.js`
- 其餘 `englishTestTracking` 相關 et_* 流程（保留以支援 fallback/稽核）

---

## 8) 交接後建議維運節奏

- 每日：檢查 fallback 次數、關鍵 API latency、資料新鮮度
- 每週：檢查 v3/legacy 使用比例、風險名單波動、行政回饋
- 每月：評估 legacy 依賴是否下降，更新 API migration 計畫

---

## 9) KPI 使用治理規範

- **禁止直接查 DB 當 KPI**：臨時 SQL 查詢結果不可作為正式對外 KPI 依據。
- 正式 KPI 應以 Learning Journey API/頁面與核定報表流程產出。
- 若需做 DB 驗證，僅作為偵錯與對帳輔助，需註明查詢時間、條件與凍結點。

參考文件：
- `docs/api-migration-plan.md`
- `docs/data-source-of-truth.md`
- `docs/learning-journey-go-live-checklist.md`
- `docs/learning-journey-operation-manual.md`
