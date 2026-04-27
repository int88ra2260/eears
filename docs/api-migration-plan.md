# API Migration Plan（Phase 6）

本文件定義英語學習歷程中心（Learning Journey）相關 API 由 legacy 過渡到 Learning Journey read model 的收斂計畫。

## 原則

- 讀取 API 以 `/api/v3/learning-journey/...` 為主體。
- `/api/admin/english-tests/*` 保留為 compatibility layer（薄代理）與 rollback 路徑。
- 既有 compare / readiness / reconciliation 保留，直到正式下線 legacy 前。

## 已被 v3 取代（主路徑）

- `GET /api/v3/learning-journey/semesters/:semesterId/english-test-summary`
- `GET /api/v3/learning-journey/semesters/:semesterId/english-test-students`
- `GET /api/v3/learning-journey/semesters/:semesterId/english-test-students/:studentId`
- `GET /api/v3/learning-journey/semesters/:semesterId/risk-students`
- `GET /api/v3/learning-journey/admin/readiness`
- `GET /api/v3/learning-journey/admin/read-model-status`

## 仍在使用（相容/過渡）

- `GET /api/admin/english-tests/semesters/:semesterId/summary`
- `GET /api/admin/english-tests/semesters/:semesterId/students`
- `GET /api/admin/english-tests/semesters/:semesterId/students/:studentId`

說明：
- 以上三支 API 已預設讀 v3（除非 flag 明確 `false`）。
- 若 v3 查詢失敗，仍 fallback 到 legacy，避免中斷營運。

## Legacy 專用（deprecated，未刪除）

- `/api/english-tests/tracking/*`
- `services/englishTestTracking/*`（含 et_* 匯入/報表/重算）

## 預計移除時間（建議）

- T0（現在）：預設 v3 + compatibility + fallback
- T0 + 1~2 個月：觀測 fallback 次數，持續 UAT 與抽查
- T0 + 2~3 個月：若 fallback 長期趨近 0 且行政驗收穩定，提案下線 legacy 路由（保留唯讀與備援週期）
- T0 + 3~4 個月：正式移除 legacy API（需另案簽核與變更窗口）

> 實際移除時間以營運簽核、風險評估與監控結果為準。
