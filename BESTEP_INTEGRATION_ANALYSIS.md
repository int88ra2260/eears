# BESTEP 培力英檢整合方案分析報告

## 📋 執行摘要

本報告針對「班級參與概況頁面整合 BESTEP 培力英檢資料」需求，進行現況盤點、缺口分析與改造方案設計。

**目標**：在班級參與概況頁面顯示每位學生的：
1. 個人報名狀態（培力英檢 BESTEP）
2. 團體報名資訊（隊伍/組別）
3. 出席狀況
4. 考試成績
5. 班級層級統計（報名率、出席率、達標率等）
6. 團體報名名次計算

---

## 🔍 A. 現況盤點

### A.1 資料庫結構（DB Tables）

#### ✅ 已存在的表

##### 1. `english_test_registrations` (個人報名表)
**檔案位置**: `reservation-backend/models/EnglishTestRegistration.js`

**關鍵欄位**:
- `id` (PK)
- `studentId` (STRING(50), UNIQUE) ⭐ **可與 ClassMembership 關聯**
- `status` (ENUM: 'pending', 'approved', 'revision', 'success', 'failed')
- `examType` (STRING(10): 'LRSW', 'LR', 'SW', 'NON')
- `approvedAt` (DATE) - 用於排序
- `successSequence` (INTEGER) - 報名成功順序
- `notes`, `rejectionReasons`, `rejectionOther`
- `createdAt`, `updatedAt`

**索引**:
- `studentId` (UNIQUE)
- 其他索引見 migration: `add-indexes-to-english-test-registrations.js`

**關聯**:
- ✅ 可透過 `studentId` 與 `ClassMembership.studentId` JOIN

---

##### 2. `learning_partner_teams` (團體報名表)
**檔案位置**: `reservation-backend/models/LearningPartnerTeam.js`

**關鍵欄位**:
- `id` (PK)
- `teamName` (STRING(100), nullable)
- `representativeStudentId` (STRING(50)) ⭐ **代表者學號**
- `teamSize` (TINYINT: 2-4)
- `status` (ENUM: 'pending_approval', 'approved', 'expired', 'cancelled')
- `expiresAt`, `approvedAt`, `cancelledAt`
- `activeFlag` (TINYINT(1))

**索引**:
- `status`, `createdAt`
- `expiresAt`
- `representativeStudentId`

**關聯**:
- 透過 `LearningPartnerTeamMember` 與 `EnglishTestRegistration` 關聯

---

##### 3. `learning_partner_team_members` (團體成員表)
**檔案位置**: `reservation-backend/models/LearningPartnerTeamMember.js`

**關鍵欄位**:
- `id` (PK)
- `teamId` (FK → `learning_partner_teams.id`)
- `studentId` (STRING(50)) ⭐ **可與 ClassMembership 關聯**
- `name`, `email`
- `isRepresentative` (BOOLEAN)
- `personalRegistrationId` (FK → `english_test_registrations.id`) ⭐ **與個人報名關聯**
- `approvalStatus` (ENUM: 'pending', 'approved', 'expired')
- `activeFlag` (TINYINT(1))
- `approvedAt`, `approvalIp`, `approvalUserAgent`

**索引**:
- `teamId`
- `studentId`, `activeFlag` (複合索引)
- `personalRegistrationId`
- `approvalToken` (UNIQUE)

**關聯**:
- ✅ `teamId` → `LearningPartnerTeam.id`
- ✅ `personalRegistrationId` → `EnglishTestRegistration.id`
- ✅ `studentId` 可與 `ClassMembership.studentId` JOIN

---

##### 4. `classes` (班級表)
**檔案位置**: `reservation-backend/models/Class.js`

**關鍵欄位**:
- `id` (PK)
- `name` (STRING(100))
- `semester` (STRING(20), e.g., '114-1')
- `department` (STRING(100), nullable)
- `teacherName` (STRING(100), nullable)

**索引**:
- `name`, `semester` (UNIQUE)
- `semester`

---

##### 5. `class_memberships` (班級成員表)
**檔案位置**: `reservation-backend/models/ClassMembership.js`

**關鍵欄位**:
- `id` (PK)
- `semester` (STRING(20))
- `classId` (FK → `classes.id`)
- `studentId` (STRING(50)) ⭐ **核心關聯欄位**
- `studentName`, `department`, `email`, `grade`

**索引**:
- `semester`, `classId`, `studentId` (UNIQUE)
- `semester`, `classId`
- `studentId`

**關聯**:
- ✅ `classId` → `Class.id`
- ✅ `studentId` 可與 `EnglishTestRegistration.studentId` JOIN
- ✅ `studentId` 可與 `LearningPartnerTeamMember.studentId` JOIN

---

#### ❌ 缺失的表

##### 1. `bestep_attendance` (出席狀況表) - **需要新增**
**需求欄位**:
- `id` (PK)
- `studentId` (STRING(50), FK → `class_memberships.studentId`)
- `examSessionId` (STRING(50)) - 考試場次 ID（如 'BESTEP-2025-01-15-LRSW'）
- `examDate` (DATE) - 考試日期
- `examType` (STRING(10): 'LRSW', 'LR', 'SW')
- `attended` (BOOLEAN) - 是否出席
- `absentReason` (TEXT, nullable) - 缺席原因
- `importedAt` (DATE) - 匯入時間
- `sourceFile` (STRING(255), nullable) - 來源檔案名稱
- `createdAt`, `updatedAt`

**建議索引**:
- `studentId`, `examSessionId` (UNIQUE)
- `examDate`
- `examSessionId`

---

