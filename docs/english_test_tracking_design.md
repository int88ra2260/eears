# 全校學生英檢成績長期追蹤 — 掃描結果與設計

## 0. 專案掃描結果與差異分析

### 0.1 專案結構

| 項目 | 路徑 |
|------|------|
| 專案根目錄 | `f:\EEARS_backup_20251211` |
| Frontend | `reservation-frontend`（React，入口 `src/index.js` → `App.js`） |
| Backend | `reservation-backend`（Node/Express，入口 `server.js`） |
| 資料庫 | MySQL，Sequelize 設定在 `db.js`，`define.freezeTableName: true`、`underscored: false` |
| Migrations | `reservation-backend/migrations/`，命名 `YYYYMMDDnnnnnn-描述.js` |

### 0.2 既有資料表/模型（與本模組關係）

| Model | 表名 | 用途 | 與長期追蹤關係 |
|-------|------|------|----------------|
| **User** | Users | 預約用帳號，studentId 唯一 | 不作為「學生主檔」；本模組另建 **StudentMaster**（學號+姓名+學院系所），與 User 可並存 |
| **BestepExamScore** | bestep_exam_scores | 每學期每生一筆 BESTEP 成績（unique studentId+semester） | **不替換**；長期追蹤用 **ExamAttempt + ExamAttemptScore** 支援多筆 attempt、多測驗類型、更正鏈 |
| **BestepAttendance** | bestep_attendance | 學期/測驗類型出席 | 不變；本模組不改動 |
| **BestepExamSession** | bestep_exam_sessions | 學期與 LR/SW 考試日 | 可參考；學期 ID 與本模組 **Semester** 對齊（如 114-1） |
| **EnglishTestRegistration** | english_test_registrations | 培力英檢報名、審核、B2 證明 | **不變**；報名/活動/黑名單/問卷流程不破壞 |
| **ClassMembership** | class_memberships | 班級名冊（semester, classId, studentId, grade） | 語意類似「在學名冊」但以班級為單位；本模組用 **EnrollmentSnapshot**（學期+學號+年級+isActive）做全校統計 |

**結論**：不修改既有表結構，僅**新增**表與 API；既有 BESTEP 匯入、報名、問卷流程保留。

### 0.3 RBAC 與本模組權限規劃

- **既有**：`authMiddleware`（JWT）→ `adminMiddleware`（admin 或 teacher+executive）、`workerMiddleware`、`teacherMiddleware`。
- **本模組**：  
  - **admin / executive**：完整權限（匯入名冊、匯入成績、重算、報表、單人查詢、回滾 batch）。  
  - **worker / teacher**：可選開放「唯讀報表」或「僅查自己」（由 feature flag 或設定決定；預設僅 admin/executive）。  
  - **student**：不開放（除非未來另開「學生查自己」API）。

實作上：管理端 API 一律 `authMiddleware + adminMiddleware`；若日後要給 teacher 唯讀，可再加一層 `teacherMiddleware` 的唯讀路由。

### 0.4 既有 CEFR 與匯入可復用處

- **CEFR**：`bestepImportService.js` 內 `CEFR_LEVELS = ['A1','A2','B1','B2','C1','C2']`、`calculateOverallLevel`、`isPassed`。  
  - 本模組：抽成共用常數/查表 **CefrLevel**（level + rank），best-skill 比較用 **cefrRank**；若無 CEFR 則用 rawScore 或換算表（可配置）。
- **Excel 匯入**：參考 `BestepImportPage` + `bestepRouter` + `bestepImportService`（XLSX/ExcelJS、欄位對照、transaction、錯誤收集）。  
  - 本模組：獨立 **enrollmentImportService**、**examAttemptImportService**，輸出 log 與 importBatchId，支援 rollback。

### 0.5 可回滾與向下相容

- 所有新增表均用 **Sequelize migration**，具 **up/down**。  
- 資料搬遷若有（例如從 BestepExamScore 複製到 ExamAttempt）：另寫 **script**，支援 **dry-run**。  
- 不刪除、不修改既有表與既有 API 路徑，僅新增路由（如 `/api/english-tests/...`），保留向下相容。

---

## 1. Migration 設計（三層資料 + 最佳成績物化）

### 1.1 表清單與依賴順序

1. **et_semesters** — 學期主檔  
2. **et_student_master** — 學生主檔（學號唯一）  
3. **et_cefr_levels** — CEFR 等級與 rank（lookup）  
4. **et_enrollment_snapshots** — 每學期在學名冊快照（依賴 semester, student）  
5. **et_exam_attempts** — 英檢原始成績 attempt（依賴 student）  
6. **et_exam_attempt_scores** — 能力分項（依賴 attempt）  
7. **et_semester_student_best_skills** — 每學期每生每 skill 最佳成績物化（依賴 semester, student, attempt）

