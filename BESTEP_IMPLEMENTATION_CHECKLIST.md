# BESTEP 整合實作檢查清單

## ✅ 已確認的業務規則

- [x] `status='success'` 即為報名成功
- [x] 團體名次依平均分排序，支援並列規則
- [x] 達標標準：各項都達 CEFR B2 以上
- [x] 考試場次：一個學期兩場（LR 和 SW）
- [x] 成績格式：L/R/S/W 四個分數 + 各項 CEFR 等級
- [x] 班級定義：同一學生可在同一學期屬於多個班級

---

## 📊 資料模型設計（已更新）

### 需要建立的 Migration

- [ ] `20250203000001-create-bestep-attendance.js`
  - [ ] 建立 `bestep_attendance` 表
  - [ ] 欄位：`studentId`, `semester`, `examType` ('LR'/'SW'), `examDate`, `attended`, `absentReason`
  - [ ] UNIQUE KEY: `(studentId, semester, examType)`
  - [ ] 索引：`semester`, `examType`, `studentId`

- [ ] `20250203000002-create-bestep-exam-scores.js`
  - [ ] 建立 `bestep_exam_scores` 表
  - [ ] 欄位：`studentId`, `semester`, `listeningScore`, `readingScore`, `speakingScore`, `writingScore`
  - [ ] 欄位：`listeningLevel`, `readingLevel`, `speakingLevel`, `writingLevel`
  - [ ] 欄位：`totalScore`（自動計算）, `overallLevel`（取最低項）, `passed`（各項都達 B2）
  - [ ] UNIQUE KEY: `(studentId, semester)`
  - [ ] 索引：`semester`, `studentId`, `passed`

- [ ] `20250203000003-create-bestep-exam-sessions.js`
  - [ ] 建立 `bestep_exam_sessions` 表
  - [ ] 欄位：`semester`, `lrExamDate`, `swExamDate`
  - [ ] UNIQUE KEY: `semester`

- [ ] `20250203000004-create-bestep-team-rankings.js`
  - [ ] 建立 `bestep_team_rankings` 表
  - [ ] 欄位：`teamId`, `semester`, `avgScore`, `rank`, `rewardAmount`
  - [ ] UNIQUE KEY: `(teamId, semester)`
  - [ ] 索引：`semester`, `rank`

---

## 🔌 API 開發檢查清單

### 1. 班級 BESTEP 整合查詢 API

- [ ] 建立 `bestepClassController.js`
- [ ] 建立 `bestepClassService.js`
- [ ] 建立 route: `GET /api/admin/classes/:classId/bestep-overview`
- [ ] 實作查詢邏輯：
  - [ ] JOIN `ClassMembership` → `EnglishTestRegistration`（個人報名）
  - [ ] JOIN `ClassMembership` → `LearningPartnerTeamMember` → `LearningPartnerTeam`（團體報名）
  - [ ] JOIN `ClassMembership` → `BestepAttendance`（LR 和 SW 兩場）
  - [ ] JOIN `ClassMembership` → `BestepExamScore`（成績）
  - [ ] JOIN `LearningPartnerTeam` → `BestepTeamRanking`（團體名次）
- [ ] 實作統計計算：
  - [ ] 報名率 = `registeredCount / totalStudents`
  - [ ] LR 出席率 = `lrAttendedCount / registeredCount`
  - [ ] SW 出席率 = `swAttendedCount / registeredCount`
  - [ ] 達標率 = `passedCount / attendedCount`
  - [ ] 平均分 = `AVG(totalScore)`
- [ ] 支援篩選：`examType` ('LR' | 'SW' | 'all')
- [ ] 單元測試

---

### 2. 出席資料匯入 API

- [ ] 建立 `bestepImportController.js`
- [ ] 建立 `bestepImportService.js`
- [ ] 建立 route: `POST /api/admin/bestep/attendance/import`
- [ ] 實作 Excel 解析：
  - [ ] 支援 `.xlsx` 和 `.xls` 格式
  - [ ] 自動識別欄位名稱變體
  - [ ] 解析學號、姓名、出席狀態、缺席原因
- [ ] 實作資料驗證：
  - [ ] 學號格式驗證
  - [ ] 學號存在於 `english_test_registrations`（且 `status='success'`）
  - [ ] 出席狀態值驗證（出席/缺席）
- [ ] 實作防重邏輯：`(studentId, semester, examType)` 唯一
- [ ] 實作錯誤報表生成（Excel 格式）
- [ ] 單元測試

---

### 3. 成績資料匯入 API

- [ ] 擴充 `bestepImportController.js`
- [ ] 擴充 `bestepImportService.js`
- [ ] 建立 route: `POST /api/admin/bestep/scores/import`
- [ ] 實作 Excel 解析：
  - [ ] 支援 `.xls` 格式
  - [ ] 自動識別欄位名稱變體
  - [ ] 解析學號、姓名、各項分數、各項等級
