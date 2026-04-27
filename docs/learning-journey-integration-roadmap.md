# Learning Journey 正式整合路線圖

本文件描述 EEARS「英語學習歷程中心（Learning Journey）」與既有培力／BESTEP／legacy 英檢資料流程之**資料真實來源**、**收斂順序**與**禁止事項**，供 Phase 5-7 以後之工程與營運對帳依循。

---

## A. 現況（模組對照）

| 模組 | 路徑／API 特徵 | 角色 |
|------|----------------|------|
| 培力英檢管理 | `/admin/english-test`、`/api/english-test/...` | 培力報名審核、匯出、團報等 **營運主流程** |
| Learning Journey legacy 匯入流程 | `/admin/english-test-tracking/legacy`、`/api/english-tests/...` | 名冊／成績 **匯入與重算**（寫入 `et_*`） |
| Learning Journey 相容讀取路徑 | `/admin/english-test-tracking`、`/api/admin/english-tests/...` | 舊書籤導向與相容 API（讀 `et_*`） |
| BESTEP 匯入 | `/admin/english-test/import`、`/api/admin/bestep/...` | BESTEP 出席／成績 **匯入**（寫入 `bestep_*`） |
| Learning Journey | `/admin/learning-journey`、`/api/v3/learning-journey/...` | **唯讀聚合**、timeline、**資料對帳**（`aggregateReadModelService`、`reconciliationService`） |

---

## B. 目前資料真實來源（Write vs Read）

### Write source（權威寫入）

- **培力報名**：`english_test_registrations`（使用者／審核流程寫入）。
- **Learning Journey legacy 名冊／成績**：`et_enrollment_snapshots`、`et_exam_attempts`、`et_exam_attempt_skill_scores`、`et_semester_student_best_skills` 等（legacy 匯入 API 寫入）。
- **BESTEP**：`bestep_attendance`、`bestep_exam_scores` 等（BESTEP 匯入寫入）。
- **活動預約**：`reservations` + `events`（預約／簽到流程寫入）。
- **LJS 本體（若已啟用 migration／同步）**：`students`、`exam_registrations`、`exam_attempts`、`activity_participations`、`student_semester_profiles` 等——**僅在明確同步作業寫入**，現階段多為 **read model／過渡**。

### Read model（聚合／快取）

- **相容摘要 API**：讀 `et_*` + 既有 service，**不作為新寫入來源**。
- **Learning Journey 聚合 API**：讀多表拼出單一視圖；**不取代** `et_*` 寫入。
- **`student_semester_profiles` 等**：設計上為 LJS **快取／彙總**，與 `et_enrollment_snapshots` 需 **對帳** 後再信賴為行政唯一口徑。

### Transitional（過渡）

- **`exam_attempts`（LJS）**：可承接 BESTEP／舊 ET 同步之 **目標表**，但在未完成雙寫與對帳前，**不得**視為唯一真實來源。
- **`exam_registrations`**：與 `english_test_registrations` 並存時，以 **對帳 API** 確認差異後再決定主從。

---

## C. 建議收斂順序

1. **第一階段：v3 唯讀聚合**（已完成雛形）  
   - 行政可於「英語學習歷程中心」檢視跨來源資料；**不關閉**既有頁面。

2. **第二階段：資料對帳**（進行中）  
   - `GET /api/v3/learning-journey/admin/reconciliation?semesterId=`  
- 名冊、報名、BESTEP、legacy 英檢資料、活動五區塊 **source vs aggregate** 差異清單。

3. **第三階段：匯入同步**（設計後實作）  
   - 在**不改變既有匯入入口**前提下，增加 **background 或 post-import hook** 將資料寫入 LJS 表（需 idempotent、可重跑）。

4. **第四階段：V2 改讀 v3**  
   - 儀表與列表改呼叫 v3 read API，後端仍以 `et_*` 為主存；或 v3 內部 proxy 既有 service，**對前端單一契約**。

5. **第五階段：Legacy 下線**  
   - 匯入與報表全數遷移且對帳穩定後，關閉 `/api/english-tests` 寫入與 legacy UI；**保留** DB 表與唯讀查詢期（稽核）。

