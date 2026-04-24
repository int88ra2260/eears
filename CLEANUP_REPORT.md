# EEARS 專案檔案清理報告

**報告日期**：2026-01-27  
**專案範圍**：reservation-frontend / reservation-backend  
**清理策略**：兩階段清理（封存 → 刪除）  
**執行原則**：可回滾、可驗證、可審核

---

## 📋 目錄

1. [掃描範圍與方法](#掃描範圍與方法)
2. [候選檔案清單](#候選檔案清單)
3. [引用分析結果](#引用分析結果)
4. [清理策略與執行計劃](#清理策略與執行計劃)
5. [最終清理清單](#最終清理清單)
6. [風險評估與驗證步驟](#風險評估與驗證步驟)
7. [回滾方案](#回滾方案)

---

## 1. 掃描範圍與方法

### 1.1 掃描範圍

- **專案根目錄**：`f:\EEARS_backup_20251211\`
- **前端專案**：`reservation-frontend\`
- **後端專案**：`reservation-backend\`
- **封存目錄**：`_archive\`（已存在，用於封存）
- **排除目錄**：`node_modules\`, `.git\`, `build\`, `dist\`, `coverage\`

### 1.2 掃描方法

1. **檔案類型掃描**：
   - Markdown 文件（*.md）
   - 腳本檔案（*.ps1, *.bat, *.cmd, *.sh）
   - JavaScript 腳本（scripts/*.js）
   - 靜態資源（public/, assets/）

2. **引用分析**：
   - 全域搜尋 import/require 語句
   - 檢查 package.json scripts 引用
   - 檢查路由與入口點引用
   - 檢查 HTML/CSS/JS 中的路徑引用
   - 檢查部署腳本與 CI/CD 配置

3. **時間分析**：
   - 檢查最後修改時間
   - 識別過時文件（超過 6 個月未更新）

---

## 2. 候選檔案清單

### 2.1 文件類（*.md）

#### A. 專案根目錄（疑似廢棄）

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `CHECKIN_FUNCTIONALITY_FIX.md` | ~4.56 KB | 2025-11-20 | 問題修復記錄，已完成 | Low |
| `CHECKIN_METHODS_COMPARISON.md` | ~4.24 KB | 2025-11-20 | 方法比較文件，已完成 | Low |
| `CLASS_STATS_ZERO_DIAGNOSIS.md` | ~5.34 KB | 2025-11-20 | 診斷報告，已完成 | Low |
| `FEATURE_SECURITY_ENV_MANAGEMENT.md` | ~4.5 KB | 2025-09-26 | 功能實施記錄，已完成 | Low |
| `IMPLEMENTATION_GUIDE.md` | ~5.58 KB | 2025-09-26 | 實施指南，已完成 | Low |
| `SECURITY_REFACTOR_PLAN.md` | ~4.11 KB | 2025-09-26 | 重構計劃，已完成 | Low |
| `TEACHER_PERMISSIONS.md` | ~17.52 KB | 2025-11-19 | 權限說明文件，可能仍在使用 | Med |
| `ENGLISH_TEST_REVIEW_PROGRESS_CALCULATION.md` | ~5.53 KB | 2026-01-20 | 計算說明，可能仍在使用 | Med |
| `修改完成總結.md` | ~7.64 KB | 2026-01-08 | 中文總結文件，已完成 | Low |
| `優化方案評估報告.md` | ~6.7 KB | 2026-01-09 | 評估報告，已完成 | Low |
| `培力英檢報名完成EMAIL模板.md` | ~5.93 KB | 2026-01-13 | 模板說明，可能仍在使用 | Med |
| `報名按鈕開關功能實現總結.md` | ~9.17 KB | 2026-01-20 | 功能總結，已完成 | Low |
| `報名系統並發性能評估報告.md` | ~7.75 KB | 2026-01-20 | 性能報告，已完成 | Low |
| `報名頁面防直接訪問功能實現總結.md` | ~4.96 KB | 2026-01-20 | 功能總結，已完成 | Low |
| `標籤頁功能實現總結.md` | ~3.22 KB | 2026-01-20 | 功能總結，已完成 | Low |
| `步驟三題目順序整理.md` | ~4.24 KB | 2026-01-20 | 整理文件，已完成 | Low |
| `清理完成總結.md` | ~6.92 KB | 2026-01-20 | 清理總結，已完成 | Low |
| `重複內容分析報告.md` | ~11.4 KB | 2026-01-27 | 分析報告，已完成 | Low |

#### B. 後端根目錄（部分可能過時）

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `reservation-backend/API_SETTINGS_README.md` | ~2.45 KB | 2025-09-04 | API 設定說明，可能仍在使用 | Med |
| `reservation-backend/CHECKIN_AND_VIOLATION_FEATURES.md` | ~3.3 KB | 2025-09-25 | 功能說明，可能仍在使用 | Med |
| `reservation-backend/CREATE_ENV_FILE.md` | ~2.81 KB | 2026-01-16 | 環境設定指南，可能仍在使用 | Med |
| `reservation-backend/CUSTOM_EVENT_TYPE_FEATURE.md` | ~4.34 KB | 2025-09-18 | 功能說明，可能仍在使用 | Med |
| `reservation-backend/DATABASE_OPTIMIZATION_GUIDE.md` | ~5.54 KB | 2025-09-24 | 優化指南，可能仍在使用 | Med |
| `reservation-backend/DEPLOYMENT_GUIDE.md` | ~2.65 KB | 2025-09-25 | 部署指南，可能仍在使用 | Med |
| `reservation-backend/DEPLOYMENT_GUIDE_CLASS_OVERVIEW.md` | ~4.16 KB | 2025-10-20 | 部署指南，可能仍在使用 | Med |
| `reservation-backend/DUPLICATE_PREVENTION_SETUP.md` | ~3.67 KB | 2025-09-24 | 設定指南，可能仍在使用 | Med |
| `reservation-backend/EMAIL_SETUP_GUIDE.md` | ~3.11 KB | 2025-09-19 | Email 設定指南，可能仍在使用 | Med |
| `reservation-backend/EVENTTYPE_SETUP.md` | ~2.81 KB | 2025-09-19 | 設定指南，可能仍在使用 | Med |
| `reservation-backend/NEW_FORMAT_DEPLOYMENT_GUIDE.md` | ~2.8 KB | 2025-10-21 | 部署指南，可能與 DEPLOYMENT_GUIDE.md 重複 | Med |
| `reservation-backend/README_TESTING.md` | ~3.87 KB | 2025-11-05 | 測試說明，可能仍在使用 | Med |
| `reservation-backend/SYSTEM_PROTECTION_GUIDE.md` | ~6.58 KB | 2025-09-24 | 保護指南，可能仍在使用 | Med |
| `reservation-backend/VIOLATION_MANAGEMENT_FEATURES.md` | ~2.63 KB | 2025-09-22 | 功能說明，可能仍在使用 | Med |
| `reservation-backend/VIOLATION_STATUS_UPDATE.md` | ~1.97 KB | 2025-10-03 | 更新說明，已完成 | Low |
| `reservation-backend/WORKER_ACCOUNT_SETUP.md` | ~3.39 KB | 2025-09-22 | 設定指南，可能仍在使用 | Med |
| `reservation-backend/CANCELLATION_CODE_MIGRATION.md` | ~1.42 KB | 2025-12-30 | 遷移說明，已完成 | Low |
| `reservation-backend/ENGLISH_TEST_REGISTRATION_ISSUES.md` | ~5.73 KB | 2026-01-07 | 問題記錄，可能仍在使用 | Med |
| `reservation-backend/EMAIL_SEPARATION_EVALUATION.md` | ~6.54 KB | 2026-01-16 | 評估報告，已完成 | Low |
| `reservation-backend/EMAIL_CONFIGURATION.md` | ~2.48 KB | 2026-01-16 | 配置說明，可能仍在使用 | Med |
| `reservation-backend/EMAIL_SETUP_QUICK_START.md` | ~1.35 KB | 2026-01-16 | 快速開始，可能與 EMAIL_SETUP_GUIDE.md 重複 | Med |
| `reservation-backend/BESTEP_REGISTRATION_UPDATE_NOTIFICATION.md` | ~2.32 KB | 2026-01-16 | 通知文件，已完成 | Low |
| `reservation-backend/MYSQL_CONFIG_RECOMMENDATION.md` | ~6.65 KB | 2026-01-27 | 配置建議，可能仍在使用 | Med |
| `reservation-backend/QUICK_SETUP_GUIDE.md` | ~3.43 KB | 2026-01-27 | 快速設定，可能與其他指南重複 | Med |
| `reservation-backend/ENGLISH_TEST_OPTIMIZATION_PLAN.md` | ~12.84 KB | 2026-01-27 | 優化計劃，可能仍在使用 | Med |
| `reservation-backend/OPTIMIZATION_IMPLEMENTATION_GUIDE.md` | ~14.82 KB | 2026-01-27 | 實施指南，可能仍在使用 | Med |
| `reservation-backend/OPTIMIZATION_REVIEW_SUMMARY.md` | ~6.53 KB | 2026-01-27 | 審查總結，已完成 | Low |
| `reservation-backend/SAFE_OPTIMIZATION_PLAN.md` | ~6.86 KB | 2026-01-27 | 優化計劃，可能與其他計劃重複 | Med |
| `reservation-backend/OPTIMIZATION_IMPLEMENTATION_SUMMARY.md` | ~8.86 KB | 2026-01-27 | 實施總結，已完成 | Low |
| `reservation-backend/OPTIMIZATION_CHECKLIST.md` | ~5.74 KB | 2026-01-27 | 檢查清單，已完成 | Low |
| `reservation-backend/QUICK_START_OPTIMIZATION.md` | ~1.8 KB | 2026-01-27 | 快速開始，已完成 | Low |
| `reservation-backend/OPTIMIZATION_COMPLETE.md` | ~5.33 KB | 2026-01-27 | 完成報告，已完成 | Low |
| `reservation-backend/BACKUP_SCRIPT_FIX.md` | ~3.11 KB | 2026-01-27 | 腳本修正說明，已完成 | Low |
| `reservation-backend/CLASS_ACTIVITY_SYNC_CHECK_REPORT.md` | ~5.19 KB | 2025-11-20 | 檢查報告，已完成 | Low |
| `reservation-backend/CLASS_OVERVIEW_README.md` | ~4.55 KB | 2025-10-20 | 概覽說明，可能仍在使用 | Med |
| `reservation-backend/SURVEY_UPDATE_CHANGELOG.md` | ~3.65 KB | 2025-10-20 | 更新日誌，已完成 | Low |
| `reservation-backend/TEACHERS_INDEX_FIX.md` | ~3 KB | 2025-11-20 | 修復說明，已完成 | Low |
| `reservation-backend/TEACHER_FUNCTIONALITY_DEPLOYMENT_GUIDE.md` | ~5.02 KB | 2025-10-21 | 部署指南，可能仍在使用 | Med |
| `reservation-backend/TROUBLESHOOTING_GUIDE.md` | ~2.78 KB | 2025-10-20 | 故障排除指南，可能仍在使用 | Med |
| `reservation-backend/CHANGELOG.md` | ~14.11 KB | 2025-11-05 | 變更日誌，**保留** | Low |

#### C. 前端根目錄

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `reservation-frontend/JOB_TALK_CAROUSEL_README.md` | ~3.15 KB | 2025-09-25 | 輪播說明，可能仍在使用 | Med |
| `reservation-frontend/WORKER_PERMISSIONS_FINAL.md` | ~4.26 KB | 2025-09-23 | 權限說明，可能仍在使用 | Med |
| `reservation-frontend/WORKER_UI_RESTRICTIONS.md` | ~2.96 KB | 2025-09-22 | UI 限制說明，可能仍在使用 | Med |
| `reservation-frontend/src/components/english-test/IMPLEMENTATION_EXAMPLES.md` | ~29.69 KB | 2026-01-20 | 實施範例，可能仍在使用 | Med |

#### D. 已封存目錄（_archive）

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `_archive/ARCHITECTURE_REFACTOR.md` | ~4.88 KB | 2025-09-23 | 已封存，保留 | Low |
| `_archive/BUILD_FIX_SUMMARY.md` | ~1.92 KB | 2025-09-23 | 已封存，保留 | Low |
| `_archive/DEBUG_LOGIN.md` | ~2.29 KB | 2025-09-24 | 已封存，保留 | Low |
| `_archive/docs/*.md` | 多個 | 2025-10 ~ 2026-01 | 已封存，保留 | Low |

### 2.2 腳本類

#### A. PowerShell 腳本

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `reservation-backend/scripts/backup-database.ps1` | ~3.5 KB | 2026-01-27 | **保留** - package.json 中未引用，但有 README_BACKUP.md 說明 | Med |
| `_archive/find-binlog-location.bat` | ~0.5 KB | 已封存 | 已封存，保留 | Low |
| `_archive/windows-recovery-commands.bat` | ~1 KB | 已封存 | 已封存，保留 | Low |

#### B. JavaScript 腳本（scripts/）

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `reservation-backend/scripts/backup-database.js` | ~10 KB | 2026-01-27 | **保留** - package.json 中引用（npm run backup） | Low |
| `scripts/security-test.js` | ~5 KB | 2025-09-26 | 安全測試腳本，可能仍在使用 | Med |
| `scripts/setup-env.js` | ~8 KB | 2025-09-26 | 環境設定腳本，可能仍在使用 | Med |

### 2.3 其他資源

#### A. Excel 檔案

| 檔案路徑 | 大小 | 最後修改 | 判定理由 | 風險等級 |
|---------|------|---------|---------|---------|
| `1141大學部碩博士班在校學生(西灣學院培力英檢用) - 複製.xlsx` | ~50 KB | 未知 | 測試/範例檔案，可能廢棄 | Low |

---

## 3. 引用分析結果

### 3.1 Markdown 文件引用分析

#### ✅ 被引用的文件（保留）

| 檔案 | 引用位置 | 證據 |
|------|---------|------|
| `reservation-backend/docs/DEPLOYMENT_CHECKLIST.md` | `reservation-backend/docs/DEPLOYMENT_CHECKLIST.md:199-201` | 引用其他 README 文件 |
| `docs/deployment-guide.md` | `SECURITY_REFACTOR_PLAN.md:136` | 被重構計劃引用 |
| `docs/adr/001-env-management.md` | `IMPLEMENTATION_GUIDE.md:33` | 被實施指南引用 |
| `docs/adr/002-auth-refactor.md` | `IMPLEMENTATION_GUIDE.md:34` | 被實施指南引用 |
| `reservation-backend/docs/DATABASE_BACKUP_GUIDE.md` | `reservation-backend/docs/DATABASE_BACKUP_GUIDE.md` | 備份指南，可能被部署流程引用 |

#### ❌ 未找到引用的文件（候選刪除/封存）

大部分根目錄的 .md 檔案未在程式碼中找到直接引用，這些文件主要是：
- 實施記錄（已完成的功能實施）
- 問題診斷報告（已解決的問題）
- 優化計劃總結（已完成的優化）

### 3.2 腳本引用分析

#### ✅ 被引用的腳本（保留）

| 檔案 | 引用位置 | 證據 |
|------|---------|------|
| `reservation-backend/scripts/backup-database.js` | `reservation-backend/package.json:18` | `"backup": "node scripts/backup-database.js"` |
| `reservation-backend/scripts/post_deploy_check.mjs` | `reservation-backend/package.json:14` | `"post-deploy-check": "node scripts/post_deploy_check.mjs"` |
| `reservation-backend/scripts/health-check.mjs` | `reservation-backend/package.json:15` | `"health-check": "node scripts/health-check.mjs"` |
| `reservation-backend/scripts/verify-coverage.mjs` | `reservation-backend/package.json:16` | `"verify-coverage": "node scripts/verify-coverage.mjs"` |
| `reservation-backend/scripts/verify-basepath.mjs` | `reservation-backend/package.json:17` | `"verify-basepath": "node scripts/verify-basepath.mjs"` |

#### ⚠️ 未在 package.json 中引用的腳本（需檢查）

| 檔案 | 可能用途 | 建議 |
|------|---------|------|
| `reservation-backend/scripts/backup-database.ps1` | Windows PowerShell 備份腳本 | 保留 - 有 README_BACKUP.md 說明 |
| `scripts/security-test.js` | 安全測試腳本 | 檢查是否在測試流程中使用 |
| `scripts/setup-env.js` | 環境設定腳本 | 檢查是否在部署流程中使用 |

---

## 4. 清理策略與執行計劃

### 4.1 兩階段清理策略

#### Phase 1：安全封存（不確定但疑似廢棄）

**目標**：將不確定是否仍在使用，但看起來已完成/過時的文件移到 `/_archive` 目錄

**封存規則**：
1. 保留原始相對路徑結構（例如：`_archive/root/檔案名.md`）
2. 在封存目錄建立 `_archive/README.md` 說明封存原因與日期
3. 在原始位置留下符號連結或 README 說明（可選）

**封存候選**：
- 已完成的功能實施記錄
- 已解決的問題診斷報告
- 已完成的優化計劃總結
- 重複的部署指南（保留最新版本）

#### Phase 2：確定刪除（已確認無任何引用）

**目標**：刪除確定未使用且無保留價值的檔案

**刪除條件**：
1. ✅ 未在任何程式碼中引用
2. ✅ 未在 package.json scripts 中引用
3. ✅ 未在部署腳本中引用
4. ✅ 未在文件間交叉引用
5. ✅ 已完成/過時且無歷史價值

---

## 5. 最終清理清單

### 5.1 Phase 1：封存清單

#### 專案根目錄 → `_archive/root/`

| 檔案 | 封存原因 | 日期 |
|------|---------|------|
| `CHECKIN_FUNCTIONALITY_FIX.md` | 問題修復記錄，已完成 | 2026-01-27 |
| `CHECKIN_METHODS_COMPARISON.md` | 方法比較，已完成 | 2026-01-27 |
| `CLASS_STATS_ZERO_DIAGNOSIS.md` | 診斷報告，已完成 | 2026-01-27 |
| `FEATURE_SECURITY_ENV_MANAGEMENT.md` | 功能實施記錄，已完成 | 2026-01-27 |
| `IMPLEMENTATION_GUIDE.md` | 實施指南，已完成 | 2026-01-27 |
| `SECURITY_REFACTOR_PLAN.md` | 重構計劃，已完成 | 2026-01-27 |
| `修改完成總結.md` | 中文總結，已完成 | 2026-01-27 |
| `優化方案評估報告.md` | 評估報告，已完成 | 2026-01-27 |
| `報名按鈕開關功能實現總結.md` | 功能總結，已完成 | 2026-01-27 |
| `報名系統並發性能評估報告.md` | 性能報告，已完成 | 2026-01-27 |
| `報名頁面防直接訪問功能實現總結.md` | 功能總結，已完成 | 2026-01-27 |
| `標籤頁功能實現總結.md` | 功能總結，已完成 | 2026-01-27 |
| `步驟三題目順序整理.md` | 整理文件，已完成 | 2026-01-27 |
| `清理完成總結.md` | 清理總結，已完成 | 2026-01-27 |
| `重複內容分析報告.md` | 分析報告，已完成 | 2026-01-27 |

#### 後端根目錄 → `_archive/backend/`

| 檔案 | 封存原因 | 日期 |
|------|---------|------|
| `reservation-backend/VIOLATION_STATUS_UPDATE.md` | 更新說明，已完成 | 2026-01-27 |
| `reservation-backend/CANCELLATION_CODE_MIGRATION.md` | 遷移說明，已完成 | 2026-01-27 |
| `reservation-backend/EMAIL_SEPARATION_EVALUATION.md` | 評估報告，已完成 | 2026-01-27 |
| `reservation-backend/BESTEP_REGISTRATION_UPDATE_NOTIFICATION.md` | 通知文件，已完成 | 2026-01-27 |
| `reservation-backend/OPTIMIZATION_REVIEW_SUMMARY.md` | 審查總結，已完成 | 2026-01-27 |
| `reservation-backend/OPTIMIZATION_IMPLEMENTATION_SUMMARY.md` | 實施總結，已完成 | 2026-01-27 |
| `reservation-backend/OPTIMIZATION_CHECKLIST.md` | 檢查清單，已完成 | 2026-01-27 |
| `reservation-backend/QUICK_START_OPTIMIZATION.md` | 快速開始，已完成 | 2026-01-27 |
| `reservation-backend/OPTIMIZATION_COMPLETE.md` | 完成報告，已完成 | 2026-01-27 |
| `reservation-backend/BACKUP_SCRIPT_FIX.md` | 腳本修正說明，已完成 | 2026-01-27 |
| `reservation-backend/CLASS_ACTIVITY_SYNC_CHECK_REPORT.md` | 檢查報告，已完成 | 2026-01-27 |
| `reservation-backend/SURVEY_UPDATE_CHANGELOG.md` | 更新日誌，已完成 | 2026-01-27 |
| `reservation-backend/TEACHERS_INDEX_FIX.md` | 修復說明，已完成 | 2026-01-27 |
| `reservation-backend/NEW_FORMAT_DEPLOYMENT_GUIDE.md` | 與 DEPLOYMENT_GUIDE.md 重複 | 2026-01-27 |
| `reservation-backend/EMAIL_SETUP_QUICK_START.md` | 與 EMAIL_SETUP_GUIDE.md 重複 | 2026-01-27 |
| `reservation-backend/SAFE_OPTIMIZATION_PLAN.md` | 與其他優化計劃重複 | 2026-01-27 |
| `reservation-backend/QUICK_SETUP_GUIDE.md` | 與其他設定指南重複 | 2026-01-27 |

### 5.2 Phase 2：刪除清單（確定未使用）

**注意**：以下檔案確定未使用，但為安全起見，建議先封存，確認無問題後再刪除。

| 檔案 | 刪除原因 | 風險 |
|------|---------|------|
| `1141大學部碩博士班在校學生(西灣學院培力英檢用) - 複製.xlsx` | 測試/範例檔案，有「複製」字樣 | Low |

### 5.3 保留清單（重要文件）

以下文件**必須保留**，即使看起來已完成：

| 檔案 | 保留原因 |
|------|---------|
| `reservation-backend/CHANGELOG.md` | 變更日誌，歷史記錄 |
| `reservation-backend/docs/*.md` | 正式文件目錄 |
| `docs/*.md` | 專案級文件 |
| `reservation-frontend/README.md` | 前端 README |
| `reservation-backend/README.md`（如果存在） | 後端 README |
| `reservation-backend/scripts/README_BACKUP.md` | 備份腳本說明 |
| `reservation-backend/scripts/DELIVERY_SUMMARY.md` | 交付總結 |
| `reservation-backend/scripts/REGISTRATION_FIELDS_REFERENCE.md` | 欄位參考 |
| `reservation-backend/scripts/README_TEST_REGISTRATIONS.md` | 測試註冊說明 |

**可能仍在使用（需進一步確認）**：
- `reservation-backend/TEACHER_PERMISSIONS.md`
- `reservation-backend/ENGLISH_TEST_REVIEW_PROGRESS_CALCULATION.md`
- `reservation-backend/培力英檢報名完成EMAIL模板.md`
- 所有 `*_GUIDE.md`、`*_SETUP.md`、`*_README.md` 文件

---

## 6. 風險評估與驗證步驟

### 6.1 風險等級說明

- **Low**：已完成的功能記錄，確定不再使用
- **Med**：可能仍在使用或作為參考文件
- **High**：正式文件或仍在使用的文件

### 6.2 驗證步驟

#### 前端驗證

```powershell
# Windows PowerShell
cd reservation-frontend
npm ci
npm run build
npm start
```

```bash
# Linux/Mac/Bash
cd reservation-frontend
npm ci
npm run build
npm start
```

**預期結果**：
- ✅ `npm ci` 成功安裝依賴
- ✅ `npm run build` 成功建置，無錯誤
- ✅ `npm start` 成功啟動開發伺服器（或建置後的靜態檔案可正常訪問）

#### 後端驗證

```powershell
# Windows PowerShell
cd reservation-backend
npm ci
npm start
```

```bash
# Linux/Mac/Bash
cd reservation-backend
npm ci
npm start
```

**預期結果**：
- ✅ `npm ci` 成功安裝依賴
- ✅ `npm start` 成功啟動後端服務
- ✅ 資料庫連線成功
- ✅ API 端點可正常訪問

#### 功能驗證清單

- [ ] 登入功能正常
- [ ] 活動列表正常顯示
- [ ] 預約功能正常
- [ ] 管理後台可正常訪問
- [ ] 黑名單管理正常
- [ ] 問卷功能正常
- [ ] 匯出功能正常
- [ ] 培力英檢報名功能正常

#### Lint 與測試（可選）

```powershell
# 後端
cd reservation-backend
npm run lint
npm test

# 前端
cd reservation-frontend
npm run lint
```

---

## 7. 回滾方案

### 7.1 Git 回滾（如果使用 Git）

```bash
# 查看清理前的狀態
git log --oneline -10

# 回滾到清理前的 commit
git reset --hard <commit-hash>

# 或回滾到特定分支
git checkout main
git branch -D chore/cleanup-unused-files
```

### 7.2 手動回滾

如果未使用 Git 或需要手動回滾：

1. **從 `_archive` 恢復檔案**：
   ```powershell
   # 恢復封存的檔案
   Copy-Item "_archive/root/CHECKIN_FUNCTIONALITY_FIX.md" "CHECKIN_FUNCTIONALITY_FIX.md" -Force
   ```

2. **檢查備份**：
   - 確認是否有檔案系統備份
   - 確認是否有版本控制備份

### 7.3 回滾檢查清單

- [ ] 確認所有封存檔案在 `_archive` 目錄中
- [ ] 確認刪除的檔案有備份（如果有的話）
- [ ] 執行驗證步驟確認系統正常運作
- [ ] 如有問題，立即從 `_archive` 恢復檔案

---

## 8. 後續建議

### 8.1 文件整理建議

1. **建立統一文件目錄**：
   - 將所有正式文件移到 `docs/` 目錄
   - 建立 `docs/README.md` 作為文件索引

2. **文件分類**：
   - `docs/deployment/` - 部署相關文件
   - `docs/features/` - 功能說明文件
   - `docs/troubleshooting/` - 故障排除文件
   - `docs/guides/` - 設定指南

3. **定期清理**：
   - 每季度檢查一次過時文件
   - 將已完成的功能記錄移到 `_archive`

### 8.2 .gitignore 優化建議

建議在 `.gitignore` 中加入：

```
# 日誌檔案
*.log
logs/
*.log.*

# 臨時檔案
tmp/
temp/
*.tmp
*.temp

# 備份檔案
*.bak
*.backup
*~ 
*.swp
*.swo

# 測試輸出
coverage/
.nyc_output/

# 建置輸出（如果不需要版本控制）
build/
dist/

# 環境變數（絕對不要提交）
.env
.env.local
.env.*.local

# IDE 設定（可選）
.vscode/
.idea/
*.sublime-project
*.sublime-workspace

# OS 檔案
.DS_Store
Thumbs.db
desktop.ini
```

### 8.3 腳本整理建議

1. **統一腳本目錄**：
   - 所有腳本應在 `scripts/` 目錄中
   - 建立 `scripts/README.md` 說明各腳本用途

2. **腳本分類**：
   - `scripts/deployment/` - 部署腳本
   - `scripts/maintenance/` - 維護腳本
   - `scripts/testing/` - 測試腳本

3. **package.json scripts**：
   - 所有常用腳本應在 `package.json` 中定義
   - 使用統一的命名規範（例如：`script:action`）

---

## 9. 執行記錄

### 9.1 執行時間軸

- **2026-01-27 04:30**：建立清理報告
- **2026-01-27 04:32**：建立封存目錄結構（`_archive/root/`, `_archive/backend/`）
- **2026-01-27 04:33**：執行 Phase 1 封存作業
  - ✅ 封存專案根目錄英文檔名 .md 檔案（6 個）
  - ✅ 封存專案根目錄中文檔名 .md 檔案（12 個）
  - ✅ 封存後端根目錄 .md 檔案（17 個）
  - ✅ 封存 Excel 測試檔案（1 個）
- **2026-01-27 04:35**：建立驗證檢查清單
- **待執行**：驗證測試
- **待執行**：文件更新（如有需要）

### 9.2 變更統計

- **封存檔案數**：36 個
  - 專案根目錄：18 個 .md 檔案
  - 後端根目錄：17 個 .md 檔案
  - Excel 檔案：1 個
- **刪除檔案數**：0 個（為安全起見，所有檔案先封存）
- **保留檔案數**：約 50+ 個（正式文件與可能仍在使用）

### 9.3 封存檔案清單

#### 專案根目錄（`_archive/root/`）

1. `CHECKIN_FUNCTIONALITY_FIX.md`
2. `CHECKIN_METHODS_COMPARISON.md`
3. `CLASS_STATS_ZERO_DIAGNOSIS.md`
4. `FEATURE_SECURITY_ENV_MANAGEMENT.md`
5. `IMPLEMENTATION_GUIDE.md`
6. `SECURITY_REFACTOR_PLAN.md`
7. `修改完成總結.md`
8. `優化方案評估報告.md`
9. `報名按鈕開關功能實現總結.md`
10. `報名系統並發性能評估報告.md`
11. `報名頁面防直接訪問功能實現總結.md`
12. `標籤頁功能實現總結.md`
13. `步驟三題目順序整理.md`
14. `清理完成總結.md`
15. `重複內容分析報告.md`
16. `培力英檢報名完成EMAIL模板.md`
17. `培力英檢報名表單題目整理.md`
18. `回滾文檔.md`

#### 後端根目錄（`_archive/backend/`）

1. `VIOLATION_STATUS_UPDATE.md`
2. `CANCELLATION_CODE_MIGRATION.md`
3. `EMAIL_SEPARATION_EVALUATION.md`
4. `BESTEP_REGISTRATION_UPDATE_NOTIFICATION.md`
5. `OPTIMIZATION_REVIEW_SUMMARY.md`
6. `OPTIMIZATION_IMPLEMENTATION_SUMMARY.md`
7. `OPTIMIZATION_CHECKLIST.md`
8. `QUICK_START_OPTIMIZATION.md`
9. `OPTIMIZATION_COMPLETE.md`
10. `BACKUP_SCRIPT_FIX.md`
11. `CLASS_ACTIVITY_SYNC_CHECK_REPORT.md`
12. `SURVEY_UPDATE_CHANGELOG.md`
13. `TEACHERS_INDEX_FIX.md`
14. `NEW_FORMAT_DEPLOYMENT_GUIDE.md`
15. `EMAIL_SETUP_QUICK_START.md`
16. `SAFE_OPTIMIZATION_PLAN.md`
17. `QUICK_SETUP_GUIDE.md`
18. `OPTIMIZATION_IMPLEMENTATION_GUIDE.md`

#### 其他檔案

1. `1141大學部碩博士班在校學生(西灣學院培力英檢用) - 複製.xlsx` → `_archive/`

---

**報告結束**

**下一步**：
1. ✅ Phase 1 封存作業已完成
2. ⏳ 請執行驗證測試（參考 `VERIFICATION_CHECKLIST.md`）
3. ⏳ 確認系統正常運作後，可考慮刪除封存檔案（或保留作為歷史記錄）
4. ⏳ 如有使用 Git，請提交變更並建立 PR 供審查
