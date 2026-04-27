# Data Source of Truth

本文件固定 EEARS 從「活動預約系統」收斂為「學生學習歷程追蹤平台」時，各資料來源的權威表、read model 產生方式與 legacy 策略。後續新增 API、匯入流程與前端頁面應以本文件為準。

## P0：活動預約與取消截止規則

- **產品規則**：活動開始前 **2 小時**截止預約與學生自助取消。
- **後端權威驗證**：
  - 預約時間窗：`reservation-backend/utils/reservationTime.js` 的 `RESERVATION_CUTOFF_HOURS = 2`
  - 自助取消時間窗：`reservation-backend/services/reservationService.js`
- **前端顯示與互動**：
  - 活動可預約時間：`reservation-frontend/src/utils/reservationTime.js`
  - 我的預約可取消判斷：`reservation-frontend/src/hooks/useReservationLookup.js`
  - 文案：`reservation-frontend/src/constants/translations.js`
- **治理要求**：不得在任一頁面、service 或 controller 另行硬編不同截止時間。若未來政策異動，需同時更新前後端常數、測試與本文。

## P1：權威資料表定義

| 資料領域 | 權威寫入來源 | 權威讀取 / 聚合來源 | legacy / derived 策略 | 備註 |
|----------|--------------|---------------------|------------------------|------|
| 學生主檔 | `students` | `students` | `Users` 僅為活動預約/黑名單流程的學生聯絡資料，不作為 Learning Journey 學生主檔 | 關聯鍵為 `students.student_id` 與 canonical 表的 `student_pk` |
| 學期學生狀態 | `student_semester_profiles` | `student_semester_profiles` | 可由 `et_enrollment_snapshots` 同步/重建 | `best_snapshot_json`、`latest_snapshot_json` 是可重建快取 |
| 活動紀錄 | `events` + `reservations` | `activity_participations` 作為 Learning Journey canonical 活動參與 read model | `reservations` 仍為預約、簽到、取消、違規營運主流程；同步到 `activity_participations` 後供 Learning Journey 讀取 | `activity_participations.event_id` 目前為字串，需與 `events.id` 對齊策略保持明確 |
| BESTEP 報名 | `english_test_registrations` | `exam_registrations` 作為 Learning Journey 報名投影 | `english_test_registrations` 短中期仍是營運權威；`exam_registrations` 由 sync 產生，不直接取代審核流程 | 報名狀態、檔案與審核仍看原表 |
| BESTEP 出席 | `bestep_attendance` | Learning Journey timeline 可讀 `bestep_attendance` 或同步後的活動/考試事件 | 保留為 BESTEP 匯入來源 | 目前主要進 aggregate timeline，尚未完全 canonical 化 |
| BESTEP 成績 | `bestep_exam_scores` | `exam_attempts` + `exam_attempt_skill_scores`（`source_type = BESTEP`） | `bestep_exam_scores` 仍為匯入原始來源；canonical attempt 由 sync/migration 產生 | 不可手動修改 canonical attempt 取代來源修正流程 |
| 其他英檢 | `exam_attempts` + `exam_attempt_skill_scores`（`source_type = EXTERNAL` 或 `MANUAL`） | 同左 | `et_exam_attempts` 可暫作 legacy 匯入來源；正式新功能不應新增對 `et_*` 的寫入依賴 | TOEIC/IELTS/TOEFL/GEPT 原始分數對 CEFR 的 mapping 尚需另案補齊 |
| 英檢長期追蹤 legacy | `et_enrollment_snapshots`、`et_exam_attempts`、`et_exam_attempt_skill_scores`、`et_semester_student_best_skills` | 只供 fallback、對帳、歷史稽核與過渡 dashboard | 不刪表、不 destructive migration；逐步轉為唯讀 | `/api/english-tests/*` 與 legacy UI 標記為待淘汰 |
| 修課紀錄 | `courses`、`course_enrollments`、`course_outcome_mappings` | Learning Journey timeline/profile/report | `classes` / `class_memberships` 只保留班級名冊/管理視角，不作為修課紀錄權威 | `course_enrollments` 已接入 Learning Journey `course_record` timeline |
| 問卷填答 | `survey_responses` / `survey_response_answers`（產品化問卷） | 問卷統計與 gating 優先讀 DB product tables | `surveys.json` 與 legacy `english_table_survey` / `english_club_survey_responses` 保留 fallback/遷移用途 | 新問卷不得以 JSON 檔作為唯一來源 |