---

## D. 禁止事項

- **不可**在未完成備份與對帳的情況下 **直接刪除 `et_*` 表或資料**。
- **不可**在未經雙軌驗證下 **直接移除舊匯入流程**（培力／Legacy／BESTEP）。
- **不可**將 **`exam_attempts` 單表** 宣告為全模組唯一真實來源（須與 `et_*`、`bestep_*` 並存至收斂完成）。
- **不可**跳過 **資料對帳**（reconciliation）即切換行政主口徑或關閉舊頁。

---

## E. 對帳語意備註（實作對齊）

- **Learning Journey legacy 英檢 D 區**：`et_exam_attempts` 無學期欄位，故「來源側」取 **本學期名冊內** 且至少一筆 attempt 之學生集合；「聚合側」為 `exam_attempts` 中 `semester_id` 相符且 `source_type` 為 **`LEGACY_ET` 或 `MANUAL`**（目前 ENUM 無 `ET_TRACKING`，若未來新增應併入對帳）。
- **活動 E 區**：來源為 `reservations` + `events` 經 `semesters.code` 對學期；聚合為 `activity_participations.semester_id`。若活動未填 `events.semesterId`，對帳可能偏少，屬 **資料填寫問題** 而非 API 錯誤。

---

## G. Phase 5-8：第一批同步（可重跑 Job／API／CLI）

本階段在**不改相容摘要讀源**、**不下線 legacy**、**不刪 `et_*`**、**不把 `exam_attempts` 當唯一真實來源**、**不做 destructive migration** 之前提下，將既有資料**冪等**寫入 LJS read model，供對帳與 Learning Journey 聚合使用。

### G.1 端點與契約

- **`POST /api/v3/learning-journey/admin/sync`**（需與對帳相同之管理權限）
- **Body（JSON）**

```json
{
  "semesterId": "114-2",
  "sections": ["roster", "exam_registration", "bestep_scores", "activities"],
  "dryRun": true
}
```

- **`semesterId`**：必填，格式同對帳（如 `114-2`）。
- **`sections`**：陣列；可含 `roster`、`exam_registration`、`bestep_scores`、`activities`；若含字串 **`all`** 則四區全跑。
- **`dryRun`**：選填；**未傳或為 `true`** 時僅計算預計異動並回傳統計，**整段作業於單一 transaction 內執行後 rollback**；**`dryRun: false`** 時才 commit 寫入。

### G.2 各區塊 source → target

| section key | 來源 | 目標 |
|-------------|------|------|
| `roster` | `et_enrollment_snapshots`（`isActive=true`） | `student_semester_profiles` |
| `exam_registration` | `english_test_registrations`（`semester`） | `exam_registrations`（`registration_channel = system`，每學期一筆） |
| `bestep_scores` | `bestep_exam_scores`（`semester`） | `exam_attempts`（`source_type=BESTEP`）+ `exam_attempt_skill_scores` |
| `activities` | `reservations` + `events`（經 `semesters.code` 對學期） | `activity_participations`（`source_ref = lj_sync_reservation:<reservationId>`） |

### G.3 冪等、人工修正與 safe overwrite

- **冪等**：同一來源鍵重跑不應產生重複 unique（例如 `exam_attempts.dedupe_key`、`activity_participations` 之 `student_id`+`event_id`+`source_ref`）。
- **不刪來源**：僅 INSERT／UPDATE 目標表，不刪除 `et_*`、`english_test_registrations`、`bestep_exam_scores`、`reservations`。
- **不任意覆蓋人工修正**：
  - 名冊：`student_semester_profiles.roster_source === manual` 之列整筆**跳過**。
  - 報名：`exam_registrations.meta_json.syncManualLock === true` 跳過。
  - 活動：`activity_participations.meta_json.syncManualLock === true` 跳過。
  - BESTEP：已存在之 `dedupe_key` 對應列視為已同步**跳過**（若需改分數應走專用修正流程或解除鎖定約定）；`raw_payload.syncManualLock` 亦跳過。
