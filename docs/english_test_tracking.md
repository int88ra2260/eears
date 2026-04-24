# 全校學生英檢成績長期追蹤模組

## 功能說明

- 從本學期開始記錄全校學生英檢成績，支援多筆 attempt（跨測驗、跨日期、同測驗多次）。
- 以「學期在學名冊」為統計母體，每學期末可產出**各年級 × 各能力**表現統計（年級列、能力欄、總計列）。
- 四項能力（聽/讀/說/寫）各自取**最佳成績**，最佳可分散在不同 attempt，且可追溯來源 attemptId。
- 支援名冊 Excel 匯入、成績 Excel 匯入、重算最佳成績、報表查詢與 drill-down、單人查詢。

## 權限

- 預設僅 **admin** 與 **executive**（執行長）可存取本模組所有 API 與後台頁面。
- 前端選單「英檢長期追蹤」僅在具有管理員權限時顯示。

## 資料表與模型

| 表名 | 說明 |
|------|------|
| et_semesters | 學期主檔（id 如 114-1，含 startDate/endDate/snapshotDate） |
| et_student_master | 學生主檔（學號唯一，name/college/dept） |
| et_cefr_levels | CEFR 等級對照（level, rank：A1=1 … C2=6） |
| et_enrollment_snapshots | 每學期在學名冊快照（semesterId, studentId, grade, status, isActive） |
| et_exam_attempts | 英檢原始成績 attempt（studentId, testType, testDate, source, status, importBatchId） |
| et_exam_attempt_scores | 能力分項（attemptId, skill, rawScore, cefr） |
| et_semester_student_best_skills | 每學期每生每 skill 最佳成績物化（含 attemptId 來源） |

## 匯入模板欄位

### 學期在學名冊 Excel

建議欄位（欄位名稱可彈性對照）：

- **學號**（必填）
- 姓名、學院、系所、年級、學籍狀態（在學/休學/退學）

系統會自動對照：學號、姓名、學院、系所、年級、學籍狀態等關鍵字。

### 成績 Excel

建議欄位：

- **學號**（必填）
- 檢定類別（如 BESTEP/TOEIC/IELTS）
- 檢定時間（可單一日期或多日期，見下方）
- 聽力/閱讀/口說/寫作（分數或 CEFR）

檢定時間解析：

- 可為單一日期（YYYY-MM-DD 或 YYYY/MM/DD 或 YYYYMMDD）。
- 若為多日期（以頓號、逗號、空格分隔），可配置「拆分多筆 attempt」。
- 含中文備註（括號內）會自動剔除並記錄警告。

## 錯誤代碼（匯入）

| 代碼 | 說明 |
|------|------|
| MISSING_STUDENT_ID | 學號為空 |
| INVALID_DATE | 無法解析檢定時間 |
| NO_SCORES | 至少需有一項成績或 CEFR |
| PROCESSING_ERROR | 寫入或處理過程錯誤 |

## 最佳成績排序規則（可設定）

預設依序：

1. **cefrRank** 越高越好（無 CEFR 視為最低）
2. 同 cefrRank 下 **rawScore** 越高越好
3. 同分則 **testDate** 越新越好
4. 最後 **attemptId** 越大越好（穩定排序）

設定檔：`.env` 中 `ENGLISH_TEST_TRACKING_BEST_TIEBREAKER=cefr,rawScore,testDate,attemptId`。

## 重算策略

- 每次匯入/更正成績後，可只重算「受影響學生」在相關學期的 best-skill（API 可傳 `studentIds`）。
- 管理後台提供「全量重算」按鈕：以該學期在學名冊為準，重算所有在學學生的四項最佳成績。
- 報表一律以物化表 `et_semester_student_best_skills` 為準，避免 N+1 與全表掃描。

## 回滾流程

- 成績匯入時會產生 **importBatchId**（如 `attempts-1730123456789`）。
- 回滾：呼叫 `POST /api/english-tests/rollback-batch`，body：`{ "importBatchId": "attempts-xxx" }`。
- 該 batch 內所有 attempt 將被標記為 **void**，不再參與最佳成績計算；重算後報表會更新。

## API 一覽

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | /api/english-tests/semesters | 學期列表 |
| POST | /api/english-tests/enrollment/import | 名冊 Excel 匯入 |
| POST | /api/english-tests/attempts/import | 成績 Excel 匯入 |
| POST | /api/english-tests/recompute | 重算最佳成績（body: semesterId, studentIds?, fullRecompute?） |
| GET | /api/english-tests/report/semester/:semesterId/grade-skill-summary | 年級×能力摘要（query: metric, threshold, includeTotal） |
| GET | /api/english-tests/report/semester/:semesterId/drilldown/:grade/:skill | 某年級某能力學生名單 |
| GET | /api/english-tests/student/:studentId/attempts | 單人全部 attempts |
| GET | /api/english-tests/student/:studentId/best-skills | 單人最佳四項（query: semesterId） |
| POST | /api/english-tests/rollback-batch | 回滾指定 importBatchId |

## 環境變數

- `ENABLE_ENGLISH_TEST_TRACKING=true`：啟用模組（預設 true，設為 false 則關閉路由）。
- `ENGLISH_TEST_TRACKING_IMPORT_OVERWRITE_ENROLLMENT=false`：名冊匯入時是否以本次名冊覆蓋（未出現者 isActive=0）。
- `ENGLISH_TEST_TRACKING_BEST_TIEBREAKER=cefr,rawScore,testDate,attemptId`：最佳成績 tie-breaker 順序。

## 與既有模組差異

- **BESTEP 成績**（bestep_exam_scores）：每學期每生一筆，用於當學期 BESTEP 活動；**不替換**。
- **英檢長期追蹤**（et_exam_attempts + et_exam_attempt_scores）：多筆 attempt、多測驗類型、可更正、可追溯，用於全校長期統計與報表。
- 報名/活動/黑名單/問卷流程不受影響，僅新增表與 API。
