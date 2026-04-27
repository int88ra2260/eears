# Learning Journey P7 Job Runs + 自動化治理落地

P7 將 P6 的自動化設計落地為 `job_runs`、同 job + semester lock、recent jobs API、手動觸發 API 與 Windows Task Scheduler 註冊腳本。

## 1. DB 與鎖定策略

新增 table：`job_runs`

欄位：

- `id`
- `job_name`
- `semester_id`
- `status`：`running` / `success` / `failed` / `skipped`
- `started_at`
- `finished_at`
- `duration_ms`
- `triggered_by`：`manual` / `scheduler`
- `request_id`
- `summary_json`
- `error_message`
- `created_at`
- `updated_at`

同 job + semester lock：

- 使用 MySQL `GET_LOCK('eears:lj:<jobName>:<semesterId>', 0)`。
- 無法取得 lock 時，建立 `status=skipped` 的 `job_runs` 紀錄。
- job 結束後執行 `RELEASE_LOCK`。
- 這能避免 API 手動觸發與 Windows Task Scheduler 同時跑同一個 job/semester。

## 2. 後端 API

查詢 recent jobs：

- `GET /api/v3/learning-journey/admin/jobs/recent?semesterId=114-1&limit=20`
- 權限：admin+

手動觸發：

- `POST /api/v3/learning-journey/admin/jobs/run-daily-governance`
- `POST /api/v3/learning-journey/admin/jobs/reconcile-semester`
- 權限：super admin only
- body：`{ "semesterId": "114-1" }`

## 3. npm scripts

每日治理：

```powershell
npm run lj:daily-governance -- --semesterId=114-1
```

學期對帳：

```powershell
npm run lj:reconcile-semester -- --semesterId=114-1
```

這兩個 script 會寫入 `job_runs`，triggeredBy 為 `scheduler`。

## 4. Windows Task Scheduler

提供註冊腳本：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-learning-journey-windows-tasks.ps1 -SemesterId 114-1
```

可調整參數：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-learning-journey-windows-tasks.ps1 `
  -SemesterId 114-1 `
  -NodePath "C:\Program Files\nodejs\node.exe" `
  -DailyTime "07:30" `
  -WeeklyTime "08:00"
```

建立的工作：

- `EEARS Learning Journey Daily Governance <semesterId>`：每日執行。
- `EEARS Learning Journey Weekly Reconciliation <semesterId>`：每週一執行。

## 5. Governance Overview

`GET /api/v3/learning-journey/admin/governance-overview?semesterId=...` 現在回傳：

- `jobs.enabled`
- `jobs.recent`
- `jobs.message`

前端 `/admin/learning-journey` 管理模式的治理總覽會顯示：

- 最新 job 狀態
- recent job runs table
- job name / status / triggeredBy / duration / startedAt / requestId

## 6. 驗收重點

- 同一 job + semester 併發觸發時，只有一個 running，其餘為 `skipped`。
- Super admin 才能手動觸發。
- Admin+ 可查 recent jobs。
- Scheduler 與 API 共用同一套 job service。
- Governance Overview 顯示真實 `job_runs`，不再顯示假資料。
