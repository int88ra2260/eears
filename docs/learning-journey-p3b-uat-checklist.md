# Learning Journey P3-B UAT Checklist

用途：驗收正式學生學習歷程頁與報告輸出是否可作為行政端正式使用入口。

## A. 測試基本資料

- 執行日期：＿＿＿＿＿＿＿＿
- 測試學期：＿＿＿＿＿＿＿＿
- 測試學生學號：＿＿＿＿＿＿＿＿
- 執行人員：＿＿＿＿＿＿＿＿
- 驗收主管：＿＿＿＿＿＿＿＿

## B. 前置條件

- [ ] 已完成 P2 migration，資料庫存在 `courses`、`course_enrollments`、`course_outcome_mappings`
- [ ] 已完成必要資料同步或匯入：
  - [ ] 活動預約 / 簽到
  - [ ] BESTEP 報名
  - [ ] BESTEP 成績 / 出席
  - [ ] 其他英檢
  - [ ] 修課紀錄
- [ ] `npm run lint -- --quiet` 不再被 `build/static/js/main...js` 擋住
- [ ] 可登入具備 Learning Journey 權限的行政帳號

## C. 正式學生頁

測試路徑：`/admin/learning-journey/students/:studentId`

- [ ] 頁面可正常載入，無 500 / 空白畫面
- [ ] 基本資料顯示學號、姓名、LJS student 狀態
- [ ] 活動參與顯示預約 / 簽到 / LJS 活動參與資料
- [ ] BESTEP 報名與成績區顯示報名、成績或出席事件
- [ ] 其他英檢區顯示 legacy ET 或 LJS external exam attempts
- [ ] 修課紀錄區顯示學期、課號、課名、通過 / 修課狀態
- [ ] Timeline 顯示活動、英檢、BESTEP、修課等事件
- [ ] 修課 timeline 事件顯示為 `修課紀錄`
- [ ] 風險提示可說明缺漏或風險來源
- [ ] Data Quality 可顯示 warning / error / info

## D. 跨來源一致性檢查

API：`GET /api/v3/learning-journey/students/:studentId/consistency`

- [ ] 活動區塊 `activities` 有正確 recordCount / timelineCount
- [ ] BESTEP 區塊 `bestep` 有正確 recordCount / timelineCount
- [ ] 外部英檢區塊 `external_exams` 有正確 recordCount / timelineCount
- [ ] 修課區塊 `courses` 有正確 recordCount / timelineCount
- [ ] 有資料的區塊在學生頁可看見
- [ ] 無資料的區塊顯示空狀態，不誤導為系統錯誤
- [ ] 若 consistency 為 `warning`，頁面能顯示原因

## E. 報告匯出

API：

- `GET /api/v3/learning-journey/students/:studentId/report?format=json`
- `GET /api/v3/learning-journey/students/:studentId/report?format=html`

驗收項目：

- [ ] JSON 報告可下載
- [ ] JSON 報告包含與頁面相同的 sections：
  - [ ] activities
  - [ ] bestep
  - [ ] externalExams
  - [ ] courses
  - [ ] timeline
  - [ ] dataQuality
  - [ ] consistency
- [ ] HTML 報告可開啟
- [ ] HTML 報告可由瀏覽器列印 / 另存 PDF
- [ ] HTML 報告的數量摘要與頁面一致
- [ ] 同一學生頁的 JSON、HTML、畫面三者皆來自同一份 Learning Journey profile read model

## F. 回歸檢查

- [ ] `/admin/learning-journey` Hub 仍可載入
- [ ] Hub 可從學生基本資料卡片跳轉正式頁
- [ ] `/admin/english-test-tracking/student-timeline/:studentId` 仍可顯示 timeline
- [ ] `course_record` 不影響既有活動 / 英檢 timeline 顯示
- [ ] 非 super admin 不可執行 course apply
- [ ] admin+ 仍可執行 course dry run

## G. 結論

- [ ] 通過，可進入行政試用
- [ ] 有條件通過，需補強項目：＿＿＿＿＿＿＿＿
- [ ] 不通過，阻擋原因：＿＿＿＿＿＿＿＿

簽核：

- 執行人員：＿＿＿＿＿＿＿＿
- 行政驗收：＿＿＿＿＿＿＿＿
- 技術確認：＿＿＿＿＿＿＿＿
