# Learning Journey P8 Canonical Required Readiness Checklist

本清單用於新學期啟用 canonical-required 前後的驗收。P8 目標是新學期資料強制走 Learning Journey canonical，不再新增對 legacy `et_*` 的主資料依賴。

## 1. Policy 設定

- [ ] 確認 `LEARNING_JOURNEY_CANONICAL_REQUIRED_FROM_SEMESTER` 已設定，例如 `115-1`。
- [ ] 確認低於門檻的歷史學期仍可使用 legacy fallback/read-only 查詢。
- [ ] 確認達門檻的新學期 legacy 英檢寫入會回 `409`。
- [ ] 確認被擋下的 legacy write 會寫入 `system_logs` type=`legacy_write_blocked`。

## 2. Canonical Coverage

- [ ] `student_semester_profiles` 非 `empty` / `unknown`。
- [ ] `exam_registrations` 非 `empty` / `unknown`。
- [ ] `exam_attempts` 非 `empty` / `unknown`。
- [ ] `activity_participations` 非 `empty` / `unknown`。
- [ ] `course_enrollments` 非 `empty` / `unknown`。
- [ ] Governance Overview `canonicalReady.canonicalReady = true`。
- [ ] Governance Overview `canonicalReady.blockingReasons` 為空。

## 3. Sync / Import

- [ ] BESTEP 報名走 `english_test_registrations` 營運權威，並同步至 `exam_registrations`。
- [ ] BESTEP 成績從 `bestep_exam_scores` 同步至 `exam_attempts` / `exam_attempt_skill_scores`。
- [ ] 活動簽到/違規從 `events` + `reservations` 同步至 `activity_participations`。
- [ ] 修課匯入寫入 `courses` / `course_enrollments` / `course_outcome_mappings`。
- [ ] 新學期不得以 `et_enrollment_snapshots`、`et_exam_attempts`、`et_exam_attempt_skill_scores` 作為主資料寫入。

## 4. Legacy Write 驗收

- [ ] `POST /api/english-tests/enrollment/import` 對 canonical-required 學期回 `409`。
- [ ] `POST /api/english-tests/attempts/import` 對 canonical-required 學期回 `409`。
- [ ] `POST /api/english-tests/recompute` 對 canonical-required 學期回 `409`。
- [ ] `POST /api/admin/english-tests/semesters` 建立 canonical-required 學期時回 `409`。
- [ ] 歷史學期 legacy write 若仍允許，response meta 必須標示 deprecated 與 canonical policy。

## 5. Governance / Jobs

- [ ] 執行 `npm run lj:daily-governance -- --semesterId=<semester>`。
- [ ] 執行 `npm run lj:reconcile-semester -- --semesterId=<semester>`。
- [ ] Governance Overview 顯示 latest job run。
- [ ] Recent jobs 沒有未處理 `failed`。
- [ ] Data freshness 沒有 canonical critical section 為 `unknown`。
- [ ] Reconciliation 沒有 blocking error。

## 6. Go / No-Go

可啟用 canonical-required：

- [ ] `canonicalReady.status = ready`。
- [ ] 所有 canonical coverage section covered。
- [ ] Legacy write block 已驗證。
- [ ] 操作人員知道新學期匯入需走 Learning Journey canonical sync/import。

暫緩：

- [ ] `canonicalReady.status = not_ready`。
- [ ] 任一 canonical section 為 `empty` / `unknown` 且無允收說明。
- [ ] Legacy write 仍能寫入 canonical-required 學期。
- [ ] 新學期匯入 SOP 仍指向 legacy `et_*`。
