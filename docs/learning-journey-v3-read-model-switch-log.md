# Learning Journey v3 Read Model 試切換觀測紀錄

本文件用於記錄 Phase 5-15 小範圍試切換（UAT/演練），確保每次操作皆可追蹤、回報、回復。

> 注意：本文件是「觀測與紀錄模板」，不是自動切換工具。  
> 不可在未完成 readiness 與人工 spot check 前，直接視為正式切換。

---

## 使用方式

- 每次試切換請新增一筆「觀測紀錄」。
- 請附上關鍵 API 回應或截圖連結（summary/students/detail/readiness）。
- 如有 rollback，務必記錄時間點與原因。

---

## 觀測紀錄模板

### [範例編號：2026-04-24-01]

- 測試日期：
- 測試學期（semesterId）：
- 測試人員：
- 測試環境（dev/staging/prod-like）：

#### A. Flag 與狀態

- 切換前 flag：`ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=`
- 切換後 flag：`ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=`
- read-model-status API：
  - `enableLearningJourneyV3ReadModel`：
  - `currentReadModel`：
  - `fallbackEnabled`：
  - `affectedApis`：

#### B. Readiness 結果

- readiness 執行時間：
- readiness status（ready/not_ready/error）：
- checks 摘要：
  - reconciliation：
  - summary compare：
  - students compare：
  - detail sample：
- recommendation：

#### C. 切換前數據（legacy）

- summary KPI（主要欄位）：
  - rosterActiveStudentCount：
  - validBestScoreStudentCount：
  - attainedStudentCount：
  - attainmentRate：
- students list（筆數/差異摘要）：
- student detail 抽樣（學號）：
- `/admin/learning-journey` 觀測：

#### D. 切換後數據（v3）

- summary KPI（主要欄位）：
  - rosterActiveStudentCount：
  - validBestScoreStudentCount：
  - attainedStudentCount：
  - attainmentRate：
- students list（筆數/差異摘要）：
- student detail 抽樣（學號）：
- `/admin/learning-journey` 觀測：

#### E. 觀察到的差異

- 差異類型（summary/students/detail/ui）：
- 差異內容：
- 是否可解釋：
- 需要後續處理：

#### F. 是否回復 legacy

- 是否執行 rollback（是/否）：
- rollback 時間：
- rollback 後狀態：
  - flag：
  - read-model-status.currentReadModel：

#### G. 結論

- 本次試切換判定（可續行/需修正後再試/停止）：
- 決策說明：
- 後續 action items：

---

## 簡表（可快速彙整）

| 測試日期 | 學期 | 人員 | Flag | Readiness | 差異摘要 | 是否 rollback | 結論 |
|----------|------|------|------|-----------|----------|---------------|------|
|          |      |      |      |           |          |               |      |

---

## 完整範例模板（before flag / after flag / observed diff / final decision）

> 下列為可直接複製填寫的完整範例格式；每次正式 UAT 建議至少留存一筆。

### [正式 UAT 範例：YYYY-MM-DD-SEMESTER]

#### 0) 基本資訊

- 測試日期：
- 測試學期（semesterId）：
- 測試環境：
- 測試人員：

#### 1) before flag（切換前）

- `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=false`
- `read-model-status`：
  - `enableLearningJourneyV3ReadModel`：
  - `currentReadModel`：`legacy_et_v2`
  - `fallbackEnabled`：
- readiness：
  - `status`：
  - `checks` 摘要：
- 基準數據（before）：
  - summary KPI：
  - students list（總筆數 / 主要差異）：
  - student detail 抽查（學號與摘要）：

#### 2) after flag（切換後）

- `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true`
- `read-model-status`：
  - `enableLearningJourneyV3ReadModel`：
  - `currentReadModel`：`learning_journey_v3`
  - `fallbackEnabled`：
- 切換後數據（after）：
  - summary KPI：
  - students list（總筆數 / 主要差異）：
  - student detail 抽查（學號與摘要）：

#### 3) observed diff（觀察差異）

- summary 差異：
- students list 差異：
- student detail 差異：
- fallback 觸發情況（次數/時間/API）：
- 是否可解釋：

#### 4) final decision（最終判定）

- 判定結果：`維持 v3` / `回復 legacy`
- 判定依據（對照 final UAT checklist）：
- 是否執行 rollback：
  - rollback 時間：
  - rollback 後 `currentReadModel`：
- 簽核人員：
  - 執行者：
  - 行政驗收：
  - 技術負責：