##### 2. `bestep_exam_scores` (考試成績表) - **需要新增**
**需求欄位**:
- `id` (PK)
- `studentId` (STRING(50), FK → `class_memberships.studentId`)
- `examSessionId` (STRING(50)) - 考試場次 ID
- `examDate` (DATE)
- `examType` (STRING(10): 'LRSW', 'LR', 'SW')
- `listeningScore` (DECIMAL(5,2), nullable) - 聽力分數
- `readingScore` (DECIMAL(5,2), nullable) - 閱讀分數
- `speakingScore` (DECIMAL(5,2), nullable) - 口說分數
- `writingScore` (DECIMAL(5,2), nullable) - 寫作分數
- `lrScore` (DECIMAL(5,2), nullable) - LR 總分（若 examType='LR'）
- `swScore` (DECIMAL(5,2), nullable) - SW 總分（若 examType='SW'）
- `totalScore` (DECIMAL(5,2), nullable) - 總分（若 examType='LRSW'）
- `level` (STRING(10), nullable) - 等級（如 'B2', 'C1'）
- `importedAt` (DATE)
- `sourceFile` (STRING(255), nullable)
- `createdAt`, `updatedAt`

**建議索引**:
- `studentId`, `examSessionId` (UNIQUE)
- `examDate`
- `examSessionId`

---

##### 3. `bestep_exam_sessions` (考試場次表) - **建議新增**（可選，用於管理場次）
**需求欄位**:
- `id` (PK)
- `sessionId` (STRING(50), UNIQUE) - 場次代碼
- `examDate` (DATE)
- `examType` (STRING(10))
- `description` (TEXT, nullable)
- `createdAt`, `updatedAt`

**建議索引**:
- `sessionId` (UNIQUE)
- `examDate`

---

### A.2 API 路由與 Controller

#### ✅ 已存在的 API

##### 1. 個人報名相關
**檔案**: `reservation-backend/routes/englishTestRegistrationRouter.js`

**現有端點**:
- `GET /api/english-test/registrations` - 查詢報名列表（支援篩選、分頁、排序）
- `GET /api/english-test/registrations/:id` - 取得單筆報名詳情
- `POST /api/english-test/register` - 建立報名
- `PUT /api/english-test/registrations/:id` - 更新報名狀態
- `POST /api/english-test/registrations/bulk-update` - 批量更新
- `DELETE /api/english-test/registrations/:id` - 刪除報名
- `GET /api/english-test/registrations/export/excel` - 匯出 Excel
- `GET /api/english-test/registrations/stats/info-source` - 統計資訊來源

**可查詢欄位**:
- ✅ 可透過 `studentId` 查詢個人報名狀態
- ✅ 狀態欄位完整（pending, approved, revision, success, failed）

---

##### 2. 團體報名相關
**檔案**: `reservation-backend/routes/learningPartnerRouter.js`

**現有端點**:
- `GET /api/admin/learning-partner/teams` - 查詢團體列表
- `GET /api/admin/learning-partner/teams/:id` - 取得團體詳情
- `POST /api/admin/learning-partner/teams` - 建立團體
- `GET /api/admin/learning-partner/export?format=csv` - 匯出 CSV

**可查詢欄位**:
- ✅ 可透過 `studentId` 查詢團體成員（透過 `LearningPartnerTeamMember`）
- ✅ 可取得團體狀態、成員列表、代表者資訊

---

##### 3. 班級相關
**檔案**: `reservation-backend/routes/adminClasses.js`
**Controller**: `reservation-backend/controllers/adminClassesController.js`

**現有端點**:
- `GET /api/admin/classes/overview` - 班級總覽（統計）
- `GET /api/admin/classes/:classId/overview` - 班級明細（學生列表）
- `POST /api/admin/classes/roster/import` - 匯入班級名單
- `GET /api/admin/classes/overview/export` - 匯出班級總覽 Excel
- `GET /api/admin/classes/:classId/overview/export` - 匯出班級明細 Excel

**現有功能**:
- ✅ 班級參與統計（參與率、簽到次數、No-shows）
- ✅ 學生明細（預約數、簽到數、No-shows）
- ⚠️ **目前只統計 EMI 活動（English Table/Club/Job Talk/International Forum），未包含 BESTEP**

---

#### ❌ 缺失的 API

##### 1. 班級 BESTEP 整合查詢 - **需要新增**
**需求端點**:
```
GET /api/admin/classes/:classId/bestep-overview?semester=114-1&examSessionId=BESTEP-2025-01-15-LRSW
```

**回傳格式**:
```json
{
  "classInfo": {
    "classId": 1,
    "className": "英文中級 GEEN116",
    "semester": "114-1",
    "teacherName": "張老師"
  },
  "statistics": {
    "totalStudents": 30,
    "registeredCount": 25,
    "registrationRate": 83.33,
    "attendedCount": 23,
    "attendanceRate": 76.67,
    "passedCount": 20,
    "passRate": 66.67,
    "avgScore": 85.5,
    "medianScore": 87.0
  },
  "students": [
    {
      "studentId": "B123456789",
      "studentName": "王小明",
      "personalRegistration": {
        "status": "success",
        "regId": 123,
        "examType": "LRSW",
        "updatedAt": "2025-01-10T10:00:00Z"
      },
      "groupRegistration": {
        "teamId": 5,
        "teamName": "學習有伴隊",
        "role": "leader",
        "teamStatus": "approved"
      },
      "attendance": {
        "attended": true,
        "examSessionId": "BESTEP-2025-01-15-LRSW",
        "examDate": "2025-01-15"
      },
      "score": {
        "listeningScore": 90,
        "readingScore": 85,
        "speakingScore": 88,
        "writingScore": 87,
        "totalScore": 350,
        "level": "B2"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 30,
    "totalPages": 1
  }
}
```

---

##### 2. 出席資料匯入 - **需要新增**
**需求端點**:
```
POST /api/admin/bestep/attendance/import
Content-Type: multipart/form-data
Body: { file: File, examSessionId: string, examDate: string }
```

