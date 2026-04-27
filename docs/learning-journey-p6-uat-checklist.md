# Learning Journey P6 UAT Checklist

本清單驗收「Legacy 下線策略、Data 單一來源化、自動化同步與治理架構設計」。

## 1. Legacy 下線驗收

- [ ] `/api/english-tests/*` 回應包含 `Deprecation`、`Sunset`、`Link`、`X-EEARS-Replacement-API`。
- [ ] `/api/admin/english-tests/*` 回應包含 legacy warning/deprecation headers。
- [ ] legacy `/api/surveys/*` 相容路徑回應包含 replacement API 標示。
- [ ] 高風險 legacy write response `meta.deprecated = true`、`meta.legacyWrite = true`。
- [ ] `system_logs` 可看到 type=`legacy_write` 的紀錄。
- [ ] 側欄沒有導向 `/admin/english-test-v2`、`/admin/surveys`、`/admin/survey-settings`。
- [ ] fallback route 仍可直接使用，且權限不擴大。
- [ ] `english_test_registrations`、`bestep_attendance`、`bestep_exam_scores` 未被誤列刪除。

## 2. Canonical Data 驗收

- [ ] profile/timeline/report 使用 canonical source 優先。
- [ ] fallback 使用時 response `meta.fallbackUsed = true`。
- [ ] fallback 使用時 response `meta.fallbackSources` 可辨識來源。
- [ ] response `meta.canonicalCoverage.sections` 可辨識 covered/fallback/missing。
- [ ] governance overview 可看到 `fallbackUsage`。
- [ ] governance overview 可看到 `canonicalCoverage`。
- [ ] `canonicalMissingSections` 能對應 freshness 或 sync 缺口。
- [ ] 不以 `classes` / `class_memberships` 作正式修課紀錄。

## 3. 自動化驗收

P6 第一版設計驗收：

- [ ] `docs/learning-journey-p6-automation-architecture.md` 已列出每日、匯入後、每週任務。
- [ ] 文件已定義短期 Windows Task Scheduler + npm script 方案。
- [ ] `npm run lj:daily-governance -- --semesterId=114-1` 可產生治理總覽 JSON。
- [ ] `npm run lj:reconcile-semester -- --semesterId=114-1` 可產生對帳 JSON。
- [ ] 文件已定義中期 `job_runs` table schema。
- [ ] governance overview job runs 區塊顯示「尚未啟用自動化任務紀錄」，不顯示假資料。

中期實作後再驗：

- [ ] Daily governance script 可手動執行。
- [ ] Job run 有記錄。
- [ ] 失敗時可看到 `errorMessage`。
- [ ] 不會破壞既有資料。
- [ ] super admin 才能手動觸發。
- [ ] 同 job/semester 有 lock 或清楚的重複執行風險提示。

## 4. 回歸驗收

- [ ] 活動預約/取消仍維持活動開始前 2 小時規則。
- [ ] BESTEP 報名/審核仍正常。
- [ ] BESTEP 成績/出席匯入仍正常。
- [ ] 英語學習歷程中心總覽仍正常。
- [ ] 修課匯入 dry-run/apply 仍正常。
- [ ] 學生 Learning Journey 頁仍正常。
- [ ] JSON/HTML report 仍正常。
- [ ] 問卷 gating 仍可辨識舊填答，不重複阻擋已填學生。
- [ ] `npm run lint -- --quiet` 通過或僅有既有非 P6 問題。
- [ ] `node --check` P6 修改檔案通過。
- [ ] ReadLints 無新增錯誤。

## 5. Go/No-Go

可上線：

- [ ] Governance overview `status` 非 `error` / `unknown`。
- [ ] Legacy write 已可觀測。
- [ ] fallback usage 可被 governance overview 或 log 看到。
- [ ] P6 文件與 P5 prelaunch checklist 一致。

暫緩：

- [ ] fallback usage 無法追蹤。
- [ ] canonical coverage 無法計算。
- [ ] legacy write 無 header 或 log。
- [ ] product survey 尚未覆蓋正式 gating，但 legacy route 已被關閉。
