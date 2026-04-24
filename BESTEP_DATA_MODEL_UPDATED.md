# BESTEP 資料模型更新說明

## 📋 重要變更

根據實際 Excel 檔案結構，資料模型已更新：

### 1. 考試場次結構變更

**原設計**: 一個學期一場考試（LRSW）
**實際情況**: 一個學期兩場考試（LR 和 SW 分開）

**影響**:
- `bestep_attendance` 表需要 `examType` 欄位（'LR' 或 'SW'）
- 出缺席資料需要分兩次匯入
- 查詢時需要指定 `examType` 或顯示兩場資訊

---

### 2. 成績資料結構變更

**原設計**: 僅有總分對應的 CEFR 等級
**實際情況**: 各項分別有 CEFR 等級（聽力等級、閱讀等級、口說等級、寫作等級）

**影響**:
- `bestep_exam_scores` 表需要新增各項等級欄位：
  - `listeningLevel`
  - `readingLevel`
  - `speakingLevel`
  - `writingLevel`
- 達標判斷：各項都達 B2 以上才算達標
- 整體等級：取最低項等級

---

## 📊 更新後的資料模型

### `bestep_attendance` 表

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

**關鍵變更**:
- ✅ 新增 `examType` 欄位（'LR' 或 'SW'）
- ✅ UNIQUE KEY 改為 `(studentId, semester, examType)`

---

### `bestep_exam_scores` 表

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

**關鍵變更**:
- ✅ 新增各項等級欄位：`listeningLevel`, `readingLevel`, `speakingLevel`, `writingLevel`
- ✅ 新增 `overallLevel` 欄位（取最低項等級）
- ✅ `passed` 判斷邏輯：各項都達 B2 以上

---

### `bestep_exam_sessions` 表

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

**關鍵變更**:
- ✅ 分為 `lrExamDate` 和 `swExamDate` 兩個欄位

---

## 🔄 API 變更

### 1. 班級 BESTEP 概況查詢

**端點**: `GET /api/admin/classes/:classId/bestep-overview`

**Query Parameters 變更**:
- 新增 `examType` (optional): 'LR' | 'SW' | 'all'（預設 'all'）

**Response 變更**:
```json
{
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
    "listeningLevel": "B2",
    "readingLevel": "B2",
    "speakingLevel": "C1",
    "writingLevel": "B2",
    "totalScore": 350,
    "overallLevel": "B2",
    "passed": true
  }
}
```

---

### 2. 出席資料匯入

**端點**: `POST /api/admin/bestep/attendance/import`

**Body 變更**:
- 新增 `examType` (required): 'LR' 或 'SW'

**注意**: 需要分別匯入兩次（一次 LR，一次 SW）

---

### 3. 成績資料匯入

**端點**: `POST /api/admin/bestep/scores/import`

**Body 變更**:
- 移除 `examDate`（成績資料包含兩場的成績）
- 移除 `examType`（一次匯入即可）

**處理邏輯**:
- 解析各項分數和等級
- 計算總分：`totalScore = listeningScore + readingScore + speakingScore + writingScore`
- 計算整體等級：`overallLevel = min(listeningLevel, readingLevel, speakingLevel, writingLevel)`
- 判斷達標：`passed = (listeningLevel >= 'B2' AND readingLevel >= 'B2' AND speakingLevel >= 'B2' AND writingLevel >= 'B2')`

---

## 📝 實作注意事項

### 1. Excel 欄位名稱自動識別

系統需要支援以下欄位名稱變體：

**成績資料**:
- 聽力等級：`聽力等級`、`Listening Level`、`listeningLevel`、`聽力CEFR`、`聽力級別`
- 閱讀等級：`閱讀等級`、`Reading Level`、`readingLevel`、`閱讀CEFR`、`閱讀級別`
- 口說等級：`口說等級`、`Speaking Level`、`speakingLevel`、`口說CEFR`、`口說級別`
- 寫作等級：`寫作等級`、`Writing Level`、`writingLevel`、`寫作CEFR`、`寫作級別`

### 2. 達標判斷邏輯

```javascript
function calculatePassed(listeningLevel, readingLevel, speakingLevel, writingLevel) {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const minLevelIndex = levels.indexOf('B2');
  
  const listeningIndex = levels.indexOf(listeningLevel);
  const readingIndex = levels.indexOf(readingLevel);
  const speakingIndex = levels.indexOf(speakingLevel);
  const writingIndex = levels.indexOf(writingLevel);
  
  return listeningIndex >= minLevelIndex && 
         readingIndex >= minLevelIndex && 
         speakingIndex >= minLevelIndex && 
         writingIndex >= minLevelIndex;
}

function calculateOverallLevel(listeningLevel, readingLevel, speakingLevel, writingLevel) {
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const indices = [
    levels.indexOf(listeningLevel),
    levels.indexOf(readingLevel),
    levels.indexOf(speakingLevel),
    levels.indexOf(writingLevel)
  ].filter(idx => idx >= 0);
  
  if (indices.length === 0) return null;
  return levels[Math.min(...indices)];
}
```

### 3. 團體名次計算

團體名次計算邏輯不變（依平均分排序），但需注意：
- 平均分計算：`avgScore = (listeningScore + readingScore + speakingScore + writingScore) / 4`
- 達標判斷：各項都達 B2 以上

---

**文件版本**: v2.0
**最後更新**: 2025-02-03
**變更原因**: 根據實際 Excel 檔案結構調整