**回傳格式**:
```json
{
  "success": true,
  "imported": 25,
  "skipped": 2,
  "errors": [
    {
      "row": 3,
      "studentId": "B999999999",
      "error": "找不到該學號的報名記錄"
    }
  ],
  "errorFileUrl": "/api/admin/bestep/attendance/import/errors/xxx.xlsx"
}
```

---

##### 3. 成績資料匯入 - **需要新增**
**需求端點**:
```
POST /api/admin/bestep/scores/import
Content-Type: multipart/form-data
Body: { file: File, examSessionId: string, examDate: string, examType: 'LRSW'|'LR'|'SW' }
```

**回傳格式**: 同出席匯入

---

##### 4. 團體報名名次計算 - **需要新增**
**需求端點**:
```
POST /api/admin/bestep/teams/calculate-ranking?examSessionId=BESTEP-2025-01-15-LRSW&rule=total_score
GET /api/admin/bestep/teams/ranking?examSessionId=BESTEP-2025-01-15-LRSW
```

**回傳格式**:
```json
{
  "examSessionId": "BESTEP-2025-01-15-LRSW",
  "rankingRule": "total_score",
  "teams": [
    {
      "teamId": 5,
      "teamName": "學習有伴隊",
      "totalScore": 1400,
      "avgScore": 350,
      "rank": 1,
      "members": [
        {
          "studentId": "B123456789",
          "name": "王小明",
          "score": 350
        }
      ]
    }
  ]
}
```

---

### A.3 前端頁面/元件

#### ✅ 已存在的頁面

##### 1. 班級參與概況 (`ClassOverview.js`)
**檔案**: `reservation-frontend/src/components/ClassOverview.js`

**現有功能**:
- ✅ 班級總覽表格（參與率、簽到次數等）
- ✅ 圖表（參與率長條圖、活動類型圓餅圖）
- ✅ 篩選（學期、活動類型、搜尋、排序）
- ✅ 匯入名單、匯出 Excel
- ⚠️ **目前只顯示 EMI 活動統計，未包含 BESTEP**

---

##### 2. 班級明細 (`ClassDetail.js`)
**檔案**: `reservation-frontend/src/components/ClassDetail.js`

**現有功能**:
- ✅ 學生明細表格（學號、姓名、系所、預約數、簽到數、No-shows）
- ✅ 篩選、搜尋、排序
- ✅ 匯出 Excel
- ⚠️ **目前只顯示 EMI 活動參與，未包含 BESTEP**

---

##### 3. 培力英檢報名管理 (`EnglishTestManagement.js`)
**檔案**: `reservation-frontend/src/components/EnglishTestManagement.js`

**現有功能**:
- ✅ 個人報名列表（表格）
- ✅ 團體報名管理（卡片網格）
- ✅ 狀態篩選、進階篩選
- ✅ 批量操作、匯出
- ⚠️ **與班級參與概況頁面分離，未整合**

---

#### ❌ 需要擴充的功能

##### 1. 班級參與概況頁面擴充
- ⚠️ 需要新增「BESTEP 報名狀態」欄位
- ⚠️ 需要新增「團體報名資訊」欄位
- ⚠️ 需要新增「出席狀況」欄位
- ⚠️ 需要新增「考試成績」欄位
- ⚠️ 需要新增「BESTEP 統計卡片」（報名率、出席率、達標率）

---

### A.4 現況能力評估

#### ✅ 已能提供

1. **以 studentId 查到 EnglishTestRegistration 報名狀態**
   - ✅ 可透過 `EnglishTestRegistration.findOne({ where: { studentId } })`
   - ✅ 狀態欄位完整（pending, approved, revision, success, failed）

2. **查到團體報名資料以及該 student 是否屬於某團隊**
   - ✅ 可透過 `LearningPartnerTeamMember.findOne({ where: { studentId, activeFlag: 1 } })`
   - ✅ 可取得團隊資訊（teamId, teamName, role, teamStatus）

3. **班級與學生的關聯**
   - ✅ `ClassMembership` 表提供 `studentId` → `classId` 關聯
   - ✅ 可透過 `semester` 篩選

---

#### ❌ 現況不足（缺口）

1. **出席資料表與匯入機制**
   - ❌ 無 `bestep_attendance` 表
   - ❌ 無出席資料匯入 API
   - ❌ 無出席資料查詢 API

2. **考試成績資料表與匯入機制**
   - ❌ 無 `bestep_exam_scores` 表
   - ❌ 無成績資料匯入 API
   - ❌ 無成績資料查詢 API
   - ⚠️ `EnglishTestRegistration` 中有 `listeningScore`, `readingScore` 等欄位，但這些是「報名時填寫的歷史成績」，不是「考試後的成績」

3. **班級參與概況頁面整合**
   - ❌ 班級參與概況頁面未顯示 BESTEP 相關資訊
   - ❌ 班級明細頁面未顯示 BESTEP 相關資訊

4. **團體報名名次計算**
   - ❌ 無名次計算邏輯
   - ❌ 無名次欄位（可在 `LearningPartnerTeam` 新增 `ranking` 欄位，或建立獨立表）

---

## 🎯 B. 缺口與風險分析

### B.1 資料缺口

| 缺口項目 | 影響程度 | 風險等級 |
|---------|---------|---------|
| 無出席資料表 | 高 | 🔴 高 |
| 無成績資料表 | 高 | 🔴 高 |
| 無考試場次管理 | 中 | 🟡 中 |
| 無團體名次欄位 | 中 | 🟡 中 |

### B.2 API 缺口