前綴 `et_` = english_test_tracking，避免與既有 bestep_、english_test_registrations 混淆。

### 1.2 各表欄位摘要

**et_semesters**

- id (PK, STRING 20，如 '114-1')
- startDate, endDate (DATE)
- snapshotDate (DATE, nullable) — 統計鎖定日
- createdAt, updatedAt

**et_student_master**

- id (PK, autoIncrement)
- studentId (STRING 50, unique) — 學號
- name (STRING 100), college (STRING 100), dept (STRING 100) — 可 null
- createdAt, updatedAt

**et_cefr_levels**

- level (PK, STRING 10，如 'A1'~'C2')
- rank (INTEGER) — A1=1 … C2=6

**et_enrollment_snapshots**

- id (PK)
- semesterId (FK → et_semesters.id)
- studentId (FK 邏輯指向 et_student_master.studentId，實際存 STRING 以減少 FK 耦合)
- grade (STRING 20) — 該學期年級，報表必用
- status (STRING 20) — 在學/休學/退學 等
- isActive (BOOLEAN) — 是否納入統計
- importBatchId (STRING 50, nullable) — 追溯
- createdAt, updatedAt  
- unique(semesterId, studentId)  
- index(semesterId, grade, isActive)

**et_exam_attempts**

- id (PK)
- studentId (STRING 50), testType (STRING 50), testDate (DATEONLY)
- source (STRING 20) — manual_import / official_import / api_sync
- importBatchId (STRING 50, nullable)
- status (STRING 20) — valid / void / replaced
- replacedByAttemptId (INT, nullable) — 更正鏈
- createdAt, updatedAt  
- index(studentId, testType, testDate), index(importBatchId), index(status)

**et_exam_attempt_scores**

- id (PK)
- attemptId (FK → et_exam_attempts.id)
- skill (STRING 20) — LISTENING/READING/SPEAKING/WRITING
- rawScore (DECIMAL 8,2), cefr (STRING 10 nullable)
- createdAt, updatedAt  
- unique(attemptId, skill), index(skill), index(cefr)

**et_semester_student_best_skills**

- id (PK)
- semesterId (FK), studentId (STRING 50), skill (STRING 20)
- attemptId (FK) — 最佳來源
- rawScore, cefr, cefrRank (INT nullable)
- computedAt, updatedAt  
- unique(semesterId, studentId, skill)  
- index(semesterId)（drill-down 時可再補 semesterId+grade 需 join Enrollment）

### 1.3 索引與效能

- 報表以 **EnrollmentSnapshot** 為學生集合，**SemesterStudentBestSkill** 為分數來源，避免 N+1 與全表掃描。  
- EXPLAIN 將在 report query 實作時檢查。

---

## 2. 與既有模組整合方案與差異列表

| 項目 | 既有 (BESTEP/報名) | 本模組 (長期追蹤) | 整合方式 |
|------|---------------------|-------------------|----------|
| 學期 | 字串 semester 散落各表 | et_semesters 主檔 + snapshotDate | 學期 ID 格式一致（如 114-1），不改既有表 |
| 學生 | User / 報名表 studentId | et_student_master | 名冊/成績匯入時 upsert StudentMaster；不取代 User |
| 成績 | BestepExamScore 一學期一筆 | ExamAttempt 多筆 + 分項 ExamAttemptScore | 不刪 BestepExamScore；若需從 BESTEP 匯入到長期追蹤可另做「同步 script」 |
| CEFR | bestepImportService 常數 | et_cefr_levels + 共用 rank | 新表 seed 寫入 A1~C2；比較邏輯用 rank |
| 權限 | admin/executive/worker/teacher | 本模組僅 admin/executive 預設 | 同一 authMiddleware + adminMiddleware |
| 匯入 | bestep 出席/成績 Excel | 名冊 Excel、成績 Excel（不同格式） | 新 API、新 service，不改 bestepImportService |

**最少破壞**：僅新增檔案與路由；既有報名/活動/黑名單/問卷/BESTEP 流程完全不動。

---

## 3. 環境變數與設定（.env）

建議新增（可選，有預設）：

- `ENABLE_ENGLISH_TEST_TRACKING=true`
- `ENGLISH_TEST_TRACKING_ALLOW_MIXED_TESTTYPE_COMPARE=false`
- `ENGLISH_TEST_TRACKING_SNAPSHOT_MODE=locked|live`（預設 locked）
- `ENGLISH_TEST_TRACKING_IMPORT_OVERWRITE_ENROLLMENT=false`
- `ENGLISH_TEST_TRACKING_BEST_TIEBREAKER=cefr,rawScore,testDate,attemptId`

若專案已有 feature flags，可加一項 `english_test_tracking` 與上列對應。

---

以上為掃描結果與 migration 設計；接下來將依序實作：migrations → models → services → routes → frontend → docs + seed。
