# Learning Journey P9 Legacy Final Removal UAT Checklist

本清單用於 legacy API/UI 最終移除前的驗收。P9 先實作 read-only / 410 / 封存頁與 usage audit，不直接刪資料表。

## 1. 410 / Read-only 驗收

- [ ] `GET /api/surveys/config` 回 `410 Gone`。
- [ ] `GET /api/surveys/config` response header 含 `Deprecation`、`Sunset`、`Link`、`X-EEARS-Replacement-API`。
- [ ] `system_logs` 可看到 type=`legacy_gone`。
- [ ] `/api/surveys/check/:surveyId/:studentId` 仍 read-only 可用。
- [ ] `/api/surveys/stats/:surveyId` 仍 read-only 可用。
- [ ] `/api/surveys/export/:surveyId` 仍 read-only 可用。
- [ ] canonical-required 學期 legacy 英檢寫入仍回 `409`。

## 2. 前端封存頁驗收

- [ ] `/admin/english-test-v2` redirect 至 `/admin/learning-journey`。
- [ ] `/admin/english-test-tracking/legacy` 顯示封存頁，不再載入 legacy component。
- [ ] `/admin/surveys` 顯示封存頁，提供 `/admin/survey-center` 替代入口。
- [ ] `/admin/survey-settings` 顯示封存頁，提供 `/admin/survey-rules` 替代入口。
- [ ] 側欄沒有任何入口導向上述封存頁。

## 3. Usage Audit Report

- [ ] `GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30` 可查詢。
- [ ] 報表包含 `legacy_write`、`legacy_write_blocked`、`legacy_gone`、`lj_fallback`。
- [ ] 報表列出 top legacy paths。
- [ ] 最終移除前最近 30 天沒有未處理的 legacy dependency。

## 4. 替代 API 驗收

- [ ] 問卷公開讀取改用 `/api/surveys/public/:surveyKey`。
- [ ] 問卷提交改用 `/api/surveys/public/:surveyKey/responses`。
- [ ] 問卷管理改用 Survey Center / Survey Rules。
- [ ] 英檢 dashboard/profile/report 改用 `/api/v3/learning-journey/*`。
- [ ] BESTEP operational source 仍正常，不被誤下線。

## 5. 最終移除 Go / No-Go

可移除：

- [ ] 目標 route 已 410 或封存至少一個公告期。
- [ ] usage audit 最近 30 天無 blocking dependency。
- [ ] governance overview `canonicalReady.canonicalReady = true`。
- [ ] UAT 報告已簽核。

暫緩：

- [ ] usage audit 仍有未知 client 使用已 410 route。
- [ ] 使用者仍透過舊 URL 進入封存頁。
- [ ] 替代 API 尚未覆蓋正式流程。
- [ ] canonical-required 學期仍有 legacy write 嘗試。