| 缺口項目 | 影響程度 | 風險等級 |
|---------|---------|---------|
| 無班級 BESTEP 整合查詢 API | 高 | 🔴 高 |
| 無出席資料匯入 API | 高 | 🔴 高 |
| 無成績資料匯入 API | 高 | 🔴 高 |
| 無團體名次計算 API | 中 | 🟡 中 |

### B.3 UI 缺口

| 缺口項目 | 影響程度 | 風險等級 |
|---------|---------|---------|
| 班級參與概況頁面未顯示 BESTEP | 高 | 🔴 高 |
| 班級明細頁面未顯示 BESTEP | 高 | 🔴 高 |
| 無出席/成績篩選功能 | 中 | 🟡 中 |

### B.4 業務邏輯缺口

| 缺口項目 | 影響程度 | 風險等級 |
|---------|---------|---------|
| 「報名成功」狀態定義不明確 | 中 | 🟡 中 |
| 團體名次計算規則未定義 | 中 | 🟡 中 |
| 達標標準未定義 | 中 | 🟡 中 |

---

## ✅ C. 業務規則確認（已確認）

### C.1 業務規則確認結果

1. **「報名成功」狀態定義** ✅
   - ✅ `status='success'` 即為報名成功，不須額外驗證（收費等）
   - ✅ `status='approved'` 僅代表資料完整，不代表成功報名
   - ✅ `status='success'` 才代表成功報名

2. **團體報名名次計算規則** ✅
   - ✅ 依**團體聽、說、讀、寫分數平均排名**
   - ✅ 排名規則：
     - 第1名：每人5,000元獎勵金
     - 第2名：每人4,000元獎勵金
     - 第3名：每人3,000元獎勵金
     - 第4名：每人2,500元獎勵金
     - 第5名：每人2,000元獎勵金
     - 第6-10名：每人1,500元獎勵金
     - 第11-20名：每人1,000元獎勵金
   - ✅ **並列規則**：排名相同者視為並列同一名次，並均依該名次發給獎勵金
   - ✅ **名次跳過規則**：名次並列時，其後名次不再遞補，直接跳過並列名次數依序計算
   - ✅ 範例：若第1名有3隊並列，則下一名次為第4名（跳過第2、3名）

3. **達標標準** ✅
   - ✅ BESTEP 達標標準：達到 CEFR 等級 B2 以上
   - ✅ 判斷方式：依 `level` 欄位判斷（如 'B2', 'C1', 'C2' 為達標）
   - ⚠️ **注意**：若 Excel 未提供 level，需根據分數計算（需確認分數對應關係）

4. **考試場次定義** ✅（已更新）
   - ✅ 一個學期有兩場 BESTEP 考試：**LR（聽讀）** 和 **SW（說寫）**
   - ✅ LR 場次：包含聽力、閱讀測驗
   - ✅ SW 場次：包含口說、寫作測驗
   - ✅ 場次 ID 格式：`{semester}-LR` 或 `{semester}-SW`（如 '114-1-LR', '114-1-SW'）
   - ⚠️ **設計變更**：需要支援兩個場次，`examSessionId` 需包含場次類型

5. **成績欄位格式** ✅（已更新）
   - ✅ BESTEP 成績格式：L/R/S/W 四個分數分開
   - ✅ 欄位：聽力分數、閱讀分數、口說分數、寫作分數（各一個分數）
   - ✅ **各項 CEFR 等級**：成績資料會顯示各項分別的 CEFR 分數（聽力等級、閱讀等級、口說等級、寫作等級）
   - ✅ 總分：需計算（聽力 + 閱讀 + 口說 + 寫作）
   - ✅ 整體等級：需根據各項等級判斷（如：各項都達 B2 以上才算達標）

6. **班級定義** ✅
   - ✅ 班級以「學期 + 班級名稱」唯一識別
   - ✅ **同一學生可以在同一學期屬於多個班級**

7. **出席資料格式** ✅（已更新）
   - ✅ 試務官方提供 Excel，分為兩個檔案：
     - `培力英檢LR出缺席紀錄.xlsx` - LR（聽讀）場次出缺席
     - `培力英檢SW出缺席紀錄.xlsx` - SW（說寫）場次出缺席
   - ✅ 需要設計匯入格式規範（見下方 Excel 格式規範章節）

8. **成績資料格式** ✅（已更新）
   - ✅ 試務官方提供 Excel：`培力英檢成績資料.xls`
   - ✅ 包含各項分別的 CEFR 分數（聽力等級、閱讀等級、口說等級、寫作等級）
   - ✅ 需要設計匯入格式規範（見下方 Excel 格式規範章節）

---

## 📐 D. 資料模型設計（最小變更方案）

### D.1 新增表結構

#### 1. `bestep_attendance` (出席狀況表)

**設計變更**: 由於一個學期有兩場考試（LR 和 SW），需要區分場次類型

