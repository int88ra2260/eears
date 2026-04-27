# Learning Journey P4 正式上線 UAT 報告

用途：作為 Learning Journey 儀表板與治理工具正式上線前的驗收紀錄。

## A. 基本資料

- UAT 日期：＿＿＿＿＿＿＿＿
- 測試學期：＿＿＿＿＿＿＿＿
- 測試環境：＿＿＿＿＿＿＿＿
- 執行人員：＿＿＿＿＿＿＿＿
- 行政驗收：＿＿＿＿＿＿＿＿
- 技術確認：＿＿＿＿＿＿＿＿

## B. 上線前資料狀態

- [ ] 已完成活動資料同步
- [ ] 已完成 BESTEP 報名資料同步
- [ ] 已完成 BESTEP 成績資料同步
- [ ] 已完成其他英檢資料同步
- [ ] 已完成修課紀錄匯入與 apply
- [ ] 已處理或註記匯入錯誤列 / quarantine
- [ ] 已執行 readiness check
- [ ] 已執行 P4 governance overview

## C. 學期 / 班級總覽

測試頁：`/admin/learning-journey`

- [ ] 指定學期可載入正式總覽
- [ ] 名冊人數合理
- [ ] 達標率合理
- [ ] BESTEP / 英檢報名率合理
- [ ] 活動參與率合理
- [ ] 系級 / 年級總覽可顯示
- [ ] 總覽數據與行政認知一致或差異可解釋

## D. 風險學生清單

- [ ] 風險學生清單可載入
- [ ] 高風險排序合理
- [ ] 風險原因可讀，例如無英檢紀錄、活動參與偏低、多次未達標
- [ ] 點選或複製學號後可進入正式學生學習歷程頁查核
- [ ] 風險名單若為空，行政端可理解代表目前無可偵測風險

## E. 資料同步與一致性

- [ ] Read model status 可載入
- [ ] Data freshness 可載入
- [ ] Reconciliation 可載入
- [ ] P4 governance overview 可載入
- [ ] stale / empty / warning 狀態有明確訊息
- [ ] 對帳 warning / error 可定位到區塊
- [ ] 同一學生頁 consistency API 可確認活動、BESTEP、其他英檢、修課是否都可顯示

## F. 匯入紀錄與錯誤治理

- [ ] 修課匯入 dry run 可顯示錯誤列
- [ ] 修課匯入 apply 僅 super admin 可執行
- [ ] 最近 migration batch 可在 governance overview 看到
- [ ] quarantine 筆數可在 governance overview 看到
- [ ] ET attempt import history 可在 governance overview 看到
- [ ] 若有錯誤列，已記錄處理方式或允收原因

## G. 正式學生學習歷程頁

抽查至少 10 位學生：

- [ ] 基本資料正確
- [ ] 活動參與正確
- [ ] BESTEP 報名與成績正確
- [ ] 其他英檢正確
- [ ] 修課紀錄正確
- [ ] timeline 順序合理
- [ ] 風險提示合理
- [ ] data quality 可讀
- [ ] JSON / HTML 報告與頁面內容一致

## H. 結論

- [ ] 通過，可正式上線
- [ ] 有條件通過，需追蹤項目：＿＿＿＿＿＿＿＿
- [ ] 不通過，阻擋原因：＿＿＿＿＿＿＿＿

簽核：

- 行政驗收：＿＿＿＿＿＿＿＿
- 技術確認：＿＿＿＿＿＿＿＿
- 上線核准：＿＿＿＿＿＿＿＿