## Learning Journey read model 如何產生

Learning Journey 不是單一來源表，而是由 canonical / legacy / derived 多來源同步與聚合產生：

1. `students` 建立學生主檔。
2. `et_enrollment_snapshots` 或未來正式學籍來源同步至 `student_semester_profiles`。
3. `english_test_registrations` 同步至 `exam_registrations`。
4. `bestep_exam_scores`、其他英檢匯入與 legacy `et_exam_attempts` 逐步同步至 `exam_attempts` / `exam_attempt_skill_scores`。
5. `events` + `reservations` 同步至 `activity_participations`，但營運簽到與違規仍以原表為權威。
6. P2 完成後，`course_enrollments` 同步/直讀進 Learning Journey timeline。
7. `aggregateReadModelService` 可讀多來源拼出目前畫面所需資料；正式產品頁應逐步改以 canonical 表為主，legacy 僅 fallback。

## Derived（衍生 / 快取）

- `student_semester_profiles.best_snapshot_json`
- `student_semester_profiles.latest_snapshot_json`
- `et_semester_student_best_skills`
- dashboard KPI 快照、data quality flags、匯入歷程 summary

Derived 資料可重建，不作為唯一真實來源。若 derived 與來源表不一致，先以來源表與 sync/reconciliation 結果判讀。

## Legacy tables 策略

| 類別 | 表 / API | 目前策略 | 目標策略 |
|------|----------|----------|----------|
| 英檢 legacy tracking | `et_*`、`/api/english-tests/*`、`/admin/english-test-tracking/legacy` | 已標記 deprecated，保留 fallback 與維運查詢 | 完成 sync、reconciliation、UAT 後改唯讀，再規劃下線 API/UI |
| 問卷 legacy | `english_table_survey`、`english_club_survey_responses`、`SurveySettings`、`surveys.json`、舊 `/api/surveys/*` 相容路徑 | 已標記 deprecated，保留 fallback 與舊資料查詢 | 新填答與新規則以 DB product tables 為主，legacy 轉唯讀 |
| 活動預約舊 API | `DELETE /api/reservations/:id` | 已回 410 | 保留 410 一段時間後移除 |
| 黑名單舊流程 | `blacklistRouter` 的獨立違規 API | 與 `eventRouter` 違規流程重疊 | 確認前端與營運依賴後收斂至活動違規主流程 |

## Data Freshness 判讀

`GET /api/v3/learning-journey/admin/data-freshness?semesterId=...` 會回傳 canonical section 的 `recordCount`、`lastUpdatedAt`、`status`：

- `fresh`：有資料且更新時間在門檻內（預設 48 小時）
- `stale`：有資料但更新時間超過門檻，建議先 sync/reconciliation
- `empty`：目前無資料列，通常代表尚未同步
- `unknown`：查詢或時間格式無法判讀

`stale` / `empty` 不代表資料錯誤，但也不應直接視為資料正確；應先執行同步與對帳。

## P5：Legacy 收斂與上線前清理

詳細 deprecated 清單以 `docs/legacy-route-api-deprecation.md` 為準；正式 go/no-go 使用 `docs/learning-journey-p5-prelaunch-checklist.md`。

P5 後的入口原則：

- `/admin/learning-journey` 是英語學習歷程與每日治理主入口。
- `/admin/english-test-tracking` 僅保留 V2 維運與過渡查詢。
- `/admin/english-test-tracking/legacy`、`/admin/english-test-v2`、`/admin/surveys`、`/admin/survey-settings` 不作側欄正式入口。
- Legacy API 回應應帶 deprecation headers，供前端、整合端與 log 追蹤。

