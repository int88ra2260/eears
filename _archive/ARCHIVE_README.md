# 封存目錄說明

**建立日期**：2026-01-27  
**清理原因**：專案檔案清理，移除已完成/過時的文件

---

## 目錄結構

- `_archive/root/` - 專案根目錄的封存檔案
- `_archive/backend/` - 後端專案根目錄的封存檔案
- `_archive/docs/` - 已封存的文件（之前已存在）
- `_archive/scripts/` - 已封存的腳本（之前已存在）

---

## 封存原則

1. **已完成的功能記錄**：功能已實施完成，記錄保留作為歷史參考
2. **已解決的問題報告**：問題已解決，報告保留作為參考
3. **重複的文件**：保留最新版本，舊版本封存
4. **過時的優化計劃**：優化已完成，計劃文件封存

---

## 恢復方式

如需恢復封存的檔案：

```powershell
# 恢復單一檔案
Copy-Item "_archive/root/檔案名.md" "檔案名.md" -Force

# 恢復整個目錄
Copy-Item "_archive/root/*" "." -Force
```

---

## 封存檔案清單

### 專案根目錄（_archive/root/）

- `CHECKIN_FUNCTIONALITY_FIX.md` - 簽到功能修復記錄（2025-11-20）
- `CHECKIN_METHODS_COMPARISON.md` - 簽到方法比較（2025-11-20）
- `CLASS_STATS_ZERO_DIAGNOSIS.md` - 班級統計診斷報告（2025-11-20）
- `FEATURE_SECURITY_ENV_MANAGEMENT.md` - 安全環境管理功能記錄（2025-09-26）
- `IMPLEMENTATION_GUIDE.md` - 實施指南（2025-09-26）
- `SECURITY_REFACTOR_PLAN.md` - 安全重構計劃（2025-09-26）
- `修改完成總結.md` - 修改完成總結（2026-01-08）
- `優化方案評估報告.md` - 優化方案評估（2026-01-09）
- `報名按鈕開關功能實現總結.md` - 報名按鈕功能總結（2026-01-20）
- `報名系統並發性能評估報告.md` - 並發性能評估（2026-01-20）
- `報名頁面防直接訪問功能實現總結.md` - 防直接訪問功能總結（2026-01-20）
- `標籤頁功能實現總結.md` - 標籤頁功能總結（2026-01-20）
- `步驟三題目順序整理.md` - 題目順序整理（2026-01-20）
- `清理完成總結.md` - 清理完成總結（2026-01-20）
- `重複內容分析報告.md` - 重複內容分析（2026-01-27）

### 後端根目錄（_archive/backend/）

- `VIOLATION_STATUS_UPDATE.md` - 違規狀態更新說明（2025-10-03）
- `CANCELLATION_CODE_MIGRATION.md` - 取消代碼遷移說明（2025-12-30）
- `EMAIL_SEPARATION_EVALUATION.md` - Email 分離評估（2026-01-16）
- `BESTEP_REGISTRATION_UPDATE_NOTIFICATION.md` - 註冊更新通知（2026-01-16）
- `OPTIMIZATION_REVIEW_SUMMARY.md` - 優化審查總結（2026-01-27）
- `OPTIMIZATION_IMPLEMENTATION_SUMMARY.md` - 優化實施總結（2026-01-27）
- `OPTIMIZATION_CHECKLIST.md` - 優化檢查清單（2026-01-27）
- `QUICK_START_OPTIMIZATION.md` - 快速開始優化（2026-01-27）
- `OPTIMIZATION_COMPLETE.md` - 優化完成報告（2026-01-27）
- `BACKUP_SCRIPT_FIX.md` - 備份腳本修正說明（2026-01-27）
- `CLASS_ACTIVITY_SYNC_CHECK_REPORT.md` - 班級活動同步檢查報告（2025-11-20）
- `SURVEY_UPDATE_CHANGELOG.md` - 問卷更新日誌（2025-10-20）
- `TEACHERS_INDEX_FIX.md` - 教師索引修復說明（2025-11-20）
- `NEW_FORMAT_DEPLOYMENT_GUIDE.md` - 新格式部署指南（與 DEPLOYMENT_GUIDE.md 重複）
- `EMAIL_SETUP_QUICK_START.md` - Email 設定快速開始（與 EMAIL_SETUP_GUIDE.md 重複）
- `SAFE_OPTIMIZATION_PLAN.md` - 安全優化計劃（與其他優化計劃重複）
- `QUICK_SETUP_GUIDE.md` - 快速設定指南（與其他設定指南重複）

---

**注意**：封存的檔案僅作為歷史參考，不會影響系統運作。如需恢復，請參考上述恢復方式。
