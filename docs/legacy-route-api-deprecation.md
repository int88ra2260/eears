# Legacy Route/API Deprecation Register

本文件固定 P5「legacy 收斂與正式上線前清理」的 deprecated 清單。原則是先標記、隱藏入口與保留 fallback；未完成備份、對帳、UAT 與公告前，不做 destructive migration。

## 1. 前端入口狀態

| 領域 | Legacy 入口 | 目前狀態 | 正式替代入口 | 備註 |
|------|-------------|----------|--------------|------|
| Learning Journey legacy alias | `/admin/english-test-v2` | 側欄隱藏，redirect 至 `/admin/learning-journey` | `/admin/learning-journey` | 舊書籤相容用途 |
| Learning Journey legacy UI | `/admin/english-test-tracking/legacy` | 封存頁 | `/admin/learning-journey` | 不再直接載入 legacy component |
| Learning Journey legacy route | `/admin/english-test-tracking` | redirect 至 `/admin/learning-journey` | `/admin/learning-journey` | 新查詢與正式報表以 Learning Journey 為主 |
| 培力英檢營運 | `/admin/english-test`、`/admin/english-test/import` | 保留營運入口 | Learning Journey 讀取其同步結果 | 報名審核與原始匯入仍需使用 |
| 舊問卷管理 | `/admin/surveys` | 封存頁 | `/admin/survey-center`、`/admin/survey-rules` | 不再作正式管理入口 |
| 舊問卷設定 | `/admin/survey-settings` | 封存頁 | `/admin/survey-rules` | 新規則不得只寫 legacy settings |
| 問卷模組 | `/admin/survey-module` | 保留 | `/admin/survey-center` 搭配規則/健康檢查 | 若後續整併，再另案下線 |

## 2. 後端 API 狀態

| API | 目前狀態 | 替代 API / 模組 | Sunset / P9 行為 |
|-----|----------|-----------------|---------|
| `/api/english-tests/*` | deprecated，歷史學期 read/write 維運；canonical-required 學期禁止寫入 | `/api/v3/learning-journey/*` | Sunset target：2026-06-30；寫入受 P8 canonical policy 限制 |
| `/api/admin/english-tests/*` | deprecated admin API，仍可用於過渡總覽/重建 | `/api/v3/learning-journey/*` | Sunset target：TBD；canonical-required 學期禁止寫入 |
| `/api/surveys/config` | 已 410 | `/api/surveys/public/:surveyKey`、Survey Center | Sunset：2026-04-27；回 `410 Gone` |
| `/api/surveys/:surveyId` | deprecated 相容提交路徑 | `/api/surveys/public/:surveyKey/responses` | Sunset target：2026-06-30；寫入會記錄 `legacy_write` |
| `/api/surveys/check/:surveyId/:studentId` | read-only deprecated 舊檢查路徑 | Survey Center / published survey 狀態 | Sunset target：2026-06-30；暫保留 read-only |
| `/api/surveys/stats/:surveyId` | read-only deprecated 舊統計路徑 | `/api/admin/surveys/analytics/*` 或 Survey Center 統計 | Sunset target：2026-06-30；暫保留 read-only |
| `/api/surveys/export/:surveyId` | read-only deprecated 舊匯出路徑 | Survey Center / Responses export | Sunset target：2026-06-30；暫保留 read-only |
| `/api/v3/learning-journey/admin/legacy-usage-audit` | P9 usage audit report | Governance / Audit logs | 用於最終移除前依賴確認 |

## 3. 下線門檻

正式移除任何 legacy UI/API 前，需同時滿足：

1. Learning Journey v3 read model 已通過 P4/P5 上線檢查。
2. `docs/data-source-of-truth.md` 中對應資料領域已確認權威來源。
3. 最近一輪 reconciliation 無阻擋性 error，或已記錄允收原因。
4. 上線治理總覽 `status` 非 `error` / `unknown`。
5. 已完成操作公告，並確認沒有使用者仍依賴舊書籤或舊 API。
6. 已保留必要匯出、備份或 audit trail。

## 4. 操作原則

- 新功能不得新增對 legacy `et_*`、`surveys.json` 或 legacy survey response tables 的寫入依賴。
- Legacy API 可保留讀取與 fallback，但不得作為正式總覽/report 的唯一資料來源。
- 若正式頁面與 legacy 頁面數字不一致，先以 source of truth、sync log、reconciliation 結果判讀，不直接以 UI 數字互相比對下結論。
- P6 後高風險 legacy write 應可在 `system_logs` 以 `legacy_write` 追蹤；Learning Journey fallback 應可在治理總覽看到 `fallbackUsage`。
- P9 後已 sunset 的 API 應以 `410 Gone` 回應，並在 `system_logs` 以 `legacy_gone` 追蹤。
- 最終移除前需先執行 `GET /api/v3/learning-journey/admin/legacy-usage-audit?days=30`，確認無未處理依賴。

## 5. P9 Future Removal Order

1. 已 410 且 30 天無 usage：`/api/surveys/config`。
2. 封存頁 30 天無直接 hit：`/admin/surveys`、`/admin/survey-settings`、`/admin/english-test-tracking/legacy`。
3. canonical-required 新學期穩定後：legacy survey submit 與 legacy survey check。
4. 所有新學期 canonical-only 後：`/api/english-tests/*` 寫入端。

## 6. P10 Launch Decision Documents

正式上線與下一批 410 決策需參考：

- 正式上線驗收報告：`docs/learning-journey-p10-production-launch-report.md`
- Legacy usage audit 與下一批 410 決策：`docs/learning-journey-p10-legacy-audit-410-decision.md`
- 管理者操作手冊：`docs/learning-journey-admin-operations-manual.md`
- 資料匯入 SOP：`docs/learning-journey-data-import-sop.md`

下一批 410 僅能在 usage audit 連續觀察期無高風險使用後執行。若仍有未知 client、canonical-required 學期 legacy write 嘗試、或新學期 Learning Journey fallback，需暫緩。
