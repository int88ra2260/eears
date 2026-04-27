# Learning Journey P5 上線前檢查清單

本清單用於正式切換前最後一次 go/no-go 檢查，範圍涵蓋 legacy 收斂、資料治理、每日維運入口與正式學生學習歷程頁。

## 1. Legacy 收斂

- [ ] 確認 `/admin/learning-journey` 已作為英語學習歷程主入口。
- [ ] 確認 `/admin/english-test-v2` 不再出現在側欄，直接進入時仍 redirect。
- [ ] 確認 `/admin/english-test-tracking/legacy` 不列入側欄，只供 fallback。
- [ ] 確認 `/admin/surveys` 與 `/admin/survey-settings` 不列入側欄，只供舊資料查詢或緊急 fallback。
- [ ] 確認 legacy API 回應含 `Deprecation`、`Sunset`、`X-EEARS-Replacement` headers。
- [ ] 對照 `docs/legacy-route-api-deprecation.md`，確認沒有未登記的 legacy route/API 仍作正式入口。

## 2. 資料來源與同步

- [ ] 確認 `docs/data-source-of-truth.md` 已涵蓋活動、BESTEP 報名、BESTEP 成績、其他英檢、修課、問卷。
- [ ] 執行 BESTEP 報名/成績/出席同步或確認最新匯入批次。
- [ ] 執行活動參與同步或確認 `activity_participations` 已更新。
- [ ] 執行修課匯入 dry run，確認無錯誤後再 apply。
- [ ] 執行 data freshness，確認核心 section 非 `unknown`。
- [ ] 執行 reconciliation，確認沒有未處理 error。

## 3. 每日維運入口

- [ ] 進入 `/admin/learning-journey`。
- [ ] 切換「管理模式」。
- [ ] 載入「P4/P5 上線治理總覽（每日維運入口）」。
- [ ] 確認 `status` 為 `ok` 或已註記可接受的 `warning`。
- [ ] 檢查 KPI：名冊人數、風險學生、修課紀錄、Quarantine。
- [ ] 檢查 top risk students，抽查高風險學生正式頁。
- [ ] 檢查 import/sync history，確認沒有最近失敗批次未處理。

## 4. 正式學生頁抽查

- [ ] 至少抽查 3 類學生：資料完整、英檢未達標/高風險、資料缺漏。
- [ ] 確認正式頁可顯示活動參與、BESTEP 報名與成績、其他英檢、修課紀錄、timeline、風險提示、data quality。
- [ ] 執行跨來源一致性檢查，確認 warning/error 已處理或註記。
- [ ] 下載 JSON report，確認與頁面資料一致。
- [ ] 開啟 HTML report，確認可列印或另存 PDF。

## 5. Go/No-Go 判斷

可上線條件：

- [ ] 治理總覽 `status` 非 `error` / `unknown`。
- [ ] Legacy 主入口已隱藏或標記為維運/fallback。
- [ ] 所有 high-severity reconciliation error 已修復或有書面允收。
- [ ] Quarantine 未處理資料不影響正式判讀，或已有補救計畫。
- [ ] 操作文件與 UAT 報告已完成。

暫緩上線條件：

- [ ] Learning Journey profile/report API 無法穩定回應。
- [ ] 核心資料來源 freshness 為 `unknown` 且無法判斷原因。
- [ ] BESTEP、活動、修課三者任一資料大量缺漏且無允收說明。
- [ ] Legacy UI/API 仍被當作正式日常入口使用。