- [ ] 實作資料驗證：
  - [ ] 學號格式驗證
  - [ ] 學號存在於 `english_test_registrations`（且 `status='success'`）
  - [ ] 分數範圍驗證（0-150，可配置）
  - [ ] 等級格式驗證（A1, A2, B1, B2, C1, C2）
- [ ] 實作計算邏輯：
  - [ ] `totalScore = listeningScore + readingScore + speakingScore + writingScore`
  - [ ] `overallLevel = min(listeningLevel, readingLevel, speakingLevel, writingLevel)`
  - [ ] `passed = (listeningLevel >= 'B2' AND readingLevel >= 'B2' AND speakingLevel >= 'B2' AND writingLevel >= 'B2')`
- [ ] 實作防重邏輯：`(studentId, semester)` 唯一
- [ ] 實作錯誤報表生成
- [ ] 單元測試

---

### 4. 團體名次計算 API

- [ ] 建立 `bestepRankingService.js`
- [ ] 建立 route: `POST /api/admin/bestep/teams/calculate-ranking`
- [ ] 建立 route: `GET /api/admin/bestep/teams/ranking`
- [ ] 實作名次計算邏輯：
  - [ ] 查詢所有 `status='approved'` 的團體
  - [ ] 對每個團體：
    - [ ] 取得所有成員的 `bestep_exam_scores`
    - [ ] 計算平均分：`avgScore = AVG(listeningScore + readingScore + speakingScore + writingScore)`
  - [ ] 依平均分降序排序
  - [ ] 處理並列規則：
    - [ ] 相同平均分視為並列同一名次
    - [ ] 名次跳過規則（並列時後續名次跳過）
  - [ ] 計算獎勵金額：
    - [ ] 第1名：5,000元
    - [ ] 第2名：4,000元
    - [ ] 第3名：3,000元
    - [ ] 第4名：2,500元
    - [ ] 第5名：2,000元
    - [ ] 第6-10名：1,500元
    - [ ] 第11-20名：1,000元
  - [ ] 儲存到 `bestep_team_rankings` 表
- [ ] 單元測試

---

## 🎨 前端 UI 開發檢查清單

### 1. 班級參與概況頁面擴充

- [ ] 擴充 `ClassOverview.js`
- [ ] 新增 BESTEP 統計卡片：
  - [ ] 總報名人數
  - [ ] 報名率
  - [ ] LR 出席率
  - [ ] SW 出席率
  - [ ] 達標率
  - [ ] 平均分
- [ ] 新增 BESTEP 欄位（班級總覽表格）：
  - [ ] 報名率
  - [ ] LR 出席率
  - [ ] SW 出席率
  - [ ] 達標率
- [ ] 新增篩選：`examType` ('LR' | 'SW' | 'all')
- [ ] 測試

---

### 2. 班級明細頁面擴充

- [ ] 擴充 `ClassDetail.js`
- [ ] 新增欄位（學生明細表格）：
  - [ ] 個人報名狀態（badge）
  - [ ] 團體報名資訊（隊伍X (第Y名)）
  - [ ] LR 出席狀態（✅/❌）
  - [ ] SW 出席狀態（✅/❌）
  - [ ] 成績（總分）
  - [ ] 等級（整體等級）
  - [ ] 達標狀態（✅/❌）
- [ ] 新增篩選：
  - [ ] 報名狀態：全部 / 已報名 / 未報名
  - [ ] LR 出席狀態：全部 / 已出席 / 缺席
  - [ ] SW 出席狀態：全部 / 已出席 / 缺席
  - [ ] 達標狀態：全部 / 已達標 / 未達標
- [ ] 新增詳細資料 Modal：
  - [ ] 個人報名詳情
  - [ ] 團體報名詳情（含名次和獎勵金額）
  - [ ] LR 出席詳情
  - [ ] SW 出席詳情
  - [ ] 成績詳情（各項分數和等級）
- [ ] 測試

---

### 3. 匯入功能 UI

- [ ] 建立 `BestepImportPage.js`（或整合到現有管理頁面）
- [ ] 實作出席資料匯入表單：
  - [ ] 檔案選擇（支援 .xlsx, .xls）
  - [ ] 學期選擇
  - [ ] 考試類型選擇（LR / SW）
  - [ ] 考試日期輸入
  - [ ] 上傳按鈕
- [ ] 實作成績資料匯入表單：
  - [ ] 檔案選擇（支援 .xls）
  - [ ] 學期選擇
  - [ ] 上傳按鈕
- [ ] 實作匯入結果顯示：
  - [ ] 成功筆數
  - [ ] 跳過筆數
  - [ ] 錯誤列表
  - [ ] 錯誤報表下載連結
- [ ] 測試

---

## 🧪 測試檢查清單

### 單元測試

- [ ] `bestepClassService.test.js`
  - [ ] 測試查詢邏輯
  - [ ] 測試統計計算
  - [ ] 測試篩選功能

