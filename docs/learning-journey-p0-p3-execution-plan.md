# Learning Journey P0-P3 Execution Plan

本文件把目前優先順序整理成可執行工程任務。資料來源準則以 `docs/data-source-of-truth.md` 為主。

## P0：活動開始前 2 小時截止預約與取消

狀態：已確認並固定。

- 後端預約時間窗使用 `reservation-backend/utils/reservationTime.js` 的 `RESERVATION_CUTOFF_HOURS = 2`。
- 後端學生自助取消使用 `reservation-backend/services/reservationService.js`，同樣引用 `RESERVATION_CUTOFF_HOURS`。
- 前端活動時間窗使用 `reservation-frontend/src/utils/reservationTime.js` 的 `RESERVATION_CUTOFF_HOURS = 2`。
- 前端「我的預約」可取消判斷使用 `reservation-frontend/src/hooks/useReservationLookup.js`，同樣引用 `RESERVATION_CUTOFF_HOURS`。
- 既有測試 `reservation-backend/tests/reservationDeleteAuth.test.js` 已涵蓋「活動前 2 小時內取消會失敗」。

驗收條件：

- 活動開始前超過 2 小時：可預約（若其他條件也通過）且可自助取消。
- 活動開始前 2 小時內：不可新預約，學生不可自助取消。
- 管理員後台刪除/調整不受學生自助取消時間窗限制，但需保留 audit / notification。

## P1：資料來源治理文件

狀態：已建立於 `docs/data-source-of-truth.md`。

驗收條件：

- 文件明確列出活動紀錄、BESTEP 報名、BESTEP 成績、其他英檢、修課紀錄、問卷資料的權威表。
- 文件明確說明 Learning Journey read model 如何由 canonical、sync、aggregate service 產生。
- 文件明確標示 `et_*`、legacy survey、舊活動 API 的唯讀/同步/淘汰策略。
- 後續 migration、API 與前端頁面 PR 必須引用此文件作為資料口徑依據。

## P2：補修課資料層

目標：建立正式修課紀錄資料層，避免以班級名冊或活動資料替代修課資料。

建議拆分：

1. DB models / migrations
   - `courses`
   - `course_enrollments`
   - `course_outcome_mappings`

2. Sequelize associations
   - `Student.hasMany(CourseEnrollment)`
   - `Course.hasMany(CourseEnrollment)`
   - `Course.hasMany(CourseOutcomeMapping)`

3. 匯入流程
   - 新增 course roster import service。
   - 支援 dry run、apply、錯誤列回報、重跑不重複。
   - 匯入欄位至少包含學期、課號、課名、開課單位、授課教師、學號、修課狀態、成績/通過狀態（若資料來源提供）。

4. API
   - `GET /api/v3/learning-journey/students/:studentId/courses`
   - `POST /api/v3/learning-journey/admin/course-import/dry-run`
   - `POST /api/v3/learning-journey/admin/course-import/apply`

5. Learning Journey timeline
   - `aggregateReadModelService` 新增 `course_record` timeline item。
   - timeline item 至少包含 `semesterId`、`courseCode`、`courseName`、`department`、`status`、`outcomes`。

驗收條件：

- 同一學生同一學期同一課程重複匯入不產生重複 enrollment。
- 學生查詢 API 可回傳跨學期修課紀錄。
- Learning Journey read model 的 `dataQuality` 不再出現「修課紀錄尚未接入 timeline」作為常態訊息。

目前已完成：

- `courses`、`course_enrollments`、`course_outcome_mappings` schema / models / associations。
- `POST /api/v3/learning-journey/admin/course-import/dry-run`，支援 Excel `file` 或 JSON `rows`。
- `POST /api/v3/learning-journey/admin/course-import/apply`，通過 dry run 驗證後以 transaction 寫入/更新課程、修課與 outcomes。
- `GET /api/v3/learning-journey/students/:studentId/courses`，可用 query `semesterId` 篩選。
- `aggregateReadModelService` 已將 `course_enrollments` 接入學生 profile / timeline，timeline type 為 `course_record`。
- 前端 Learning Journey Hub 已提供修課 dry run/apply 匯入區塊，學生 timeline UI 已顯示修課紀錄。

## P3：正式學生學習歷程頁

目前已完成第一版正式頁：

- Route：`/admin/learning-journey/students/:studentId`
- Frontend：`reservation-frontend/src/pages/admin/LearningJourneyStudentPage.jsx`
- 資料來源：`GET /api/v3/learning-journey/students/:studentId/profile`
- 已整合：
  - 基本資料
  - 活動參與
  - BESTEP 報名與成績 / 出席事件
  - 其他英檢
  - 修課紀錄
  - timeline
  - 風險提示
  - data quality
  - 匯出入口（列印 / 另存 PDF、下載 JSON 報告）