```sql
CREATE TABLE `bestep_attendance` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` VARCHAR(50) NOT NULL COMMENT '學號',
  `semester` VARCHAR(20) NOT NULL COMMENT '學期（如 114-1）',
  `examType` VARCHAR(10) NOT NULL COMMENT '考試類型：LR（聽讀）或 SW（說寫）',
  `examDate` DATE NOT NULL COMMENT '考試日期',
  `attended` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否出席',
  `absentReason` TEXT NULL COMMENT '缺席原因',
  `importedAt` DATETIME NOT NULL COMMENT '匯入時間',
  `sourceFile` VARCHAR(255) NULL COMMENT '來源檔案名稱',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  UNIQUE KEY `uk_student_semester_type` (`studentId`, `semester`, `examType`),
  INDEX `idx_examDate` (`examDate`),
  INDEX `idx_semester_type` (`semester`, `examType`),
  INDEX `idx_studentId` (`studentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### 2. `bestep_exam_scores` (考試成績表)

**設計變更**: 
- 一個學期一筆記錄（包含 LR 和 SW 的成績）
- 新增各項 CEFR 等級欄位（聽力等級、閱讀等級、口說等級、寫作等級）
- `totalScore` 自動計算（聽+讀+說+寫）
- `passed` 判斷：各項都達 B2 以上才算達標

```sql
CREATE TABLE `bestep_exam_scores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` VARCHAR(50) NOT NULL COMMENT '學號',
  `semester` VARCHAR(20) NOT NULL COMMENT '學期（如 114-1）',
  `examDate` DATE NULL COMMENT '考試日期（可能 LR 和 SW 不同日期）',
  `listeningScore` DECIMAL(5,2) NULL COMMENT '聽力分數',
  `readingScore` DECIMAL(5,2) NULL COMMENT '閱讀分數',
  `speakingScore` DECIMAL(5,2) NULL COMMENT '口說分數',
  `writingScore` DECIMAL(5,2) NULL COMMENT '寫作分數',
  `listeningLevel` VARCHAR(10) NULL COMMENT '聽力 CEFR 等級（如 A1, A2, B1, B2, C1, C2）',
  `readingLevel` VARCHAR(10) NULL COMMENT '閱讀 CEFR 等級',
  `speakingLevel` VARCHAR(10) NULL COMMENT '口說 CEFR 等級',
  `writingLevel` VARCHAR(10) NULL COMMENT '寫作 CEFR 等級',
  `totalScore` DECIMAL(5,2) NULL COMMENT '總分（自動計算：聽+讀+說+寫）',
  `overallLevel` VARCHAR(10) NULL COMMENT '整體 CEFR 等級（取最低項）',
  `passed` BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否達標（各項都達 B2 以上）',
  `importedAt` DATETIME NOT NULL COMMENT '匯入時間',
  `sourceFile` VARCHAR(255) NULL COMMENT '來源檔案名稱',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  UNIQUE KEY `uk_student_semester` (`studentId`, `semester`),
  INDEX `idx_examDate` (`examDate`),
  INDEX `idx_semester` (`semester`),
  INDEX `idx_studentId` (`studentId`),
  INDEX `idx_passed` (`semester`, `passed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### 3. `bestep_exam_sessions` (考試場次表)

**設計變更**: 由於一個學期有兩場（LR 和 SW），需要記錄兩場的日期

```sql
CREATE TABLE `bestep_exam_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `semester` VARCHAR(20) NOT NULL UNIQUE COMMENT '學期（如 114-1）',
  `lrExamDate` DATE NULL COMMENT 'LR（聽讀）場次考試日期',
  `swExamDate` DATE NULL COMMENT 'SW（說寫）場次考試日期',
  `description` TEXT NULL COMMENT '場次說明',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  INDEX `idx_semester` (`semester`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

#### 4. `bestep_team_rankings` (團體名次表)

**設計變更**: 
- `examSessionId` 簡化為 `semester`
- `rankingRule` 固定為 `avg_score`（平均分排序）
- 新增 `rewardAmount`（獎勵金額）

```sql
CREATE TABLE `bestep_team_rankings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teamId` INT NOT NULL COMMENT '團體 ID',
  `semester` VARCHAR(20) NOT NULL COMMENT '學期（如 114-1）',
  `avgScore` DECIMAL(5,2) NOT NULL COMMENT '隊伍平均分（聽+讀+說+寫的平均）',
  `rank` INT NULL COMMENT '名次（支援並列，如第1名有3隊並列，則下一名次為第4名）',
  `rewardAmount` INT NULL COMMENT '獎勵金額（每人，單位：元）',
  `calculatedAt` DATETIME NOT NULL COMMENT '計算時間',
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  UNIQUE KEY `uk_team_semester` (`teamId`, `semester`),
  INDEX `idx_semester` (`semester`),
  INDEX `idx_rank` (`semester`, `rank`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**獎勵金額對照表**:
- 第1名：5,000元
- 第2名：4,000元
- 第3名：3,000元
- 第4名：2,500元
- 第5名：2,000元
- 第6-10名：1,500元
- 第11-20名：1,000元

---

### D.2 既有表擴充（可選）

#### `learning_partner_teams` 新增欄位（若選擇在既有表儲存名次）

```sql
ALTER TABLE `learning_partner_teams` 
ADD COLUMN `ranking` INT NULL COMMENT '名次（需指定 examSessionId）' AFTER `cancelledReason`,
ADD COLUMN `rankingExamSessionId` VARCHAR(50) NULL COMMENT '名次對應的考試場次' AFTER `ranking`;
```

**注意**：若同一團體可能參與多場次，建議使用獨立表 `bestep_team_rankings`。

---

### D.3 ERD 圖（Mermaid）

```mermaid
erDiagram
    Class ||--o{ ClassMembership : "has"
    ClassMembership ||--o| EnglishTestRegistration : "may have (studentId)"
    ClassMembership ||--o| LearningPartnerTeamMember : "may have (studentId)"
    LearningPartnerTeam ||--o{ LearningPartnerTeamMember : "has"
    LearningPartnerTeamMember }o--|| EnglishTestRegistration : "references"
    ClassMembership ||--o{ BestepAttendance : "may have (studentId)"
    ClassMembership ||--o| BestepExamScore : "may have (studentId)"
    BestepExamSession ||--o{ BestepExamScore : "has"
    LearningPartnerTeam ||--o{ BestepTeamRanking : "may have"
    
    Class {
        int id PK
        string name
        string semester
        string department
        string teacherName
    }
    
    ClassMembership {
        int id PK
        int classId FK
        string studentId
        string studentName
        string department
        string email
        int grade
    }
    
    EnglishTestRegistration {
        int id PK
        string studentId UK
        string status
        string examType
        datetime approvedAt
        int successSequence
    }
    
    LearningPartnerTeam {
        int id PK
        string teamName
        string representativeStudentId
        int teamSize
        enum status
    }
    
    LearningPartnerTeamMember {
        int id PK
        int teamId FK
        string studentId
        int personalRegistrationId FK
        boolean isRepresentative
        enum approvalStatus
    }
    
    BestepAttendance {
        int id PK
        string studentId
        string semester
        string examType
        date examDate
        boolean attended
        text absentReason
    }
    
    BestepExamScore {
        int id PK
        string studentId
        string semester
        date examDate
        decimal listeningScore
        decimal readingScore
        decimal speakingScore
        decimal writingScore
        string listeningLevel
        string readingLevel
        string speakingLevel
        string writingLevel
        decimal totalScore
        string overallLevel
        boolean passed
    }
    
    BestepExamSession {
        int id PK
        string semester UK
        date lrExamDate
        date swExamDate
    }
    
    BestepTeamRanking {
        int id PK
        int teamId FK
        string semester
        decimal avgScore
        int rank
        int rewardAmount
    }
```

---

## 🔌 E. API 設計

### E.1 班級 BESTEP 整合查詢

#### `GET /api/admin/classes/:classId/bestep-overview`

**權限**: `authMiddleware` + `teacherMiddleware`（老師只能看自己的班級）

**Query Parameters**:
- `semester` (required): 學期，如 '114-1'
- `examType` (optional): 'LR' | 'SW' | 'all'（預設 'all'，顯示兩場資訊）
- `page` (optional, default: 1): 頁碼
- `pageSize` (optional, default: 50): 每頁筆數
- `search` (optional): 搜尋學號/姓名
- `filterRegistered` (optional): 'all' | 'registered' | 'not_registered'
- `filterAttended` (optional): 'all' | 'attended' | 'absent'（需指定 examType）
- `filterPassed` (optional): 'all' | 'passed' | 'failed'

**注意**: 由於一個學期有兩場考試（LR 和 SW），可選擇顯示特定場次或全部

**Response**:
```json
{
  "classInfo": {
    "classId": 1,
    "className": "英文中級 GEEN116",
    "semester": "114-1",
    "teacherName": "張老師"
  },
  "statistics": {
    "totalStudents": 30,
    "registeredCount": 25,
    "registrationRate": 83.33,
    "attendedCount": 23,
    "attendanceRate": 76.67,
    "passedCount": 20,
    "passRate": 66.67,
    "avgScore": 85.5,
    "medianScore": 87.0,
    "groupRegisteredCount": 8,
    "groupRegistrationRate": 26.67
  },
  "students": [
    {
      "studentId": "B123456789",
      "studentName": "王小明",
      "department": "資訊工程學系",
      "personalRegistration": {
        "status": "success",
        "regId": 123,
        "examType": "LRSW",
        "updatedAt": "2025-01-10T10:00:00Z"
      },
      "groupRegistration": {
        "teamId": 5,
        "teamName": "學習有伴隊",
        "role": "leader",
        "teamStatus": "approved",
        "teamRank": 1
      },
      "attendance": {
        "lr": {
          "attended": true,
          "examDate": "2025-01-15",
          "absentReason": null
        },
        "sw": {
          "attended": true,
          "examDate": "2025-01-16",
          "absentReason": null
        }
      },
      "score": {
        "listeningScore": 90,
        "readingScore": 85,
        "speakingScore": 88,
        "writingScore": 87,
        "totalScore": 350,
        "level": "B2"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 30,
    "totalPages": 1
  }
}
```

---

### E.2 出席資料匯入

#### `POST /api/admin/bestep/attendance/import`

**權限**: `authMiddleware` + `adminMiddleware`

**Content-Type**: `multipart/form-data`

**Body**:
- `file` (File, required): Excel/CSV 檔案
- `examSessionId` (string, required): 考試場次 ID
- `examDate` (string, required, format: YYYY-MM-DD): 考試日期
- `examType` (string, required): 'LRSW' | 'LR' | 'SW'

**Excel 格式範例**:
| 學號 | 姓名 | 出席 | 缺席原因 |
|------|------|------|----------|
| B123456789 | 王小明 | 是 | |
| B987654321 | 李小華 | 否 | 請假 |

**Response**:
```json
{
  "success": true,
  "examSessionId": "BESTEP-2025-01-15-LRSW",
  "imported": 25,
  "skipped": 2,
  "errors": [
    {
      "row": 3,
      "studentId": "B999999999",
      "error": "找不到該學號的報名記錄"
    }
  ],
  "errorFileUrl": "/api/admin/bestep/attendance/import/errors/xxx.xlsx"
}
```

---

### E.3 成績資料匯入

#### `POST /api/admin/bestep/scores/import`

**權限**: `authMiddleware` + `adminMiddleware`

**Content-Type**: `multipart/form-data`

**Body**:
- `file` (File, required): Excel/CSV 檔案
- `examSessionId` (string, required): 考試場次 ID
- `examDate` (string, required, format: YYYY-MM-DD): 考試日期
- `examType` (string, required): 'LRSW' | 'LR' | 'SW'

**Excel 格式範例（LRSW）**:
| 學號 | 姓名 | 聽力 | 閱讀 | 口說 | 寫作 | 總分 | 等級 |
|------|------|------|------|------|------|------|------|
| B123456789 | 王小明 | 90 | 85 | 88 | 87 | 350 | B2 |

**Excel 格式範例（LR）**:
| 學號 | 姓名 | 聽力 | 閱讀 | LR總分 | 等級 |
|------|------|------|------|--------|------|
| B123456789 | 王小明 | 90 | 85 | 175 | B2 |

**Response**: 同出席匯入

---

### E.4 團體名次計算

#### `POST /api/admin/bestep/teams/calculate-ranking`

**權限**: `authMiddleware` + `adminMiddleware`

**Body**:
```json
{
  "semester": "114-1"
}
```

**注意**: 
- 排名規則固定為平均分排序（聽+讀+說+寫的平均）
- 支援並列規則（相同平均分並列同一名次）
- 名次跳過規則（並列時後續名次跳過）

**Response**:
```json
{
  "success": true,
  "examSessionId": "BESTEP-2025-01-15-LRSW",
  "rankingRule": "total_score",
  "calculatedAt": "2025-01-20T10:00:00Z",
  "teams": [
    {
      "teamId": 5,
      "teamName": "學習有伴隊",
      "totalScore": 1400,
      "avgScore": 350,
      "passedCount": 4,
      "rank": 1,
      "members": [
        {
          "studentId": "B123456789",
          "name": "王小明",
          "score": 350,
          "passed": true
        }
      ]
    }
  ]
}
```

---

#### `GET /api/admin/bestep/teams/ranking`

**權限**: `authMiddleware` + `adminMiddleware`

**Query Parameters**:
- `semester` (required): 學期，如 '114-1'

**Response**: 同上（不含 `calculatedAt`）

---

## 🎨 F. 前端 UI/UX 設計

### F.1 班級參與概況頁面擴充

#### 新增「BESTEP 報名狀態」欄位

在 `ClassOverview.js` 的班級總覽表格新增欄位：
- **報名率**: `registeredCount / totalStudents * 100`
- **出席率**: `attendedCount / registeredCount * 100`（若已匯入出席資料）
- **達標率**: `passedCount / attendedCount * 100`（若已匯入成績資料）

#### 新增「BESTEP 統計卡片」

在頁面頂部新增統計卡片區塊：
```
┌─────────────┬─────────────┬─────────────┬─────────────┐
│ 總報名人數   │ 報名率      │ 出席率      │ 達標率      │
│ 25 / 30     │ 83.33%      │ 92.00%      │ 86.96%      │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

---

### F.2 班級明細頁面擴充

#### 新增欄位

在 `ClassDetail.js` 的學生明細表格新增欄位：

| 學號 | 姓名 | 系所 | 個人報名 | 團體報名 | 出席 | 成績 | 等級 |
|------|------|------|----------|----------|------|------|------|
| B123456789 | 王小明 | 資訊工程 | ✅ 成功 | 隊伍5 (第1名) | ✅ 出席 | 350 | B2 |
| B987654321 | 李小華 | 資訊工程 | ⏳ 審核中 | - | ❌ 缺席 | - | - |

**顯示邏輯**:
- **個人報名**: 顯示狀態 badge（成功/審核中/請修正/失敗）
- **團體報名**: 顯示「隊伍X (第Y名)」或「-」
- **出席**: 顯示 ✅/❌ icon
- **成績**: 顯示總分（若有）或「-」
- **等級**: 顯示等級（若有）或「-」

#### 新增篩選

在篩選區新增：
- **報名狀態**: 全部 / 已報名 / 未報名
- **出席狀態**: 全部 / 已出席 / 缺席
- **達標狀態**: 全部 / 已達標 / 未達標

#### 新增詳細資料 Modal

點擊學生 row 展開/modal 顯示：
- 個人報名詳情（狀態、報名時間、考試類型等）
- 團體報名詳情（隊伍名稱、成員列表、名次等）
- 出席詳情（考試日期、出席狀態、缺席原因等）
- 成績詳情（各科分數、總分、等級等）

---

## 📊 G. 團體報名名次計算規則

### G.1 方案A：依隊伍總分排序

**規則**:
1. 計算每個隊伍的總分（所有成員的總分加總）
2. 依總分降序排序
3. 總分相同時，依平均分降序排序
4. 平均分相同時，依最高分降序排序

**優點**:
- 簡單直觀
- 計算快速

**缺點**:
- 隊伍人數不同時不公平（4人隊伍 vs 2人隊伍）

**資料需求**:
- 需要 `bestep_exam_scores` 表
- 需要 `LearningPartnerTeamMember` 與 `bestep_exam_scores` JOIN

---

### G.2 實作方案（已確認）

**規則**（依確認的業務規則）:
1. 計算每個隊伍的平均分（所有成員的聽+讀+說+寫總分的平均）
2. 依平均分降序排序
3. **並列規則**：平均分相同者視為並列同一名次
4. **名次跳過規則**：名次並列時，其後名次不再遞補，直接跳過並列名次數依序計算

**範例**:
- 隊伍A、B、C 平均分都是 350，並列第1名
- 隊伍D 平均分 340，名次為第4名（跳過第2、3名）
- 隊伍E 平均分 330，名次為第5名

**獎勵金額對照**:
- 第1名：每人5,000元（隊伍A、B、C 都獲得）
- 第4名：每人2,500元（隊伍D 獲得）
- 第5名：每人2,000元（隊伍E 獲得）

**實作位置**:
- 後端：`reservation-backend/services/bestepRankingService.js`
- API：`POST /api/admin/bestep/teams/calculate-ranking`

---

## 📝 H. 任務拆解與實作步驟

### H.1 Phase 1: 資料庫擴充（不破壞現有功能）

#### Task 1.1: 建立出席資料表
- [ ] 建立 migration: `20250203000001-create-bestep-attendance.js`
- [ ] 建立 model: `BestepAttendance.js`
- [ ] 測試 migration up/down

#### Task 1.2: 建立成績資料表
- [ ] 建立 migration: `20250203000002-create-bestep-exam-scores.js`
- [ ] 建立 model: `BestepExamScore.js`
- [ ] 測試 migration up/down

#### Task 1.3: 建立考試場次表（可選）
- [ ] 建立 migration: `20250203000003-create-bestep-exam-sessions.js`
- [ ] 建立 model: `BestepExamSession.js`
- [ ] 測試 migration up/down

#### Task 1.4: 建立團體名次表（可選）
- [ ] 建立 migration: `20250203000004-create-bestep-team-rankings.js`
- [ ] 建立 model: `BestepTeamRanking.js`
- [ ] 測試 migration up/down

**回滾策略**: 所有 migration 都有 `down()` 方法，可執行 `npx sequelize-cli db:migrate:undo` 回滾。

---

### H.2 Phase 2: 後端 API 開發

#### Task 2.1: 班級 BESTEP 整合查詢 API
- [ ] 建立 controller: `bestepClassController.js`
- [ ] 建立 service: `bestepClassService.js`
- [ ] 建立 route: `GET /api/admin/classes/:classId/bestep-overview`
- [ ] 實作查詢邏輯（JOIN ClassMembership, EnglishTestRegistration, LearningPartnerTeamMember, BestepAttendance, BestepExamScore）
- [ ] 實作統計計算（報名率、出席率、達標率）
- [ ] 單元測試

#### Task 2.2: 出席資料匯入 API
- [ ] 建立 controller: `bestepImportController.js`
- [ ] 建立 service: `bestepImportService.js`
- [ ] 建立 route: `POST /api/admin/bestep/attendance/import`
- [ ] 實作 Excel/CSV 解析
- [ ] 實作資料驗證（學號存在、格式正確）
- [ ] 實作防重邏輯（studentId + examSessionId 唯一）
- [ ] 實作錯誤報表生成
- [ ] 單元測試

#### Task 2.3: 成績資料匯入 API
- [ ] 擴充 `bestepImportController.js`
- [ ] 擴充 `bestepImportService.js`
- [ ] 建立 route: `POST /api/admin/bestep/scores/import`
- [ ] 實作 Excel/CSV 解析（支援 LRSW/LR/SW 格式）
- [ ] 實作資料驗證
- [ ] 實作防重邏輯
- [ ] 單元測試

#### Task 2.4: 團體名次計算 API
- [ ] 建立 service: `bestepRankingService.js`
- [ ] 建立 route: `POST /api/admin/bestep/teams/calculate-ranking`
- [ ] 建立 route: `GET /api/admin/bestep/teams/ranking`
- [ ] 實作 ranking rule: `total_score`
- [ ] 實作 ranking rule: `avg_score`
- [ ] 實作 ranking rule: `passed_count`
- [ ] 單元測試

**回滾策略**: 
- API 路由可透過 feature flag 控制開關
- 若出問題，可暫時停用路由，不影響既有功能

---

### H.3 Phase 3: 前端 UI 擴充

#### Task 3.1: 班級參與概況頁面擴充
- [ ] 擴充 `ClassOverview.js`
- [ ] 新增 BESTEP 統計卡片
- [ ] 新增 BESTEP 欄位（報名率、出席率、達標率）
- [ ] 新增篩選（examSessionId）
- [ ] 測試

#### Task 3.2: 班級明細頁面擴充
- [ ] 擴充 `ClassDetail.js`
- [ ] 新增欄位（個人報名、團體報名、出席、成績）
- [ ] 新增篩選（報名狀態、出席狀態、達標狀態）
- [ ] 新增詳細資料 Modal
- [ ] 測試

#### Task 3.3: 匯入功能 UI
- [ ] 建立 `BestepImportPage.js`（或整合到現有管理頁面）
- [ ] 實作出席資料匯入表單
- [ ] 實作成績資料匯入表單
- [ ] 實作匯入結果顯示（成功/失敗/錯誤報表下載）
- [ ] 測試

**回滾策略**:
- 前端可透過 feature flag 控制顯示/隱藏
- 若出問題，可暫時隱藏新增欄位，不影響既有功能

---

### H.4 Phase 4: 整合測試與文件

#### Task 4.1: 整合測試
- [ ] E2E 測試（班級參與概況頁面）
- [ ] E2E 測試（匯入流程）
- [ ] E2E 測試（團體名次計算）
- [ ] 效能測試（大量資料查詢）

#### Task 4.2: 文件更新
- [ ] 更新 API 文件
- [ ] 更新資料庫文件
- [ ] 更新使用者手冊（匯入格式說明）

---

## 🔄 I. 回滾策略

### I.1 資料庫回滾

**方法**:
```bash
# 回滾所有 migration
npx sequelize-cli db:migrate:undo:all

# 或回滾特定 migration
npx sequelize-cli db:migrate:undo --name 20250203000001-create-bestep-attendance.js
```

**注意**: 回滾前需備份資料。

---

### I.2 API 回滾

**方法**:
1. 移除或註解路由註冊（`server.js`）
2. 移除 controller/service 檔案（或重命名為 `.bak`）
3. 重啟服務

---

### I.3 前端回滾

**方法**:
1. 使用 feature flag 控制顯示/隱藏
2. 或移除新增的元件/頁面
3. 重新部署前端

---

## ✅ J. 交付檢查清單

- [x] 現況盤點清單（DB tables、API、UI）
- [x] 缺口與風險分析
- [x] 最小變更方案（DB migration、API、前端）
- [x] Mermaid ERD
- [x] 任務拆解與回滾策略
- [ ] **待確認**: 業務規則確認（見 C.1）
- [ ] **待確認**: 資料格式確認（見 C.1）

---

## 📌 下一步行動

1. **確認業務規則**（見 C.1 問題清單）
2. **確認資料格式**（Excel 欄位、場次定義等）
3. **開始 Phase 1**: 建立資料庫 migration
4. **開始 Phase 2**: 開發後端 API
5. **開始 Phase 3**: 擴充前端 UI

---

**報告完成時間**: 2025-02-03
**報告版本**: v1.0