- **Safe overwrite**：非上述鎖定／manual 之列，可由同步更新與來源一致之欄位（例如名冊 `is_rostered`、`et_snapshot` 相關旗標；已存在之 `lj_sync_reservation` 列可更新簽到狀態）。

### G.4 dryRun / apply 規則摘要

| 模式 | DB |
|------|-----|
| `dryRun: true`（預設） | 每區塊獨立 transaction，跑完 **rollback**，回傳 `inserted`／`updated`／`skipped`／`errors` |
| `dryRun: false` | 同上但 **commit** |

### G.5 Rollback 限制

- **正式 apply 已 commit 後**無法由本 API 自動還原；需依備份／手動 SQL 或另案補償流程。
- **dryRun** 僅保證「該次預覽未持久化」，不作為正式資料的快照還原機制。

### G.6 CLI

- 檔案：`reservation-backend/scripts/sync-learning-journey.js`
- 範例：`node scripts/sync-learning-journey.js --semesterId=114-2 --sections=roster,bestep_scores --dryRun`
- 寫入：`node scripts/sync-learning-journey.js --semesterId=114-2 --sections=all --apply`  
  （未帶 `--apply` 時預設為 dry run。）

---

## H. Phase 5-9：Learning Journey read model 切換準備（feature flag 與指標比較）

本階段**不**改 `/admin/english-test-tracking` 相容導向、**不**刪除 `/api/admin/english-tests`、**不**做 migration、**不**改舊匯入流程；僅新增可比對之 Learning Journey summary 與 compare API，供管理端評估差異。

### H.1 環境變數（預設關閉）

- `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL`：預設 **`false`**（未設或值非 `true` 皆視為關閉）。
- 用途：標記「是否允許後續階段將相容 API **正式**改讀 Learning Journey read model」之營運開關；**compare／Learning Journey summary API 仍可在 flag 為 false 時呼叫**，以利先比對再決策。

### H.2 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/v3/learning-journey/semesters/:semesterId/english-test-summary` | LJS：`student_semester_profiles`（`is_rostered`）+ `exam_attempts`（`valid`）+ `exam_attempt_skill_scores` 計算與相容摘要對齊之欄位；`source: learning_journey_v3`；不足時 `dataQuality.warnings`，不應 500。 |
| GET | `/api/v3/learning-journey/semesters/:semesterId/english-test-summary/compare` | 並列 `englishTestReportService.getSemesterSummary`（legacy）與上列 Learning Journey summary，含 `diff`（Learning Journey − legacy）與 `status`：`ok`／`warning`／`error`。 |

### H.3 切換門檻（建議）

