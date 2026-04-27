# Learning Journey P6 Canonical Data Plan

本文件依 `docs/data-source-of-truth.md` 將 EEARS 收斂為 canonical-first 平台。P6 不直接切斷 fallback，而是要求 fallback 可觀測、可驗收、可逐步關閉。

## 1. Canonical-first 原則

| 資料領域 | Canonical / 權威口徑 | 說明 |
|---|---|---|
| 學生主檔 | `students` | Learning Journey 學生主檔；`Users` 只保留預約聯絡/登入情境。 |
| 學期學生狀態 | `student_semester_profiles` | Learning Journey roster/profile projection；可由 `et_enrollment_snapshots` 同步或重建。 |
| 活動參與 | `activity_participations` | Learning Journey canonical/read model；`events` + `reservations` 仍是活動營運權威。 |
| BESTEP 報名 | `english_test_registrations` → `exam_registrations` | 前者是營運權威，後者是 Learning Journey projection。 |
| BESTEP 成績 | `bestep_exam_scores` → `exam_attempts` / `exam_attempt_skill_scores` | 前者是匯入原始來源，後者是 canonical projection。 |
| BESTEP 出席 | `bestep_attendance` | 目前仍是出缺席來源，可同步/投影至 Learning Journey timeline。 |
| 其他英檢 | `exam_attempts` / `exam_attempt_skill_scores` | `source_type = EXTERNAL` 或 `MANUAL`。 |
| 修課 | `courses` / `course_enrollments` / `course_outcome_mappings` | 不得以 `classes` / `class_memberships` 取代。 |
| 問卷 | `surveys` / `survey_rules` / `survey_responses` / `survey_response_answers` | `surveys.json` 與 legacy response 只保留 fallback/migration。 |

## 2. 現有 fallback 條件

| API / Service | Canonical source | Legacy fallback | fallback 條件 | 是否可移除 | 移除前驗收 |
|---|---|---|---|---|---|
| `getAggregatedStudentReadModel` profile/timeline | `students`、`student_semester_profiles`、`exam_attempts`、`activity_participations`、`course_enrollments` | `et_student_master`、`et_enrollment_snapshots`、`et_exam_attempts`、`et_semester_student_best_skills`、`reservations` | canonical 缺列但 legacy/operational source 有資料 | 暫不可 | 學生頁抽查、report 一致、fallbackUsage=0 |
| `GET /students/:studentId/report` | 同 profile | 同 profile | report 由 aggregate profile 產生 | 暫不可 | JSON/HTML 與 profile 一致，fallback meta 可觀測 |
| `GET /semesters/:semesterId/dashboard` | 目標應為 `student_semester_profiles` 與 canonical attempts | 目前聚合 dashboard 仍讀 `et_enrollment_snapshots`、BESTEP raw、best skill cache | P4 dashboard 為過渡摘要 | 可分階段 | canonical dashboard 與 legacy compare 通過 |
| English test V3 summary | `student_semester_profiles`、`exam_attempts`、skill scores | compare API 才讀 legacy report | V3 查詢錯誤/資料空會產生 warning，不直接 fallback | 可保留 compare | compare diff 可接受 |
| English test V3 students/detail | `students`、`student_semester_profiles`、`exam_attempts`、`exam_registrations`、`activity_participations` | `EtEnrollmentSnapshot` 補年級/系所；compare API 讀 legacy | canonical roster/profile 不完整 | 暫不可 | 新學期 profiles 完整，名冊/成績對帳通過 |
| Survey gating `checkSurvey` | `surveys`、`survey_rules`、`survey_responses` | `SurveySettings`、legacy ET/EC survey response | product survey/rule 缺資料，或為避免舊填答被判未填 | 暫不可 | legacy responses migration 完成，gating UAT 通過 |
| Survey public package | `Survey` / published version | `surveys.json` | DB survey/version 缺資料 | 可分階段 | 問卷中心所有正式問卷皆有 published package |
| Governance overview | freshness/reconciliation/import governance | classOverview 仍用 `et_enrollment_snapshots` | canonical class overview 未完全改寫 | 暫不可 | class overview 改 canonical 並通過 UAT |

## 3. 單一來源化分階段

### Stage 1：Canonical first + fallback observable

- 保留 fallback。
- 所有 fallback 必須寫 warning/log/metric。
- API response `meta.fallbackUsed`、`meta.fallbackSources`、`meta.canonicalCoverage` 必須可判讀。
- Governance overview 顯示 `fallbackUsage`、`canonicalCoverage`、`canonicalMissingSections`。
- Legacy write API 需加 deprecation headers 與 `legacy_write` log。

### Stage 2：Canonical required for new semesters

- 新學期資料必須走 canonical projection。
- Legacy `et_*` 只允許歷史學期查詢與 archive/audit。
- 新匯入流程不得以 legacy `et_*` 作為主資料。
- Survey 新問卷不得只存在 `surveys.json` 或 `SurveySettings`。
- `student_semester_profiles`、`exam_registrations`、`exam_attempts`、`activity_participations` 的 freshness 不可為 `unknown`。

### Stage 3：Canonical only

- dashboard/profile/timeline/report 不再依賴 legacy fallback。
- Legacy API 改 read-only、archive 查詢或回 410。
- 只保留必要 audit/archive 資料查詢。
- Governance overview 的 fallback usage 應長期維持 0；若大於 0，視為事故或歷史查詢例外。

## 4. P6 最小實作

P6 第一版已採以下最小可行方式：

- `learningJourneyFallbackLogger.js` 分析 aggregate read model 的 canonical coverage。
- profile/timeline/report response meta 可顯示 fallback 狀態。
- fallback usage 先寫入 `system_logs`（type=`lj_fallback`）並保留 process memory 摘要。
- governance overview 顯示 fallback usage 與 canonical coverage。
- 不新增 canonical 資料表、不刪 legacy table、不關 legacy route。
