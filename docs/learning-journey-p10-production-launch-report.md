# Learning Journey P10 正式上線驗收報告

本報告整併 P0-P9 的 UAT checklist 與上線條件，作為正式切換 Learning Journey canonical-first 平台前的簽核文件。

## 1. 基本資料

- 報告日期：2026-04-27
- 測試環境：＿＿＿＿＿＿＿＿
- 測試學期：＿＿＿＿＿＿＿＿
- canonical-required 起始學期：`LEARNING_JOURNEY_CANONICAL_REQUIRED_FROM_SEMESTER=＿＿＿＿`
- 執行人員：＿＿＿＿＿＿＿＿
- 行政驗收：＿＿＿＿＿＿＿＿
- 技術確認：＿＿＿＿＿＿＿＿
- 上線核准：＿＿＿＿＿＿＿＿

## 2. 上線範圍

本次上線範圍：

- P0：活動預約/取消固定活動開始前 2 小時。
- P1：資料來源治理。
- P2：正式修課資料層與匯入。
- P3 / P3-B：正式學生學習歷程頁、JSON/HTML report、一致性檢查。
- P4：治理總覽 API/UI。
- P5：legacy UI 收斂與 prelaunch checklist。
- P6：legacy 下線策略、canonical-first、fallback observability。
- P7：`job_runs` 與 Windows Task Scheduler 自動化治理。
- P8：新學期 canonical-required。
- P9：legacy read-only / 410 sunset、usage audit。

## 3. P0-P9 UAT 執行總表

| 階段 | 驗收來源 | 目前狀態 | 證據 / 備註 | 簽核 |
|---|---|---|---|---|
| P0 2 小時規則 | `docs/learning-journey-p0-p3-execution-plan.md` | 待執行 | 驗證前後端常數與取消/預約情境 | ＿＿＿＿ |
| P1 Source of Truth | `docs/data-source-of-truth.md` | 待審閱 | 權威表、legacy 策略、禁止事項 | ＿＿＿＿ |
| P2 修課資料層 | P2 execution plan / course import UI | 待執行 | migration、dry run、apply、student courses API | ＿＿＿＿ |
| P3 正式學生頁 | `docs/learning-journey-p3b-uat-checklist.md` | 待執行 | 抽查學生頁、timeline、risk、data quality | ＿＿＿＿ |
| P3-B report/consistency | `docs/learning-journey-p3b-uat-checklist.md` | 待執行 | JSON/HTML report 與頁面一致 | ＿＿＿＿ |
| P4 governance | `docs/learning-journey-p4-launch-uat-report.md` | 待執行 | dashboard、freshness、reconciliation、imports | ＿＿＿＿ |
| P5 prelaunch | `docs/learning-journey-p5-prelaunch-checklist.md` | 待執行 | legacy 入口、每日維運入口、go/no-go | ＿＿＿＿ |
| P6 fallback/canonical | `docs/learning-journey-p6-uat-checklist.md` | 待執行 | fallback meta、canonical coverage、legacy write log | ＿＿＿＿ |
| P7 job runs | `docs/learning-journey-p7-job-runs-automation.md` | 待執行 | `job_runs`、lock、recent jobs、scheduler | ＿＿＿＿ |
| P8 canonical-required | `docs/learning-journey-p8-canonical-readiness-checklist.md` | 待執行 | 新學期 legacy write 409、canonicalReady | ＿＿＿＿ |
| P9 sunset | `docs/learning-journey-p9-legacy-final-removal-uat-checklist.md` | 待執行 | 410、封存頁、usage audit | ＿＿＿＿ |

> 註：本報告不假設已連線正式資料庫或已完成瀏覽器人工 UAT；上表需由實際執行人員填寫。

## 4. 必跑技術檢查

後端：

```powershell
node --check server.js
node --check controllers/learningJourneyController.js
node --check services/learningJourney/governanceOverviewService.js
node --check services/learningJourney/learningJourneyJobService.js
node --check services/learningJourney/legacyUsageAuditService.js
node --check middlewares/legacyDeprecation.js
node --check routes/learningJourneyRouter.js
```