- 對帳與 **compare** 於主要指標（名冊人數、有效分數人數、達標人數、達成率）差異 **接近零**（或已可解釋之已知差異）後，再評估啟用 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true` 作為後續試切換之前提（實際改路由／改 UI 屬更後階段）。

### H.4 Rollback 策略

- **未改相容 API 讀源前**：無需 rollback；關閉 feature flag 即可恢復「僅以 legacy 為權威認知」之營運狀態。
- **若未來已改讀 Learning Journey**：rollback 為將讀源改回 `et_*`／既有 service，並將 flag 設回 `false`；已寫入 LJS 表之資料不以此 flag 回溯刪除。

### H.5 前端

- Learning Journey Hub 新增「**資料一致性比對**」：呼叫 compare API，顯示 legacy／Learning Journey／diff；差異極小時提示「可進入試切換評估」。

### H.6 Phase 5-10：Learning Journey Summary KPI 試切換（僅 summary）

- **`GET /api/admin/english-tests/semesters/:id/summary`**：`ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true` 時優先回傳 Learning Journey 計算之 KPI，並附 `source`、`meta.debug.readModel`；`false` 時仍走 legacy，並標示 `legacy_et_v2`。
- **Fallback**：Learning Journey 失敗時自動改回 legacy，`source`／`readModel` 為 `legacy_et_v2_fallback`，`warnings` 含固定英文提示。
- **差異提醒**：flag 為 true 且 Learning Journey 成功時，另載入 legacy 比對；若名冊人數差 &gt;0、有成績／達標人數差 &gt;5、或達成率差 &gt;0.03，於 `warnings` 附加提醒（不阻擋回應）。
- **英語學習歷程中心**：`/admin/learning-journey` 顯示 KPI、CEFR、學生名單與進階資料來源診斷；舊 `/admin/english-test-tracking` 僅保留 redirect。

### H.7 Phase 5-11：學生列表 read model 對照與試切換預備

- **v3 列表**：`GET /api/v3/learning-journey/semesters/:semesterId/english-test-students`（對齊 admin students 欄位；分頁含 `total`；`source: learning_journey_v3`）。
- **對照**：`GET /api/v3/learning-journey/semesters/:semesterId/english-test-students/compare`（全量比對學號集合與 attained／四項 best CEFR；`sampleDiff` 最多 20 筆）。
- **Admin students 預留**：`ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true` 時 `/api/admin/english-tests/semesters/:id/students` 嘗試 v3，失敗 fallback legacy，並附 `source`／`meta.debug.readModel`／`warnings`；預設 false 不影響現行 UI。
- **Hub**：新增「學生列表對照」區塊。

### H.8 Phase 5-12：學生詳情 read model 對照與試切換預備

- **v3 詳情**：`GET /api/v3/learning-journey/semesters/:semesterId/english-test-students/:studentId`（欄位對齊 admin student detail，並附 `activities`、`examRegistrations`、`dataQuality`）。
- **對照**：`GET /api/v3/learning-journey/semesters/:semesterId/english-test-students/:studentId/compare`（legacy 與 v3 並列；`diff`、`status`：`ok`／`warning`／`error`）。
- **Admin 詳情預留**：`ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true` 時 `/api/admin/english-tests/semesters/:id/students/:studentId` 嘗試 v3，失敗 fallback legacy，並附 `source`／`warnings`／`meta.debug.readModel`；預設 false。
- **Hub**：新增「學生詳情對照」區塊（不變更詳情頁 UI 讀源）。

### H.9 Phase 5-13：V2 read model 試切換驗收門檻（readiness gate）

本階段**不**新增資料表、**不**自動修改 `.env`、**不**自動將 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL` 設為 `true`、**不**移除 admin 端 v3 失敗時之 **fallback**。

#### H.9.1 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/v3/learning-journey/admin/readiness?semesterId=114-1` | 整合 `reconciliation`、`english-test-summary` compare、`english-test-students` compare，以及自 **legacy 名冊**排序後取前 **10** 位學號之 **student detail** compare；回傳 `status`：`ready`／`not_ready`／`error`、`checks[]`、`recommendation`。 |

#### H.9.2 切換門檻（實作摘要）

| 項目 | `ready` 條件 | `error` |
|------|----------------|---------|
| 對帳 | `queryErrors` 為空，且各 `sections[].status` **無** `error`；區塊為 `warning` 時**不**單獨阻擋 `ready`，但會於 `recommendation` 提醒仍建議同步／釐清 | 對帳查詢拋錯、或存在 `queryErrors`、或任一區塊 `error` |
| 摘要 compare | `status === 'ok'`，或為 `warning` 且差異在**小幅門檻**內（與 Hub 試切換提示一致：名冊／有效分數／達標人數差 ≤1 且達成率差 ≤0.001，或 diff 全為 0），且 v3 `dataQuality` 無 `severity === 'error'` | `status === 'error'` 或 legacy／v3 載入失敗 |
| 學生列表 compare | `diffCount < 5` **或** `diffCount / max(legacyCount, v3Count, 1) < 5%`；且 compare 本身非 `error` | compare 回傳 `error`（legacy／v3 列表失敗） |
| 詳情抽樣 | 每位抽樣學生之 detail compare：**非** `error`，且 diff 中**無** critical（`bestSkills` 任一欄位不一致；`attempts` 之 `count` 或 `skillCefrSignature` 不一致）。`examRegistrations`／`activities`／`roster` 顯示欄位差異不計入 critical | 任一位抽樣 compare `error`（無法載入 legacy／v3 詳情等） |

