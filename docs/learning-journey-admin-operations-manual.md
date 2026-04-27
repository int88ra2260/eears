# Learning Journey 管理者操作手冊

本手冊提供行政與管理者在正式上線後的日常操作流程。資料口徑以 `docs/data-source-of-truth.md` 為準。

## 1. 角色與權限

- Admin+：可查看 Learning Journey 總覽、governance overview、readiness、reconciliation、recent jobs。
- Super admin：可執行 sync、course import apply、手動觸發 daily governance / reconciliation jobs。
- 一般行政/教師：依系統權限查看被授權的活動、學生或報表。

## 2. 每日維運流程

1. 登入後台。
2. 進入 `/admin/learning-journey`。
3. 輸入當前學期，例如 `114-1`。
4. 切換「管理模式」。
5. 載入 Governance Overview。
6. 檢查：
   - `status`
   - `canonicalReady`
   - `canonicalCoverage`
   - `fallbackUsage`
   - `jobs.recent`
   - `freshness.sections`
   - `reconciliation.sections`
   - `imports.quarantineCount`
7. 若有 warning/error，依本手冊第 7 節處理。

## 3. 學生正式頁操作

正式頁：

```text
/admin/learning-journey/students/:studentId
```

檢查項目：

- 基本資料
- 活動參與
- BESTEP 報名與成績
- 其他英檢
- 修課紀錄
- timeline
- 風險提示
- data quality
- 跨來源一致性
- JSON / HTML report

操作建議：

- 高風險學生從 Governance Overview 或 risk list 進入正式頁抽查。
- 若資料缺漏，先看 data quality 與 consistency，再回到匯入/SOP 補資料。
- 報告對外使用前，先確認 JSON/HTML 與畫面一致。

## 4. Governance Overview 判讀

重要欄位：

- `status`：整體治理狀態。
- `canonicalReady`：此學期是否達 canonical-ready。
- `canonicalCoverage`：canonical table 覆蓋率。
- `fallbackUsage`：近期 fallback 使用狀態。
- `jobs.recent`：排程或手動治理任務紀錄。
- `freshness`：資料新鮮度。
- `reconciliation`：來源與 canonical 對帳。
- `imports`：migration batch、quarantine、ET import history、course import。

判讀：

- `ok` / `ready`：可進入一般維運。
- `warning`：可繼續使用，但需記錄原因與處置。
- `error` / `unknown` / `not_ready`：不可作正式對外判讀，需先排除。

## 5. 自動化任務

Daily governance：

```powershell
npm run lj:daily-governance -- --semesterId=114-1
```

Semester reconciliation：

```powershell
npm run lj:reconcile-semester -- --semesterId=114-1
```

Windows Task Scheduler 註冊：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\register-learning-journey-windows-tasks.ps1 -SemesterId 114-1
```

管理端可於 Governance Overview 或 recent jobs API 查看執行結果。

## 6. Legacy 使用監控

Legacy usage audit：

```http
GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30
```

需要追蹤：

- `legacy_write`
- `legacy_write_blocked`
- `legacy_gone`
- `lj_fallback`

處置：

- `legacy_write`：確認是否為歷史學期允許操作。
- `legacy_write_blocked`：通知使用者改走 canonical/import SOP。
- `legacy_gone`：通知整合端或使用者替換 API。
- `lj_fallback`：確認是否為資料缺口或歷史學期查詢。

## 7. 常見異常處理

### Governance status 為 warning

1. 查看 recommendations。
2. 檢查 freshness 是否 stale/empty/unknown。
3. 檢查 reconciliation 是否 warning/error。
4. 檢查 jobs.recent 是否 failed/skipped。
5. 檢查 quarantine 是否增加。
6. 記錄允收或排除結果。

### canonicalReady = not_ready

1. 查看 `blockingReasons`。
2. 若是 missing section，先補同步或匯入。
3. 若是 freshness unknown，檢查 migration/table/updated_at。
4. 若是 reconciliation error，執行對帳並修正來源。

### Report 失敗

1. 記錄 Request-ID。
2. 嘗試學生頁重新載入。
3. 確認 profile API 是否成功。
4. 若 HTML report 失敗，可暫用 JSON report 與畫面截圖作內部驗收，並回報技術端。

### Legacy route 被 410

1. 查看 response `X-EEARS-Replacement-API`。
2. 改用替代 API。
3. 若仍有業務需求，記錄 usage audit 與使用者情境，不直接恢復 legacy。

## 8. 回滾策略

- 若 Learning Journey read model 異常，可暫時避免用其作正式判讀，改以 legacy 相容 API 與原始來源進行維運查詢。
- 不刪除 legacy tables，不做 destructive rollback。
- 若自動 job 失敗，不自動切換 feature flag。
- 若 canonical-required 阻擋錯誤，先確認學期門檻與資料來源，再決定是否調整環境變數。

## 9. 文件入口

- Source of truth：`docs/data-source-of-truth.md`
- 上線報告：`docs/learning-journey-p10-production-launch-report.md`
- 匯入 SOP：`docs/learning-journey-data-import-sop.md`
- Legacy deprecation：`docs/legacy-route-api-deprecation.md`
- Final removal UAT：`docs/learning-journey-p9-legacy-final-removal-uat-checklist.md`
