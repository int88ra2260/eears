# 班級參與概況資料流

## ER 圖（實體關係圖）

```mermaid
erDiagram
    Class ||--o{ ClassMembership : "has"
    Class ||--o{ ClassTeacher : "has"
    ClassMembership ||--o{ Reservation : "may have"
    Reservation }o--|| Event : "belongs to"
    Reservation }o--|| User : "belongs to"
    User ||--o{ BlackListRecord : "may have"
    Event ||--o{ EventViolation : "may have"
    
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
    
    ClassTeacher {
        int id PK
        int classId FK
        int teacherId FK
    }
    
    Reservation {
        int id PK
        int eventId FK
        int userId FK
        string studentId
        string checkinStatus
        datetime checkinTime
    }
    
    Event {
        int id PK
        string name
        string date
        string eventType
        int maxCapacity
    }
    
    User {
        int id PK
        string studentId
        string name
        string email
        int violationCount
        boolean isBlacklisted
        datetime blacklistUntil
    }
```

## 資料來源與輸出欄位對照

### 輸入資料來源

#### 1. 班級名單（Excel 匯入）
| 欄位 | 說明 | 必填 |
|------|------|------|
| 學號 | 學生學號 | ✅ |
| 姓名 | 學生姓名 | ✅ |
| 系所 | 學生系所 | ❌ |
| Email | 學生 Email | ❌ |
| 年級 | 學生年級 | ❌ |

#### 2. 預約與活動資料（資料庫）
- `Reservations` 表：預約紀錄
- `Events` 表：活動資訊
- `Users` 表：使用者資訊
- `BlackListRecord` 表：違規紀錄

---

### 輸出資料欄位

#### 班級總覽（統計區塊 - 不顯示系所）
| 欄位 | 說明 | 來源 |
|------|------|------|
| 班級名稱 | 班級名稱 | `Class.name` |
| 老師姓名 | 任課老師 | `Class.teacherName` |
| 名冊人數 | 班級成員總數 | `ClassMembership.count()` |
| 至少參與人數 | 有參與活動的學生數 | `Reservations` 統計 |
| 參與率 | 至少參與人數 / 名冊人數 | 計算得出 |
| 簽到總次數 | 所有學生簽到次數總和 | `Reservations.checkinStatus = '已簽到'` |
| 平均參與次數 | 簽到總次數 / 名冊人數 | 計算得出 |
| No-shows總數 | 未到場次數 | `Reservations.checkinStatus = '已登記違規'` |

#### 班級明細（學生明細 - 保留系所）
| 欄位 | 說明 | 來源 |
|------|------|------|
| 學號 | 學生學號 | `ClassMembership.studentId` |
| 姓名 | 學生姓名 | `ClassMembership.studentName` |
| **系所** | **學生系所** | **`ClassMembership.department`** |
| Email | 學生 Email | `ClassMembership.email` |
| 預約數 | 學生預約次數 | `Reservations` 統計 |
| 簽到數 | 學生簽到次數 | `Reservations.checkinStatus = '已簽到'` |
| No-shows | 學生未到次數 | `Reservations.checkinStatus = '已登記違規'` |

---

## 資料處理流程

### 1. 班級名單匯入

```
Excel 檔案上傳
  ↓
解析 Excel (XLSX)
  ↓
驗證欄位（學號、姓名必填）
  ↓
建立或更新 Class 記錄
  ↓
建立或更新 ClassMembership 記錄
  ↓
返回匯入結果
```

### 2. 統計計算

```
選擇學期與活動類型
  ↓
查詢 Class (where: semester)
  ↓
對每個班級：
  ├─ 取得 ClassMembership 列表
  ├─ 計算名冊人數
  ├─ 查詢該班學生的預約紀錄
  ├─ 計算參與統計（簽到、No-show）
  └─ 計算參與率
  ↓
排序與分頁
  ↓
返回統計資料
```

### 3. 明細查詢

```
選擇班級與學期
  ↓
查詢 ClassMembership (where: classId, semester)
  ↓
對每個學生：
  ├─ 查詢該學生的預約紀錄
  ├─ 計算預約數、簽到數、No-show數
  └─ 組合輸出資料
  ↓
排序與分頁
  ↓
返回明細資料
```

---

## 頁面顯示邏輯

### 班級總覽頁面（`/admin/classes`）

```
頁面頂部
  ├─ 標題：班級參與概況 (114-1)
  ├─ 操作按鈕：下載範例、匯入名單、匯出 Excel
  └─ 篩選控制：學期、活動類型、搜尋、排序

內容區域
  ├─ 圖表區塊（如有資料）
  │   ├─ 各班參與率（Bar Chart）
  │   └─ 活動類型分布（Pie Chart）
  │
  └─ 統計表格（不顯示系所）
      ├─ 班級名稱
      ├─ 老師姓名
      ├─ 名冊人數
      ├─ 至少參與人數
      ├─ 參與率
      ├─ 簽到總次數
      ├─ 平均參與次數
      ├─ No-shows總數
      └─ 操作（查看明細）
```

### 班級明細頁面（`/admin/classes/:classId/detail`）

```
頁面頂部
  ├─ 返回總覽按鈕
  ├─ 標題：班級名稱 (114-1)
  ├─ 老師姓名（如有）
  └─ 匯出 Excel 按鈕

內容區域
  ├─ 篩選控制：學期、活動類型、搜尋、排序
  │
  ├─ 統計摘要卡片
  │   ├─ 名冊人數
  │   ├─ 至少參與人數
  │   ├─ 簽到總次數
  │   └─ No-shows總數
  │
  └─ 學生明細表格（保留系所）
      ├─ 學號
      ├─ 姓名
      ├─ 系所 ⭐
      ├─ Email
      ├─ 預約數
      ├─ 簽到數
      └─ No-shows
```

---

## 匯出功能

### CSV/Excel 匯出格式

#### 班級總覽匯出
- 檔案名：`班級參與概況_114-1.xlsx`
- 編碼：UTF-8
- 欄位：班級名稱、老師姓名、名冊人數、至少參與人數、參與率、簽到總次數、平均參與次數、No-shows總數

#### 班級明細匯出
- 檔案名：`{班級名稱}_明細_114-1.xlsx`
- 編碼：UTF-8
- 欄位：學號、姓名、系所、Email、預約數、簽到數、No-shows

---

**文件版本**: v1.0.0
**最後更新**: 2025-01-XX