`not_ready`：上述任一**核心**檢查為 `warning` 且超過門檻（摘要、學生列表、詳情抽樣），且整體無 `error`。

#### H.9.3 不建議人工直接打開 flag 的情境

- **readiness** 回傳 `error` 或 `not_ready` 時，仍手動設 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=true`——儀表／列表／詳情可能與營運認知之 `et_*` 口徑不一致，且 fallback 會隱藏穩定讀 v3 與否。
- **對帳**存在 `queryErrors` 或區塊 `error`（資料庫／查詢失敗）時——應先排除連線與 schema 問題。
- **摘要或學生列表**與 legacy 差異大、或抽樣詳情出現 **bestSkills／attempts** 核心差異——應先跑同步、對帳或人工查因，勿僅依 flag 切換掩蓋問題。

#### H.9.4 Rollback 與營運操作

- **試切換後要恢復僅信賴 legacy**：將環境變數 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL` 設回 **`false`** 並重啟後端；無需 migration。已寫入 LJS 表之資料**不會**因關閉 flag 而刪除。
- **後端已實作 fallback**：flag 為 `true` 時若 v3 read 失敗，admin 相關 API 仍回傳 legacy 並附 `warnings`；關閉 flag 即完全走 legacy，與本階段前之行為一致。
- **正式 apply 同步後**若需還原寫入之 LJS 資料：本專案 sync API **不提供**自動 undo；需備份還原或依營運手冊執行 SQL／補償（見 §G.5）。

#### H.9.5 前端

- Learning Journey Hub 新增「**切換準備度**」：呼叫 readiness API，顯示整體狀態、`checks` 與 `recommendation`。

### H.10 Phase 5-14：V2 Read Model 試切換 UAT 與操作手冊

本階段不新增大型功能，重點是「如何安全試切換」與「如何回復」的實務操作：

