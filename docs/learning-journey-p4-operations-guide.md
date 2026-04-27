# Learning Journey P4 上線操作文件

本文件提供行政與技術人員在 Learning Journey 儀表板與治理工具上線前後的操作流程。

## 1. 每次上線前建議流程

1. 確認最新資料已匯入：
   - 活動預約 / 簽到
   - BESTEP 報名
   - BESTEP 成績 / 出席
   - 其他英檢
   - 修課紀錄
2. 進入 `/admin/learning-journey`
3. 輸入學期代碼，例如 `114-1`
4. 執行「正式版」dashboard
5. 切到「管理模式」
6. 執行：
   - Read Model 狀態
   - Data Freshness
   - Readiness Check
   - 資料對帳
   - P4/P5 上線治理總覽（每日維運入口）
7. 若有 warning / error，先處理或記錄允收原因。
8. 抽查學生正式頁：`/admin/learning-journey/students/:studentId`
9. 下載 JSON report 與開啟 HTML report，確認與畫面一致。
10. 填寫 `docs/learning-journey-p4-launch-uat-report.md`

## 2. P4/P5 Governance Overview 判讀

API：`GET /api/v3/learning-journey/admin/governance-overview?semesterId=...`

重點區塊：

- `dashboard`：學期層級 KPI。
- `classOverview`：依系所 / 年級彙整的名冊人數。
- `risk`：風險學生摘要與前段名單。
- `freshness`：canonical/read model 表的新鮮度。
- `reconciliation`：來源表與 canonical 表對帳結果。
- `imports`：migration batch、quarantine、ET attempt import history、course import 摘要。
- `recommendations`：系統根據 warning/error 產生的上線建議。

判讀規則：

- `ok`：目前未見阻擋上線訊號。
- `warning`：可繼續測試，但需處理或註記差異。
- `error` / `unknown`：不建議上線，需先排除查詢或資料問題。

上線後每日維運建議：

- 每日第一步進入 `/admin/learning-journey` 並載入治理總覽。
- 若 `status` 從 `ok` 變為 `warning`，先檢查 freshness、reconciliation 與最近 import/sync history。
- 若 quarantine 或 failed/partial batch 增加，先處理資料來源或重新 dry run，不直接以正式報表對外公告。
- 高風險學生 KPI 應搭配正式學生頁抽查，不只看總數。

## 3. 匯入與錯誤治理

修課匯入：

- 先 dry run。
- dry run 若有錯誤列或重複列，不可 apply。
- apply 僅 super admin 執行。
- apply 後回到 P4 Governance Overview 檢查 `courseImport.courseEnrollmentCount`。

同步與 migration：

- 先 dry run，再 apply。
- migration batch 若為 `failed` 或 `partial`，需檢查錯誤訊息。
- quarantine 若大於 0，需檢查來源表、source key、reason。

## 4. 風險學生清單操作

風險原因目前包含：

- `NO_EXAM_ATTEMPT`：無任何英檢紀錄
- `MULTI_NOT_ATTAINED`：多次應試仍未達標
- `LOW_ACTIVITY_PARTICIPATION`：活動參與偏低
- `REGISTERED_BUT_NO_ATTEMPT`：已報名但查無出席 / 應試紀錄

處理建議：

- 優先查看風險分數高者。
- 進入正式學生學習歷程頁核對完整資料。
- 若是資料缺漏，先回到匯入 / 同步流程補資料。
- 若是實際學習風險，交由行政或導師追蹤。

## 5. 回復策略

- 若 dashboard 或學生頁資料異常，先關閉或避免使用 v3 作正式判讀，回到 legacy 英檢追蹤頁。
- 若只是資料 stale，重新執行同步與對帳。
- 若匯入錯誤，修正來源 Excel 後重新 dry run / apply。
- 若 report 產生失敗，使用學生頁畫面與 JSON report 作臨時驗收資料，並記錄 Request-ID。

## 6. P5 Legacy 收斂文件

- Deprecated route/API 清單：`docs/legacy-route-api-deprecation.md`
- 上線前檢查清單：`docs/learning-journey-p5-prelaunch-checklist.md`
- 資料來源準則：`docs/data-source-of-truth.md`
