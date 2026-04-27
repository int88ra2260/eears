# Learning Journey Final UAT Implementation Report

## 已完成項目

- 已將「英語學習歷程中心」新 UI 的資料來源收斂到 `/api/admin/learning-journey/*`。
- 已確認 `reservation-frontend/src/pages/admin/LearningJourneyHubPage.jsx`、`reservation-frontend/src/pages/admin/LearningJourneyStudentPage.jsx`、`reservation-frontend/src/services/learningJourneyApi.js` 不再引用 `/api/english-tests`、`/api/admin/english-tests`、`englishTestService`、`getSemesterSummary`、`getSemesterStudents`、`getSemesterImportHistories` 或 `rebuildSemesterBestSkills`。
- 已實作 final Learning Journey API layer，支援學期總覽、學生名單、學生詳情、固定格式 Excel 匯入、匯入歷程與 final rebuild。
- 已以 active enrollment snapshot 作為 B2 報表唯一分母。
- 已以 canonical `exam_attempts` + `exam_attempt_skill_scores` 作為跨學期最佳 CEFR 計算來源。
- 已以 CEFR rank 判斷 B2+，不使用字串比較。
- 已將 B2 報表拆為聽力、閱讀、口說、寫作四技能，不輸出總達標率。
- 已實作外部英檢 `studentId + examDate + examType` 去重；同場內容相同略過，內容不同寫入 quarantine，不靜默覆蓋。
- 已在 API 層限制 Teacher 權限：Teacher 必須提供 `semesterId`，並只能查詢當學期 `classes.teacherName = req.user.name` 且存在於 `class_memberships` 的學生。
- 已新增 Learning Journey final 匯入歷程表，用於 UAT 診斷區顯示成功/部分成功匯入批次。
- 已更新 `docs/learning-journey-uat-checklist.md`，讓 UAT 項目反映 final 規格。

## API 清單

新 Learning Journey UI 使用下列 API：

- `GET /api/admin/learning-journey/semesters`
  - 取得可選學期清單。
- `GET /api/admin/learning-journey/semesters/:id/overview`
  - 取得學期總覽、四技能 B2+ KPI、年級統計、系所統計與系所 x 年級統計。
- `GET /api/admin/learning-journey/semesters/:id/students`
  - 取得該學期 active enrollment snapshot 內的學生列表。
  - 支援 `page`、`limit`、`offset`、`keyword`、`department`、`grade`、`skill`、`b2Plus`。
- `GET /api/admin/learning-journey/students/:studentId`
  - 取得學生完整 Learning Journey 詳情。
  - Admin 可選 `semesterId`；Teacher 必須帶 `semesterId`。
- `GET /api/admin/learning-journey/semesters/:id/import-histories`
  - 取得 final Learning Journey 匯入歷程與 quarantine/warning 摘要。
- `POST /api/admin/learning-journey/admin/enrollment-import/dry-run`
  - 在校生名單 Excel dry-run。
- `POST /api/admin/learning-journey/admin/enrollment-import/apply`
  - 在校生名單 Excel apply。
- `POST /api/admin/learning-journey/admin/external-exam-import/dry-run`
  - 外部英檢 Excel dry-run。
- `POST /api/admin/learning-journey/admin/external-exam-import/apply`
  - 外部英檢 Excel apply。
- `POST /api/admin/learning-journey/admin/rebuild-final`
  - 重新計算 final overview，供診斷區驗證目前 read model 狀態。

既有診斷 API 仍掛在相同 Learning Journey router 下：

- `GET /api/admin/learning-journey/admin/read-model-status`
- `GET /api/admin/learning-journey/admin/readiness`
- `GET /api/admin/learning-journey/admin/data-freshness`
- `GET /api/admin/learning-journey/semesters/:semesterId/risk-students`

## 修改檔案清單

本功能相關修改：