- 新增 UAT 文件：`docs/learning-journey-v3-read-model-uat.md`
  - 試切換前檢查
  - reconciliation 必檢項目
  - sync dryRun/apply 流程
  - readiness 流程
  - 開啟/回復 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL`
  - 切換後頁面驗收與表格
- 新增 readiness CLI：`reservation-backend/scripts/check-learning-journey-readiness.js`
  - `node scripts/check-learning-journey-readiness.js --semesterId=114-1`
  - 輸出四大 check 與 final status/recommendation
  - exit code：`ready/not_ready => 0`、`error => 1`
- Rollback：明確規範為 flag 改回 `false` + 重啟後端，並再次 spot check。
- 人工 spot check：要求抽樣學生與頁面巡檢，避免僅依單一 API 結果決策。
- 明確禁止：**不可直接正式切換**（未完成 UAT 與簽核前，不可視為正式上線切換）。

### H.11 Phase 5-15：V2 Read Model 小範圍試切換與觀測紀錄

本階段不做大型功能改造，重點是讓試切換「可觀測、可回報、可追蹤」：

- 新增觀測紀錄文件：`docs/learning-journey-v3-read-model-switch-log.md`
  - 記錄測試日期、學期、測試人員、flag 狀態、readiness 結果、切換前/後數據、差異、是否 rollback、結論。
- 新增 read model 狀態 API：`GET /api/v3/learning-journey/admin/read-model-status`
  - 回傳 flag、`currentReadModel`、受影響 API、fallback 狀態與 warnings。
- Learning Journey Hub 新增「目前 Read Model 狀態」區塊：
  - 顯示 flag 是否開啟、目前相容讀源、fallback、受影響 API。
- 相容摘要來源可見性：
  - 保持 summary badge；
  - students list / student detail 若 response 帶 `source`，顯示簡單來源提示。
- 安全限制維持：
  - 不自動改 `.env`
  - 不自動開啟 flag
  - 不 migration
  - 不刪 legacy
  - 不改匯入流程
  - 不移除 fallback

## I. Phase 6：正式產品化與收斂（進行中）

- **Phase 6-1**：compatibility API 預設讀 Learning Journey read model（僅明確 `false` 時 rollback 到 legacy）。
- **Phase 6-2**：legacy Learning Journey 路由/服務標記 `@deprecated`，dev mode 顯示警告。
- **Phase 6-3**：維持 `/api/admin/english-tests/*` 為 compatibility layer，並在 controller 標註遷移 TODO；新增 `docs/api-migration-plan.md`。
- **Phase 6-4**：`/admin/learning-journey` 升級為正式總覽視圖（KPI、分布、風險區塊）。
- **Phase 6-5**：新增 `GET /api/v3/learning-journey/semesters/:semesterId/risk-students`。
- **Phase 6-6**：新增 `docs/data-source-of-truth.md`，明確 `exam_attempts` 為 canonical、`et_*` 為 legacy/deprecated。
- **Phase 6-7**：新增 learning-journey latency log、v3/legacy 使用比例與 fallback 次數觀測 log。
- **Phase 6-8**：上線前硬化與防呆：
  - 啟動時檢查 canonical tables 缺失（不 crash production）
  - 新增 `data-freshness` API 與 Hub 可視化
  - Learning Journey 總覽在 stale/fallback/dataQuality warning 時顯示防誤判提示
  - 文件補齊預設 v3 後檢查與判讀規則
- **Phase 6-9**：營運化（Operationalization）：
  - Hub 新增 Operation Mode（隱藏技術細節）與 Advanced Mode（工程/管理）
  - RBAC：`sync` 限 super_admin；`reconciliation/compare/read-model-status/data-freshness/readiness` 限 admin+
  - 防誤操作：sync 前確認提示；stale 時 KPI 區塊紅色警示
  - 新增行政操作手冊：`docs/learning-journey-operation-manual.md`
  - 新增輕量 audit log：記錄 sync 操作者、學期、dryRun 與 sections（console）
- **Phase 6-10**：正式上線準備與交接包：
  - Go-live checklist：`docs/learning-journey-go-live-checklist.md`
  - Admin handoff：`docs/learning-journey-admin-handoff.md`
  - Technical handoff：`docs/learning-journey-technical-handoff.md`
  - Post-launch monitoring：上線後 1 週 fallback/latency/data freshness/KPI 觀測清單

---

## F. 修訂紀錄

| 日期 | 說明 |
|------|------|
| 2026-04-24 | 初版：配合 Phase 5-7 reconciliation API 與對帳 UI |
| 2026-04-24 | Phase 5-8：syncService、POST `/admin/sync`、CLI、Hub 同步工具與本節文件 |
| 2026-04-24 | Phase 5-9：v3 english-test-summary、compare、feature flag、Hub 比較區與 §H 文件 |
| 2026-04-24 | Phase 5-10：admin summary 依 flag 試讀 v3、fallback／drift warnings、儀表板 badge（§H.6） |
| 2026-04-24 | Phase 5-11：v3 students 與 compare、admin students flag 預留、Hub 對照（§H.7） |
| 2026-04-24 | Phase 5-12：v3／compare 學生詳情、admin detail flag 預留、Hub 詳情對照（§H.8） |
| 2026-04-24 | Phase 5-13：readiness gate API、Hub「切換準備度」、門檻與 rollback 說明（§H.9） |
| 2026-04-24 | Phase 5-14：UAT 操作手冊、readiness CLI、spot check 與不可直接正式切換規範（§H.10） |
| 2026-04-24 | Phase 5-15：read-model-status API、Hub 狀態顯示、V2 students/detail 來源提示、觀測紀錄模板（§H.11） |
| 2026-04-24 | Phase 6（6-1~6-7）第一版：預設讀 Learning Journey read model、deprecated 標記、risk API、總覽升級、觀測 log、資料來源文件（§I） |
| 2026-04-27 | Phase 6-8：啟動 canonical table 檢查、data-freshness API/Hub、Learning Journey 防誤判提示、文件更新（§I） |
| 2026-04-27 | Phase 6-9：Operation/Advanced 模式、RBAC 限制、防誤操作提示、行政操作手冊、sync audit log（§I） |
| 2026-04-27 | Phase 6-10：go-live checklist、admin handoff、technical handoff、post-launch monitoring（§I） |
