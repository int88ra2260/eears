# Learning Journey P10 Legacy Usage Audit 與下一批 410 決策

本文件用於正式上線前後追蹤 legacy 使用情形，並決定下一批可進入 `410 Gone` 的 API/UI。

## 1. Audit 期間

建議觀察期間：

- 上線前：至少 7 天測試環境。
- 上線後：至少 30 天正式環境。
- 若期間有 `legacy_write_blocked` 或未知 `legacy_gone` client，觀察期重新計算。

查詢 API：

```http
GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30
```

需追蹤類型：

- `legacy_write`
- `legacy_write_blocked`
- `legacy_gone`
- `lj_fallback`

## 2. 高風險使用定義

高風險：

- canonical-required 學期仍嘗試 legacy write。
- 已 `410 Gone` 的 API 仍被正式前端或整合端呼叫。
- `lj_fallback` 發生於新學期正式判讀流程。
- 未知 client 持續呼叫封存頁或 deprecated API。

中風險：

- 歷史學期 legacy read 仍頻繁使用，但有合理維運情境。
- `legacy_gone` 來自舊書籤或人工測試。
- `lj_fallback` 來自資料尚未同步完成的測試資料。

低風險：

- 已知測試帳號手動驗證 410/header。
- 歷史學期 audit/archive 查詢。
- 一次性舊書籤 redirect。

## 3. 下一批 410 候選

| 候選 | 現況 | 進入 410 條件 | 建議 |
|---|---|---|---|
| `/api/surveys/check/:surveyId/:studentId` | read-only deprecated | product gating 與 legacy response migration 完成，30 天無高風險 usage | 下一批候選 |
| `/api/surveys/stats/:surveyId` | read-only deprecated | Survey Center analytics 覆蓋，30 天無使用 | 下一批候選 |
| `/api/surveys/export/:surveyId` | read-only deprecated | Survey Center export 覆蓋，行政端確認不再依賴 | 下一批候選 |
| `/admin/surveys` | 封存頁 | 30 天無直接 hit | 移除 route 或 redirect |
| `/admin/survey-settings` | 封存頁 | 30 天無直接 hit | 移除 route 或 redirect |
| `/admin/english-test-tracking/legacy` | 封存頁 | fallback usage 長期為 0，且 rollback SOP 不需要該頁 | 移除 route 或 redirect |

## 4. 暫不進入 410

| 項目 | 原因 |
|---|---|
| `/api/english-tests/*` 全面 410 | 仍需歷史學期 fallback / audit；新學期已由 canonical-required 擋寫 |
| `/api/admin/english-tests/*` 全面 410 | 相容維運與過渡總覽尚可能需要 |
| `english_test_registrations` | BESTEP 報名營運權威 |
| `bestep_attendance` | BESTEP 出席原始來源 |
| `bestep_exam_scores` | BESTEP 成績原始匯入來源 |
| `events` / `reservations` | 活動營運權威 |

## 5. 決策紀錄表

| 日期 | 項目 | Audit 結果 | 決策 | 決策人 | 備註 |
|---|---|---|---|---|---|
| ＿＿＿＿ | `/api/surveys/check/:surveyId/:studentId` | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ |
| ＿＿＿＿ | `/api/surveys/stats/:surveyId` | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ |
| ＿＿＿＿ | `/api/surveys/export/:surveyId` | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ |
| ＿＿＿＿ | `/admin/surveys` | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ |
| ＿＿＿＿ | `/admin/survey-settings` | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ |
| ＿＿＿＿ | `/admin/english-test-tracking/legacy` | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ | ＿＿＿＿ |

## 6. 410 前置作業

1. 更新 `docs/legacy-route-api-deprecation.md`。
2. 通知行政與整合端。
3. 確認替代 API / UI 已通過 UAT。
4. 部署前在測試環境確認 header 與 response body。
5. 部署後連續觀察 `legacy_gone`。

## 7. Rollback

若誤判 410：

- 優先確認是否可用替代 API 完成同一業務。
- 若是正式流程阻斷，回復 route 至 deprecated read-only，而非恢復 legacy write。
- 記錄 incident、client、requestId 與缺失原因。