- [ ] `bestepImportService.test.js`
  - [ ] 測試 Excel 解析
  - [ ] 測試資料驗證
  - [ ] 測試防重邏輯
  - [ ] 測試錯誤處理

- [ ] `bestepRankingService.test.js`
  - [ ] 測試平均分計算
  - [ ] 測試並列規則
  - [ ] 測試名次跳過規則
  - [ ] 測試獎勵金額計算

### 整合測試

- [ ] E2E 測試：班級參與概況頁面
- [ ] E2E 測試：出席資料匯入流程
- [ ] E2E 測試：成績資料匯入流程
- [ ] E2E 測試：團體名次計算流程

---

## 📝 文件更新檢查清單

- [ ] 更新 API 文件
- [ ] 更新資料庫文件
- [ ] 更新使用者手冊（匯入格式說明）
- [ ] 更新開發者文件（資料模型說明）

---

## ⚠️ 注意事項

### 1. Excel 欄位名稱自動識別

系統需要支援多種欄位名稱變體，建議建立欄位名稱對應表：

```javascript
const FIELD_MAPPINGS = {
  attendance: {
    studentId: ['學號', 'Student ID', 'studentId', '學號代碼'],
    name: ['姓名', 'Name', 'name', '學生姓名'],
    attended: ['出席狀態', 'Attendance', 'attended', '是否出席', '出席/缺席'],
    absentReason: ['缺席原因', 'Absent Reason', 'absentReason', '原因', '備註']
  },
  scores: {
    studentId: ['學號', 'Student ID', 'studentId', '學號代碼'],
    name: ['姓名', 'Name', 'name', '學生姓名'],
    listeningScore: ['聽力分數', 'Listening', 'listeningScore', '聽力', 'L', '聽力成績'],
    readingScore: ['閱讀分數', 'Reading', 'readingScore', '閱讀', 'R', '閱讀成績'],
    speakingScore: ['口說分數', 'Speaking', 'speakingScore', '口說', 'S', '口說成績'],
    writingScore: ['寫作分數', 'Writing', 'writingScore', '寫作', 'W', '寫作成績'],
    listeningLevel: ['聽力等級', 'Listening Level', 'listeningLevel', '聽力CEFR', '聽力級別'],
    readingLevel: ['閱讀等級', 'Reading Level', 'readingLevel', '閱讀CEFR', '閱讀級別'],
    speakingLevel: ['口說等級', 'Speaking Level', 'speakingLevel', '口說CEFR', '口說級別'],
    writingLevel: ['寫作等級', 'Writing Level', 'writingLevel', '寫作CEFR', '寫作級別']
  }
};
```

### 2. CEFR 等級比較

需要實作 CEFR 等級比較函數：

```javascript
const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

function compareLevel(level1, level2) {
  const index1 = CEFR_LEVELS.indexOf(level1);
  const index2 = CEFR_LEVELS.indexOf(level2);
  if (index1 === -1 || index2 === -1) return null;
  return index1 - index2;
}

function getMinLevel(...levels) {
  const indices = levels.map(l => CEFR_LEVELS.indexOf(l)).filter(i => i >= 0);
  if (indices.length === 0) return null;
  return CEFR_LEVELS[Math.min(...indices)];
}

function isPassed(listeningLevel, readingLevel, speakingLevel, writingLevel) {
  const minLevelIndex = CEFR_LEVELS.indexOf('B2');
  return [listeningLevel, readingLevel, speakingLevel, writingLevel]
    .every(level => CEFR_LEVELS.indexOf(level) >= minLevelIndex);
}
```

### 3. 團體名次並列處理

```javascript
function calculateRankings(teams) {
  // 1. 依平均分降序排序
  const sorted = teams.sort((a, b) => b.avgScore - a.avgScore);
  
  // 2. 計算名次（處理並列）
  let currentRank = 1;
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].avgScore !== sorted[i - 1].avgScore) {
      // 分數不同，計算跳過的名次數
      const tiedCount = i - (currentRank - 1);
      currentRank = i + 1 + tiedCount;
    }
    sorted[i].rank = currentRank;
  }
  
  // 3. 計算獎勵金額
  sorted.forEach(team => {
    if (team.rank === 1) team.rewardAmount = 5000;
    else if (team.rank === 2) team.rewardAmount = 4000;
    else if (team.rank === 3) team.rewardAmount = 3000;
    else if (team.rank === 4) team.rewardAmount = 2500;
    else if (team.rank === 5) team.rewardAmount = 2000;
    else if (team.rank >= 6 && team.rank <= 10) team.rewardAmount = 1500;
    else if (team.rank >= 11 && team.rank <= 20) team.rewardAmount = 1000;
    else team.rewardAmount = 0;
  });
  
  return sorted;
}
```

---

**文件版本**: v1.0
**最後更新**: 2025-02-03
