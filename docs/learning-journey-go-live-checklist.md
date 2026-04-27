# Learning Journey Go-Live Checklist

本清單用於正式上線前最終確認，確保 Learning Journey v3 在「預設啟用」條件下可安全運作並可隨時 rollback。

---

## 1) 環境變數確認

- [ ] `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL` 已依上線決策設定（建議正式上線為 `true`）
- [ ] `LOG_LEVEL` 與監控設定已符合上線環境
- [ ] 無未預期的測試環境變數殘留
- [ ] 已確認 rollback 時改回 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=false` 的流程

---

## 2) DB Tables 確認（Canonical）

請確認以下表存在且可查詢：

- [ ] `exam_attempts`
- [ ] `exam_registrations`
- [ ] `activity_participations`
- [ ] `student_semester_profiles`

補充：
- 若表缺失，啟動檢查會在 dev/prod 記錄警示，但不會自動 crash。
- 此情況下應先排除問題，不建議直接上線。

---

## 3) Sync 執行確認

- [ ] 已執行 dry run 並確認結果合理
- [ ] （必要時）已執行 apply
- [ ] apply 後已重新驗證主要學期資料
- [ ] 已保留 sync 執行紀錄（含人員、學期、時間）

---

## 4) Readiness 結果確認

- [ ] 目標學期 `readiness` = `ready`
- [ ] 無 `error` 等級檢查
- [ ] 若有 warning，已具備可解釋原因與處置

---

## 5) Data Freshness 確認

- [ ] `student_semester_profiles` 狀態為 `fresh` 或可解釋
- [ ] `exam_attempts` 狀態為 `fresh` 或可解釋
- [ ] `exam_registrations` 狀態為 `fresh` 或可解釋
- [ ] `activity_participations` 狀態為 `fresh` 或可解釋
- [ ] 若有 `stale` / `empty`，已先完成同步或明確註記風險

---

## 6) 資料凍結點（Data Freeze Point）

- [ ] 已定義本次上線判讀的資料凍結時間（Freeze Time）：＿＿＿＿＿＿
- [ ] 已確認凍結點後不再納入新匯入資料做 KPI 驗收
- [ ] 若凍結點後有必要補資料，已重新執行 sync/readiness/freshness 再判讀

---

## 7) Rollback 方式（必備）

- [ ] 已確認 rollback SOP：
  1. 設 `ENABLE_LEARNING_JOURNEY_V3_READ_MODEL=false`
  2. 重啟後端服務
  3. 確認 `/api/admin/english-tests/*` 來源回 legacy
  4. 回歸檢查核心頁面
- [ ] 已確認負責人與可執行時間窗口

---

## 8) UAT 簽核

- [ ] 行政端驗收完成
- [ ] 技術端驗收完成
- [ ] 決策人簽核完成

簽核紀錄：
- 行政驗收：＿＿＿＿＿＿
- 技術驗收：＿＿＿＿＿＿
- 決策核可：＿＿＿＿＿＿
- 日期：＿＿＿＿＿＿

---

## 9) 上線後 1 週觀測項目

### 每日檢查

- [ ] fallback 次數是否異常上升
- [ ] fallback rate（fallback / admin 英檢查詢總量）是否超過門檻（建議 < 1%）
- [ ] fallback 主要發生 API 是否集中在特定端點（summary/students/detail）
- [ ] fallback 原因分類是否可追溯（timeout、查無資料、查詢錯誤）
- [ ] v3/legacy 使用比例是否符合預期
- [ ] 關鍵 API latency 是否異常
- [ ] KPI 是否有不可解釋突變
- [ ] Risk Students 是否出現大規模異常波動

### 週結案確認

- [ ] 無重大營運阻斷
- [ ] 無持續性資料誤判問題
- [ ] 可維持 v3 預設策略
- [ ] 若需調整，已有變更提案與時程