- Hub 入口：`LearningJourneyHubPage` 的學生基本資料卡片可開啟正式頁。

## P3-B：正式驗收與補強

目前已完成：

- UAT checklist：`docs/learning-journey-p3b-uat-checklist.md`
- Frontend lint：新增 `reservation-frontend/.eslintignore` 排除 `build/`、`node_modules/`、`coverage/`，避免 build artifact 被 `eslint .` 掃描。
- 後端報告 API：
  - `GET /api/v3/learning-journey/students/:studentId/report?format=json`
  - `GET /api/v3/learning-journey/students/:studentId/report?format=html`
  - `format=pdf` 目前回傳可列印 HTML，供瀏覽器另存 PDF。
- 後端一致性檢查 API：
  - `GET /api/v3/learning-journey/students/:studentId/consistency`
- 前端正式學生頁已接入：
  - 後端 JSON report 下載
  - 後端 HTML report 開啟
  - 跨來源一致性檢查區塊
  - 若後端 JSON report 暫時失敗，才退回同一頁面所用 profile 產生 JSON。

## P4：Learning Journey 儀表板與治理上線準備

目前已完成第一版：

- 後端治理摘要 API：
  - `GET /api/v3/learning-journey/admin/governance-overview?semesterId=114-1`
  - 彙整 dashboard、系級/年級總覽、風險學生、data freshness、reconciliation、匯入批次、quarantine、ET import history、course import 摘要。
- Data freshness 已納入 `course_enrollments`。
- 前端 Hub 新增「P4 上線治理總覽」區塊。
- 正式上線 UAT 報告：
  - `docs/learning-journey-p4-launch-uat-report.md`
- 上線操作文件：
  - `docs/learning-journey-p4-operations-guide.md`

## P5：Legacy 收斂與正式上線前清理

目前已完成第一版：

- 前端導覽已將 `/admin/learning-journey` 標示為每日維運主入口。
- `/admin/english-test-v2`、`/admin/surveys`、`/admin/survey-settings` 已從側欄隱藏但保留直接 route fallback。
- `/admin/english-test-tracking` 保留為「V2 維運」，legacy tracking 頁只供 fallback。
- `/api/english-tests/*` 與舊 `/api/surveys/*` 相容路徑已加 deprecation headers。
- Deprecated route/API 文件：
  - `docs/legacy-route-api-deprecation.md`
- 正式上線前檢查清單：
  - `docs/learning-journey-p5-prelaunch-checklist.md`

## P6：Legacy 下線策略、Data 單一來源化與自動化治理

目前已完成第一版：

- Legacy inventory 與下線分級：
  - `docs/learning-journey-p6-legacy-sunset-plan.md`
- Canonical-first data plan：
  - `docs/learning-journey-p6-canonical-data-plan.md`
- 自動化 sync / reconciliation / freshness 架構：
  - `docs/learning-journey-p6-automation-architecture.md`
- P6 UAT checklist：
  - `docs/learning-journey-p6-uat-checklist.md`
- 後端最小 fallback observability：
  - `reservation-backend/services/learningJourney/learningJourneyFallbackLogger.js`
  - profile/timeline/report meta 補 `fallbackUsed`、`fallbackSources`、`canonicalCoverage`
  - governance overview 補 `canonicalCoverage`、`fallbackUsage`、`legacyApiUsageWarning`、`jobs`
- Legacy API header 補強：
  - `reservation-backend/middlewares/legacyDeprecation.js`
  - `/api/english-tests/*`
  - `/api/admin/english-tests/*`
  - legacy `/api/surveys/*` 相容路徑

## P7：Job Runs + 自動化治理落地

目前已完成第一版：

- `job_runs` migration / model。
- 同 job + semester DB named lock，避免重複執行。
- Recent jobs API：
  - `GET /api/v3/learning-journey/admin/jobs/recent?semesterId=114-1`
- Super admin 手動觸發 API：
  - `POST /api/v3/learning-journey/admin/jobs/run-daily-governance`
  - `POST /api/v3/learning-journey/admin/jobs/reconcile-semester`
- npm scripts 會寫入 `job_runs`：
  - `npm run lj:daily-governance -- --semesterId=114-1`
  - `npm run lj:reconcile-semester -- --semesterId=114-1`
- Windows Task Scheduler 註冊腳本：
  - `reservation-backend/scripts/register-learning-journey-windows-tasks.ps1`