前端：

```powershell
npm run lint -- --quiet
```

資料庫 migration：

```powershell
# 依專案實際 migration 指令執行
# 需確認 job_runs、courses、course_enrollments、course_outcome_mappings 等表存在
```

## 5. 必跑治理檢查

以正式測試學期執行：

```powershell
npm run lj:daily-governance -- --semesterId=<semesterId>
npm run lj:reconcile-semester -- --semesterId=<semesterId>
```

後台檢查：

- [ ] `/admin/learning-journey` 可載入。
- [ ] Governance Overview `status` 非 `error` / `unknown`。
- [ ] `canonicalReady.status = ready` 或有正式允收紀錄。
- [ ] `jobs.recent` 可看到最新 daily governance / reconciliation。
- [ ] `fallbackUsage.fallbackUsageCount` 為 0，或所有 fallback 皆為歷史學期允收。
- [ ] `legacy-usage-audit?days=30` 無高風險未處理使用。

## 6. Legacy Usage Audit 結論

執行：

```http
GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30
```

驗收：

- [ ] `legacy_write` 無 canonical-required 學期寫入。
- [ ] `legacy_write_blocked` 若存在，皆已追蹤使用者/來源。
- [ ] `legacy_gone` 若存在，皆已通知改用替代 API。
- [ ] `lj_fallback` 若存在，皆可解釋為歷史學期或資料缺口處理中。
- [ ] 最近 30 天無高風險未處理 usage。

## 7. 下一批 410 決策

建議進入下一批 410 的候選：

| 候選項目 | 前置條件 | 建議決策 | 備註 |
|---|---|---|---|
| `/api/surveys/check/:surveyId/:studentId` | product survey gating 完成、legacy response migration 完成、30 天 usage 無高風險 | 候選 | 目前仍 read-only 保留 |
| `/api/surveys/stats/:surveyId` | Survey Center analytics 覆蓋、30 天無使用 | 候選 | 舊報表只保留對帳期 |
| `/api/surveys/export/:surveyId` | Survey Center export 覆蓋、30 天無使用 | 候選 | 需先確認行政端匯出需求 |
| `/admin/surveys` | 封存頁 30 天無直接 hit | 候選 | 前端 route 可移除或保留 redirect |
| `/admin/survey-settings` | 封存頁 30 天無直接 hit | 候選 | 新規則以 Survey Rules 為主 |
| `/admin/english-test-tracking/legacy` | governance/fallback 長期為 0 | 候選 | 需保留 rollback 替代方案 |

不建議進入下一批 410：

- `english_test_registrations`
- `bestep_attendance`
- `bestep_exam_scores`
- BESTEP 報名/匯入營運入口
- `events` / `reservations`

## 8. Go / No-Go

可上線：

- [ ] P0-P9 checklist 全部通過，或所有未通過項目已有主管允收。
- [ ] Governance Overview 無 blocking error。
- [ ] `job_runs` 已正常記錄排程與手動執行。
- [ ] Legacy usage audit 連續觀察期無高風險使用。
- [ ] 管理者操作手冊與資料匯入 SOP 已交付。

暫緩：

- [ ] `canonicalReady.status = not_ready` 且無允收。
- [ ] legacy write 可寫入 canonical-required 學期。
- [ ] profile/report API 不穩定。
- [ ] usage audit 顯示仍有未知 client 使用 410 或封存路徑。

## 9. 簽核

- 行政驗收：＿＿＿＿＿＿＿＿ 日期：＿＿＿＿＿＿＿＿
- 技術確認：＿＿＿＿＿＿＿＿ 日期：＿＿＿＿＿＿＿＿
- 資料治理確認：＿＿＿＿＿＿＿＿ 日期：＿＿＿＿＿＿＿＿
- 上線核准：＿＿＿＿＿＿＿＿ 日期：＿＿＿＿＿＿＿＿
