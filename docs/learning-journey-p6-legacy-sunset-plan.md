# Learning Journey P6 Legacy Sunset Plan

本文件建立 P6 legacy inventory 與下線分級。P6 原則是「先標記、可觀測、可回滾」，不刪表、不移除 route、不破壞仍是營運權威的來源。

## 1. Legacy 類型分類

### A. Learning Journey legacy 英檢資料

範圍包含 `/api/english-tests/*`、`/api/admin/english-tests/*`、`/admin/english-test-tracking/legacy` 與 `et_*` tables。

判斷：

- `et_exam_attempts`、`et_exam_attempt_skill_scores` 仍可能透過 legacy import 寫入，短期屬於過渡 active write source。
- `et_enrollment_snapshots` 仍被總覽/class overview 與學生聚合頁讀取，應先轉為 read-only fallback，再由 `student_semester_profiles` 完整承接。
- `et_semester_student_best_skills` 是 derived/cache，不是 source of truth，可在 canonical coverage 足夠後移除正式依賴。
- `/api/english-tests/*` 與 `/api/admin/english-tests/*` 已可加 warning/deprecation header；高風險寫入先 audit，不立即關閉。
- `/admin/english-test-tracking/legacy` 只保留故障排查、歷史比對與 rollback。

### B. BESTEP legacy / operational source

`english_test_registrations`、`bestep_attendance`、`bestep_exam_scores` 不應直接下線。

- `english_test_registrations`：BESTEP 報名、審核與檔案流程的營運權威；`exam_registrations` 是 Learning Journey projection。
- `bestep_exam_scores`：匯入原始來源；`exam_attempts` / `exam_attempt_skill_scores` 是 canonical projection。
- `bestep_attendance`：BESTEP 出缺席原始/營運來源；目前仍可直接進 timeline 或作 sync 來源。

### C. 問卷 legacy

範圍包含 `surveys.json`、`SurveySettings`、`english_table_survey`、`english_club_survey_responses`、legacy `/api/survey/*` 與 `/api/surveys/*` 相容路徑。

判斷：

- Product DB survey tables 已提供正式管理、版本、規則與作答資料，但 gating 仍保留 legacy fallback。
- `surveyGateService.hasCompletedForGate()` 目前仍會先檢查 legacy response，以避免舊學生被重複要求填答。
- legacy response 需要 migration/對帳後才能轉 read-only。
- `/api/surveys/config`、`/:surveyId`、`/check`、`/stats`、`/export` 應保留 deprecated route，不作正式新依賴。

### D. 活動/黑名單舊流程

- `DELETE /api/reservations/:id` 已回 410，可列入 future cleanup。
- `blacklistRouter` 與 `eventRouter` 違規流程重疊，需確認前端、通知、audit log 與營運 SOP 後再收斂。
- 活動預約、簽到、取消仍以 `events` + `reservations` 為營運權威；Learning Journey 使用 `activity_participations` 作 canonical/read model。

### E. 前端 legacy UI

- `/admin/english-test-v2`：側欄隱藏，App route redirect 保留。
- `/admin/surveys`、`/admin/survey-settings`：側欄隱藏，直接 route 保留。
- `/admin/english-test-tracking/legacy`：不列入側欄，僅 fallback。
- `/admin/english-test-tracking`：保留為舊書籤相容導向，不再作正式 Learning Journey 主入口。

## 2. Legacy Inventory