## P6：Canonical-first 與 fallback observability

P6 詳細文件：

- Legacy 下線分級：`docs/learning-journey-p6-legacy-sunset-plan.md`
- Canonical data plan：`docs/learning-journey-p6-canonical-data-plan.md`
- 自動化架構：`docs/learning-journey-p6-automation-architecture.md`
- UAT checklist：`docs/learning-journey-p6-uat-checklist.md`

P6 後的治理要求：

- Learning Journey profile/timeline/report 若使用 legacy fallback，API meta 必須標示 `fallbackUsed`、`fallbackSources`、`canonicalCoverage`。
- Governance overview 必須可顯示 `canonicalCoverage`、`fallbackUsage`、`legacyApiUsageWarning` 與 job runs 啟用狀態。
- Legacy write API 必須帶 deprecation headers，並以 `system_logs` type=`legacy_write` 留痕。
- `job_runs` 未正式建立前，前端只能顯示「尚未啟用自動化任務紀錄」，不得顯示假 job history。

## P8：Canonical Required for New Semesters

新學期 canonical-required 門檻由環境變數控制：

- `LEARNING_JOURNEY_CANONICAL_REQUIRED_FROM_SEMESTER`，預設 `115-1`

達門檻的學期：

- legacy 英檢寫入 API 不得再新增 `et_*` 主資料。
- BESTEP 報名、成績、出席仍以營運權威/原始來源寫入，再同步或投影至 canonical tables。
- Governance Overview 必須顯示 `canonicalReady`，包含 `canonicalRequired`、`canonicalReady`、`blockingReasons`。
- 驗收清單：`docs/learning-journey-p8-canonical-readiness-checklist.md`

## P9：Legacy Read-only / 410 Sunset

P9 後的 sunset 原則：

- 已確認低風險且有替代 API 的 legacy route 可改 `410 Gone`。
- 仍需歷史查詢的 route 改 read-only deprecated，不新增寫入依賴。
- Deprecated 前端 route 顯示封存頁或 redirect，不再載入舊 UI。
- Usage audit report：`GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30`
- 最終移除前 UAT：`docs/learning-journey-p9-legacy-final-removal-uat-checklist.md`

## P10：正式上線驗收與文件定版

P10 交付文件：

- 正式上線驗收報告：`docs/learning-journey-p10-production-launch-report.md`
- 管理者操作手冊：`docs/learning-journey-admin-operations-manual.md`
- 資料匯入 SOP：`docs/learning-journey-data-import-sop.md`
- Legacy usage audit 與下一批 410 決策：`docs/learning-journey-p10-legacy-audit-410-decision.md`

P10 後正式上線治理原則：

- P0-P9 UAT checklist 需以正式上線報告整併簽核，不以文件存在視為 UAT 通過。
- 匯入 SOP 必須遵守本文件的權威來源，不得讓新學期資料回到 legacy `et_*` 主寫入流程。
- Legacy usage audit 需連續觀察，確認無高風險 `legacy_write`、`legacy_write_blocked`、`legacy_gone` 或新學期 `lj_fallback` 後，才能將下一批候選 API/UI 轉 `410 Gone` 或移除。
- 下一批 410 不得包含 BESTEP 營運權威與原始來源表。

## 禁止事項

- 不可在未完成備份、對帳與 UAT 前刪除 `et_*`、legacy survey 或報名原始資料。
- 不可把 `exam_attempts` 單表宣告為全系統唯一英檢來源，除非 BESTEP、其他英檢與 legacy 追蹤皆完成同步與驗收。
- 不可用 `classes` / `class_memberships` 取代正式修課紀錄；正式修課紀錄以 `courses`、`course_enrollments`、`course_outcome_mappings` 為準。
- 不可讓前端自行推導 Learning Journey KPI 作為權威統計；正式統計須由後端 canonical/read model API 提供。