- Governance Overview 已顯示真實 job history。
- 文件：
  - `docs/learning-journey-p7-job-runs-automation.md`

## P8：Canonical Required for New Semesters

目前已完成第一版：

- 新增 canonical-required policy：
  - `reservation-backend/services/learningJourney/canonicalSemesterPolicyService.js`
  - 環境變數：`LEARNING_JOURNEY_CANONICAL_REQUIRED_FROM_SEMESTER`，預設 `115-1`
- Legacy 英檢寫入在 canonical-required 學期會回 `409`：
  - `/api/english-tests/*`
  - `/api/admin/english-tests/*`
- Legacy write blocked 會寫入 `system_logs` type=`legacy_write_blocked`。
- Governance Overview 新增 `canonicalReady`：
  - `canonicalRequired`
  - `canonicalReady`
  - `blockingReasons`
  - `requiredFromSemester`
- Frontend governance overview 顯示 canonical required / ready 狀態。
- Canonical readiness checklist：
  - `docs/learning-journey-p8-canonical-readiness-checklist.md`

## P9：Legacy Read-only / 410 Sunset 實作

目前已完成第一版：

- `legacyDeprecationHeaders` 支援 `gone` 模式，已 sunset API 會回 `410 Gone` 並寫入 `system_logs` type=`legacy_gone`。
- `/api/surveys/config` 已改為 `410 Gone`，替代 API 為 `/api/surveys/public/:surveyKey`。
- Legacy usage audit report：
  - `GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30`
- 前端封存頁：
  - `/admin/english-test-tracking/legacy`
  - `/admin/surveys`
  - `/admin/survey-settings`
- `/admin/english-test-v2` redirect 至 `/admin/learning-journey`。
- 更新 `docs/legacy-route-api-deprecation.md` sunset 日期、替代 API 與 future removal order。
- 最終移除前 UAT checklist：
  - `docs/learning-journey-p9-legacy-final-removal-uat-checklist.md`

## P10：正式上線驗收與文件定版

目前已完成文件定版第一版：

- 正式上線驗收報告：
  - `docs/learning-journey-p10-production-launch-report.md`
- 管理者操作手冊：
  - `docs/learning-journey-admin-operations-manual.md`
- 資料匯入 SOP：
  - `docs/learning-journey-data-import-sop.md`
- Legacy usage audit 與下一批 410 決策：
  - `docs/learning-journey-p10-legacy-audit-410-decision.md`

P10 原則：

- P0-P9 UAT checklist 需整併於正式上線報告中執行與簽核。
- 需要正式資料庫、瀏覽器操作或權限帳號的項目不得以文件審閱取代，需由實際執行人員填寫結果。
- Legacy usage audit 至少需觀察一段期間，確認無高風險使用後，才能將下一批 API/UI 改為 `410 Gone` 或移除 route。
- `english_test_registrations`、`bestep_attendance`、`bestep_exam_scores`、`events`、`reservations` 仍不可列為下線項目。

## P3：正式學生學習歷程頁

目標：建立正式學生個人 Learning Journey 頁，整合活動、英檢、修課、達標、風險與報告匯出。

建議拆分：

1. 後端 read API
   - `GET /api/v3/learning-journey/students/:studentId/profile`
   - 回傳 profile summary、timeline、attainment、risk alerts、data quality、export availability。

2. 風險提示
   - 使用既有 `learningJourneyRiskService.js` 或補齊正式 service。
   - 最低限度風險：未報名 BESTEP、未出席、未達標、活動參與不足、資料缺漏。

3. 前端頁面
   - 新增正式 route，例如 `/admin/learning-journey/students/:studentId`。
   - 區塊包含基本資料、達標狀態、timeline、BESTEP/其他英檢、修課紀錄、活動參與、風險提示、資料品質。

4. 匯出報告
   - 建議先做 PDF/HTML 或 CSV 匯出其中一種。
   - 報告內容以後端 profile API 的同一份資料為準，不由前端重新計算 KPI。

驗收條件：

- 任一學生頁面可同時看到活動參與、BESTEP 報名與成績、其他英檢、修課紀錄。
- 達標狀態與風險提示來自後端統一 API。
- 資料缺漏時頁面顯示 data quality，不以空白誤導使用者。
- 匯出報告內容與頁面資料一致。

## 建議開發順序

1. 完成 P2 schema 與 import dry run。
2. 接上 P2 student course query API。
3. 將 course records 接入 `aggregateReadModelService` timeline。
4. 實作 P3 profile API，先回傳完整 JSON。
5. 建正式學生學習歷程頁。
6. 最後補匯出與 UAT checklist。
