# Learning Journey P6 Automation Architecture

本文件定義 sync / reconciliation / freshness check 的自動化架構。P6 第一版先完成可落地設計；P7 已落地 `job_runs`、DB named lock、recent jobs API 與 Windows Task Scheduler 註冊腳本，詳見 `docs/learning-journey-p7-job-runs-automation.md`。

## 1. 自動化任務清單

### 每日任務

- Data freshness check：呼叫 `GET /api/v3/learning-journey/admin/data-freshness?semesterId=...` 或同 service。
- Reconciliation summary：執行 `getSemesterReconciliation(semesterId)`。
- Fallback usage summary：彙整 `learningJourneyFallbackLogger` / `system_logs` type=`lj_fallback`。
- Quarantine summary：檢查 `migration_quarantines`。
- Course import summary：檢查 `course_enrollments` 筆數與最近更新。
- BESTEP / external exam sync status check：檢查 `exam_attempts` 與 `bestep_exam_scores` / legacy source 對帳。

### 匯入後任務

- Course import apply 後觸發 profile/timeline freshness 更新或 invalidation。
- BESTEP 成績匯入後觸發 `bestep_exam_scores` → `exam_attempts` sync。
- `english_test_registrations` 狀態更新後觸發 `exam_registrations` sync。
- 活動簽到/違規後觸發 `activity_participations` sync 或 cache invalidation。
- Survey publish/rule 更新後觸發 gating diagnostics。

### 每週任務

- Legacy fallback report。
- Canonical coverage report。
- Stale data report。
- High risk students snapshot。
- Future 410 candidate usage report。

## 2. Job 架構建議

目前部署環境偏 Windows Server/IIS/Node，短期建議採「npm script + Windows Task Scheduler」。

短期：

- `npm run lj:daily-governance -- --semesterId=114-1`
- `npm run lj:reconcile-semester -- --semesterId=114-1`
- `scripts/learning-journey-daily-governance.js`（已建立）
- `scripts/learning-journey-reconcile-semester.js`（已建立）
- 由 Windows Task Scheduler 排程呼叫，stdout/stderr 導入檔案或系統 log。

中期：

- 新增 `job_runs` table。
- 後台 API 顯示 job run history。
- 手動執行 API 加 lock，避免同學期重複跑。

長期：

- BullMQ / Redis queue。
- retry、timeout、dead letter queue。
- alerting：Email/Slack/Teams 或系統通知。
- job dependency graph：匯入後自動排 reconciliation/freshness。

## 3. Job Run 記錄設計

建議 table：`job_runs`

| 欄位 | 說明 |
|---|---|
| `id` | PK |
| `jobName` | 任務名稱，例如 `learning_journey_daily_governance` |
| `semesterId` | 學期 |
| `status` | `running` / `success` / `failed` / `skipped` |
| `startedAt` | 開始時間 |
| `finishedAt` | 結束時間 |
| `durationMs` | 執行毫秒 |
| `triggeredBy` | `scheduler` / `manual` / `import_hook` |
| `requestId` | 手動 API 或 script trace id |
| `summaryJson` | KPI、warnings、counts |
| `errorMessage` | 失敗訊息 |
| `createdAt` / `updatedAt` | timestamps |

P6 第一版新增 script skeleton 與 npm scripts；P7 已新增 `job_runs` migration/model 與 lock-aware job service。

P7 鎖定策略：

- 使用 MySQL `GET_LOCK` 鎖定同一 `jobName + semesterId`。
- 無法取得 lock 時建立 `skipped` job run。
- API 與 scheduler 共用同一套 service，避免兩邊行為不一致。

## 4. 管理 API 建議

中期 API：

- `GET /api/v3/learning-journey/admin/jobs/recent?semesterId=114-1`
- `POST /api/v3/learning-journey/admin/jobs/run-daily-governance`
- `POST /api/v3/learning-journey/admin/jobs/reconcile-semester`

權限：

- 查詢：admin+
- 手動執行：super admin only

風險：

- 沒有 lock 時，手動執行可能與排程同時跑。
- 沒有 retry/timeout 時，失敗可能只留在 log。
- 沒有 job_runs 前，不應在 UI 假裝已有完整任務紀錄。

## 5. Script Skeleton

短期 script 應做：

1. 解析 `--semesterId`。
2. 建立 requestId。
3. 呼叫 governance overview service。
4. 將結果寫 stdout 與 `system_logs`。
5. 非 `ok` 時 exit code 可配置為 0 或 1；正式排程前需先定義告警政策。

## 6. 回滾策略

- 自動任務只做 read/check 或既有 sync service，不直接刪資料。
- 任一 job 失敗，不自動切換 feature flag。
- 若 sync 造成 canonical 異常，治理總覽應顯示 freshness/reconciliation warning，維運可回到 legacy V2/legacy UI 查詢。