- `docs/learning-journey-uat-checklist.md`
- `docs/learning-journey-final-uat-implementation-report.md`
- `reservation-backend/controllers/learningJourneyController.js`
- `reservation-backend/migrations/20260427180000-create-learning-journey-import-histories.js`
- `reservation-backend/models/LearningJourneyImportHistory.js`
- `reservation-backend/models/index.js`
- `reservation-backend/routes/learningJourneyRouter.js`
- `reservation-backend/server.js`
- `reservation-backend/services/learningJourney/learningJourneyFinalService.js`
- `reservation-backend/services/learningJourney/utils/dedupeKeyBuilder.js`
- `reservation-frontend/src/App.js`
- `reservation-frontend/src/constants/adminNavigation.js`
- `reservation-frontend/src/pages/admin/LearningJourneyHubPage.jsx`
- `reservation-frontend/src/pages/admin/LearningJourneyStudentPage.jsx`
- `reservation-frontend/src/services/learningJourneyApi.js`

目前工作樹另有 reservation / event workspace 相關既有變更，非本報告列出的 Learning Journey final UAT 實作範圍；本階段未刪除舊 DB 資料。

## Legacy Route 保留原因

本階段保留下列 backend routes 作為 legacy compatibility routes：

- `/api/english-tests`
- `/api/admin/english-tests`

保留原因：

- 這些 route 仍可能被 Learning Journey 以外的既有頁面、書籤、操作流程或維運工具使用。
- 本階段目標是確保新 Learning Journey UI 不再依賴舊 API，而不是立即移除所有舊 API。
- 立即移除可能破壞仍未盤點完成的既有功能。
- 舊 DB 資料不可刪除；legacy route 保留不代表它仍是 Learning Journey final 的 source of truth。

文件標記：

- `/api/english-tests` 與 `/api/admin/english-tests` 在本階段視為 legacy compatibility routes。
- `/admin/learning-journey` 的新資料流必須只使用 `/api/admin/learning-journey/*`。
- 若未來發現新 Learning Journey UI 或 service 重新引用 legacy English Tests API，需改回 final Learning Journey API。

## Blocked 測試原因

前端測試 blocked：

- 指令：`npm test -- --watchAll=false --runInBand`
- 結果：失敗於 `src/setupTests.js`。
- 原因：測試環境缺少 `@testing-library/jest-dom`。
- 判定：測試環境依賴待補，不視為 Learning Journey final 功能失敗。

後端測試 blocked：

- 指令：`npm test -- --runInBand`
- 結果：環境中 `jest` 指令不可用。
- 原因：後端測試環境未安裝或未解析 Jest binary。
- 判定：測試環境待補，不視為 Learning Journey final 功能失敗。

已完成的替代驗證：

- `node --check` 驗證後端修改檔語法通過。
- 後端 models 與 final service 可正常 require 載入。
- 本次前端修改檔 ESLint 通過。
- `npm run build` 成功；build 輸出仍有既有 warnings，但未指向本次 Learning Journey final 修改檔。

## 後續移除 Legacy API 的條件

可移除 `/api/english-tests` 與 `/api/admin/english-tests` 的條件：

- 全專案搜尋確認沒有任何新舊前端頁面、service、hook、測試、維運腳本仍呼叫 `/api/english-tests` 或 `/api/admin/english-tests`。
- 後台使用者常用書籤與 legacy route redirect 均已導向 `/admin/learning-journey` 或其他明確替代頁。
- 培力英檢報名管理與 BESTEP 匯入等仍需保留的功能已確認不依賴要移除的 English Test Tracking read API。
- final Learning Journey 匯入、報表、學生詳情、診斷與 UAT smoke test 全數通過。
- 已完成資料保留策略確認：只移除 route / controller / service 入口，不刪除舊 DB 資料。
- 已完成部署回滾策略與公告，確保移除後若有未盤點 legacy consumer 可快速恢復或導向替代 API。

## UAT 高風險規則對應

- 跨學期最佳成績：`learningJourneyFinalService.loadBestSkillsForRoster()` 查詢 roster 內學生所有 valid attempts，並以學期結束日作上限。
- CEFR 排序與 B2 判斷：使用 `getCefrRank()` 與 `B2_RANK`，不使用字串比較。
- Exam attempt 去重：`buildExternalExamDedupeKey()` 使用 `studentId + examDate + examType` 語意；衝突寫入 `migration_quarantine`。
- 分母限定 enrollment snapshot：overview/students 皆由 `EtEnrollmentSnapshot` 的 `semesterId + isActive=true` 取得 roster。
- Teacher API 權限：`getTeacherVisibleStudentIds()` 於 service 層以 `classes.teacherName` 與 `class_memberships` 限制可見學生。
