# Learning Journey 資料匯入 SOP

本 SOP 定義 Learning Journey 正式上線後的資料匯入、同步與驗收流程。原則：營運權威先正確，canonical projection 再同步，最後以 Governance Overview 驗收。

## 1. 匯入順序

建議順序：

1. 學生/學期名冊
2. BESTEP 報名
3. BESTEP 成績
4. BESTEP 出席
5. 其他英檢
6. 活動參與 / 簽到 / 違規
7. 修課紀錄
8. 問卷資料
9. Daily governance / reconciliation

## 2. 學生與學期名冊

權威/目標：

- Learning Journey 主檔：`students`
- 學期狀態：`student_semester_profiles`
- legacy fallback：`et_enrollment_snapshots`

SOP：

1. 確認來源名冊格式。
2. 執行對應 sync/import。
3. 檢查 `student_semester_profiles` freshness。
4. 執行 reconciliation。
5. 新學期 canonical-required 後，不得以 `et_enrollment_snapshots` 作主資料。

## 3. BESTEP 報名

營運權威：

- `english_test_registrations`

Canonical projection：

- `exam_registrations`

SOP：

1. 使用既有 BESTEP 報名/審核流程。
2. 確認審核狀態與報名資料完整。
3. 執行 Learning Journey sync，將報名投影至 `exam_registrations`。
4. 檢查 reconciliation 與 student page。

注意：

- 不可把 `english_test_registrations` 視為可刪 legacy。
- canonical-required 不代表停止 BESTEP 營運報名流程。

## 4. BESTEP 成績與出席

原始來源：

- `bestep_exam_scores`
- `bestep_attendance`

Canonical projection：

- `exam_attempts`
- `exam_attempt_skill_scores`

SOP：

1. 匯入 BESTEP 成績/出席原始檔。
2. 確認匯入批次無重大錯誤。
3. 執行成績 sync/migration 至 canonical attempts。
4. 執行 `npm run lj:reconcile-semester -- --semesterId=<semester>`。
5. 抽查學生頁與 JSON/HTML report。

注意：

- `bestep_exam_scores` 是原始匯入來源，不可刪除。
- 若 canonical attempts 為空，治理總覽會顯示 coverage/freshness 缺口。

## 5. 其他英檢

Canonical：

- `exam_attempts`
- `exam_attempt_skill_scores`

SOP：

1. 以正式匯入或管理流程寫入 canonical attempts。
2. 確認 `source_type = EXTERNAL` 或 `MANUAL`。
3. 確認 CEFR / raw score mapping。
4. 抽查學生頁「其他英檢」與 timeline。

禁止：

- 新學期不得再以 `et_exam_attempts` / `et_exam_attempt_skill_scores` 作主資料寫入。

## 6. 活動參與

營運權威：

- `events`
- `reservations`

Learning Journey read model：

- `activity_participations`

SOP：

1. 活動預約/簽到仍照既有活動流程。
2. 確認活動開始前 2 小時預約/取消規則未被破壞。
3. 執行或等待活動參與 sync。
4. 檢查 `activity_participations` freshness。
5. 抽查學生 timeline 的活動事件。

## 7. 修課紀錄

Canonical：

- `courses`
- `course_enrollments`
- `course_outcome_mappings`

SOP：

1. 進入 `/admin/learning-journey`。
2. 上傳修課紀錄 Excel。
3. 先執行 dry run。
4. 若有錯誤列或重複列，修正來源檔後重跑 dry run。
5. dry run 通過後，由 super admin 執行 apply。
6. 回到 Governance Overview 檢查 `courseImport.courseEnrollmentCount`。
7. 抽查學生正式頁的修課紀錄與 `course_record` timeline。

禁止：

- 不可用 `classes` / `class_memberships` 取代正式修課紀錄。

## 8. 問卷資料

正式來源：

- `surveys`
- `survey_rules`
- `survey_responses`
- `survey_response_answers`

Legacy fallback：

- legacy English Table / English Club survey response
- `SurveySettings`
- `surveys.json` 已不作正式 config API

SOP：

1. 新問卷於 Survey Center 建立。
2. 發佈版本。
3. 設定 Survey Rules。
4. 測試公開 package API。
5. 測試 gating。
6. legacy response migration 完成前，不要關閉 legacy duplicate/gating fallback。

## 9. 匯入後必跑

```powershell
npm run lj:daily-governance -- --semesterId=<semester>
npm run lj:reconcile-semester -- --semesterId=<semester>
```

後台確認：

- Governance Overview `status`
- `canonicalReady`
- `freshness`
- `reconciliation`
- `jobs.recent`
- `imports.quarantineCount`
- `fallbackUsage`

## 10. 錯誤處理

Dry run 有錯：

- 不可 apply。
- 修正來源檔。
- 保留錯誤列與修正紀錄。

Apply 失敗：

- 記錄 Request-ID。
- 不重複手動改 DB。
- 檢查 job_runs、migration batch、quarantine。

Data freshness unknown：

- 確認 migration 是否已執行。
- 確認 table 是否存在。
- 確認 `updated_at` 是否可判讀。

Reconciliation error：

- 先確認來源表與 canonical 表筆數。
- 再確認 sync/migration 是否完整。
- 需有修正或允收紀錄才能上線。