| Legacy 項目 | 類型 | 目前是否仍被引用 | 是否仍寫入 | 是否仍讀取 | 風險 | 建議狀態 | 下線階段 |
|---|---|---|---|---|---|---|---|
| `/api/english-tests/*` | Learning Journey legacy 英檢資料 | 是，legacy API | 是，import/recompute | 是 | 直接關閉會影響過渡匯入與 fallback | DEPRECATED_KEEP_ROUTE | Stage 1 warning header；Stage 2 read-only；Stage 3 410 |
| `/api/admin/english-tests/*` | Learning Journey 相容 admin API | 是，相容 service | 是，semester/rebuild | 是 | 新舊總覽差異需對帳 | DEPRECATED_KEEP_ROUTE | Stage 1 header/audit；Stage 2 歷史學期；Stage 3 archive |
| `/admin/english-test-tracking/legacy` | 前端 legacy UI | App route 保留 | 否 | 是 | 使用者誤當正式入口 | READ_ONLY_FALLBACK | Stage 1 隱藏；Stage 3 移除 |
| `et_semesters` | 英檢 legacy table | 是 | 可能 | 是 | 學期對照仍被 V2 使用 | READ_ONLY_FALLBACK | Stage 2 read-only |
| `et_enrollment_snapshots` | 英檢 legacy roster | 是，class overview/profile 補資料 | 可能由 import/sync 寫入 | 是 | canonical roster 未完整前不可移除 | READ_ONLY_FALLBACK | Stage 2 新學期不寫 legacy |
| `et_exam_attempts` | 英檢 legacy attempts | 是，aggregate/report fallback | 是，legacy import | 是 | 成績 canonical sync 未完成會缺資料 | READ_ONLY_FALLBACK | Stage 2 停新寫；Stage 3 archive |
| `et_exam_attempt_skill_scores` | 英檢 legacy skill scores | 是 | 是，legacy import | 是 | 同上 | READ_ONLY_FALLBACK | Stage 2 停新寫；Stage 3 archive |
| `et_semester_student_best_skills` | derived legacy cache | 是，aggregate timeline | 是，recompute | 是 | cache 與 canonical 不一致 | REMOVE_AFTER_UAT | Stage 2 停正式依賴 |
| `english_test_registrations` | BESTEP operational source | 是 | 是 | 是 | 報名審核權威，不可誤刪 | KEEP_OPERATIONAL_SOURCE | DO_NOT_REMOVE |
| `bestep_attendance` | BESTEP operational/source import | 是 | 是，匯入 | 是 | 出缺席原始來源，不可誤刪 | KEEP_OPERATIONAL_SOURCE | DO_NOT_REMOVE |
| `bestep_exam_scores` | BESTEP raw score source | 是 | 是，匯入 | 是 | canonical projection 來源，不可誤刪 | KEEP_OPERATIONAL_SOURCE | DO_NOT_REMOVE |
| `exam_registrations` | LJS projection | 是 | sync 產生 | 是 | 與報名原表需對帳 | CANONICAL_PROJECTION_ONLY | Stage 1-3 保留 |
| `exam_attempts` / `exam_attempt_skill_scores` | LJS canonical projection | 是 | sync/import | 是 | P6 後正式報表主來源 | CANONICAL_PROJECTION_ONLY | Stage 1-3 保留 |
| `surveys.json` | 問卷 legacy config | 是，json fallback | 否 | 是 | DB survey 缺資料時 fallback | READ_ONLY_FALLBACK | Stage 2 停新依賴；Stage 3 archive |
| `SurveySettings` | 問卷 legacy settings | 是，gating fallback/雙寫 | 是，legacy settings page | 是 | product rules 未完全取代前不可關 | READ_ONLY_FALLBACK | Stage 2 read-only |
| `english_table_survey` / `english_club_survey_responses` | 問卷 legacy response | 是，duplicate/gating | 是，雙寫 | 是 | 移除會讓舊填答被判未填 | READ_ONLY_FALLBACK | Stage 2 migration；Stage 3 archive |
| `/api/surveys/config` | 問卷 legacy API | 是 | 否 | 是 | 舊前端/書籤依賴 | DEPRECATED_KEEP_ROUTE | Future 410 |
| `/api/surveys/:surveyId` | 問卷 legacy submit | 是 | 是 | 否 | 舊填答入口仍可能使用 | DEPRECATED_KEEP_ROUTE | Stage 2 禁新入口；Stage 3 410 |
| `/api/surveys/check/:surveyId/:studentId` | 問卷 legacy check | 是 | 否 | 是 | gating 相容 | DEPRECATED_KEEP_ROUTE | Future 410 |
| `/api/surveys/stats/:surveyId` / `export` | 問卷 legacy admin | 是 | 否 | 是 | 舊報表對帳 | READ_ONLY_FALLBACK | Future 410 |
| `/api/survey/*` | 舊 English Table survey mount | 是，server.js 保留 | 可能 | 是 | route 命名與新 `/api/surveys` 混淆 | DEPRECATED_KEEP_ROUTE | Stage 2 盤點後 header |
| `DELETE /api/reservations/:id` | 活動舊 API | 否，已 410 | 否 | 否 | 無 | RETURN_410_LATER | 可於 UAT 後移除 |
| `blacklistRouter` 獨立流程 | 活動/黑名單舊流程 | 是 | 是 | 是 | 與 event violation 流程重疊 | DO_NOT_REMOVE | 另案收斂 |
| `/admin/english-test-v2` | 前端 legacy alias | 是，redirect | 否 | 否 | 舊書籤 | RETURN_410_LATER | UAT 後移除 route |
| `/admin/surveys` | 前端 legacy UI | 是，直接 route | 是 | 是 | 誤作正式問卷入口 | DEPRECATED_KEEP_ROUTE | Stage 2 read-only |
| `/admin/survey-settings` | 前端 legacy UI | 是，直接 route | 是 | 是 | 雙寫失敗會造成規則不一致 | DEPRECATED_KEEP_ROUTE | Stage 2 read-only |

## 3. Future 410 List

可列入 future 410，但不得立即移除：

- `/admin/english-test-v2`
- `/api/surveys/config`
- `/api/surveys/check/:surveyId/:studentId`
- `/api/surveys/stats/:surveyId`
- `/api/surveys/export/:surveyId`
- 已回 410 的 `DELETE /api/reservations/:id` 可在公告期後清理

## 4. 不可下線清單

- `english_test_registrations`
- `bestep_attendance`
- `bestep_exam_scores`
- `events` / `reservations`
- `courses` / `course_enrollments` / `course_outcome_mappings`
- `students` / `student_semester_profiles` / `exam_registrations` / `exam_attempts`

上述項目仍是營運權威、原始匯入來源或 canonical projection，不能視為可刪 legacy。
