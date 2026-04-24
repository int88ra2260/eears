# EEARS 後端 API 規格文件

## 更新日期：2025-01-XX

## 一、認證相關 API

### POST /api/login
**描述**: 使用者登入

**請求**:
```json
{
  "username": "string",
  "password": "string"
}
```

**回應**:
```json
{
  "token": "string",
  "userRole": "admin" | "worker",
  "username": "string"
}
```

---

## 二、預約相關 API

### POST /api/reservations
**描述**: 建立預約

**請求**:
```json
{
  "eventId": "number",
  "studentId": "string (B/M/D/I/J + 9位數字)",
  "studentName": "string",
  "studentEmail": "string",
  "eventType": "string"
}
```

**回應（成功）**:
```json
{
  "message": "預約成功",
  "reservation": { ... },
  "reservedCount": 10,
  "availableSpots": 20
}
```

**錯誤回應（400）**:
```json
{
  "success": false,
  "errorCode": "MISSING_STUDENT_ID" | "INVALID_STUDENT_ID" | "MISSING_STUDENT_NAME" | "MISSING_STUDENT_EMAIL",
  "message": "缺少必要欄位：studentId",
  "error": "缺少必要欄位：學號"
}
```

**錯誤回應（409 - 需要填寫問卷）**:
```json
{
  "error": "請先完成English Table問卷調查才能進行預約",
  "code": "ENGLISH_TABLE_SURVEY_REQUIRED" | "ENGLISH_CLUB_SURVEY_REQUIRED",
  "redirectUrl": "/survey/english_table_feedback_114_1"
}
```

**錯誤回應（403 - 黑名單）**:
```json
{
  "error": "您目前在黑名單封禁期間，無法預約"
}
```

---

### GET /api/users/blacklist-status
**描述**: 檢查黑名單狀態（預約前檢查）

**請求參數**:
- `studentId` (query, required): 學號

**回應**:
```json
{
  "isBlacklisted": false,
  "violationCount": 0,
  "blacklistUntil": null,
  "studentId": "B123456789",
  "name": "姓名"
}
```

---

### DELETE /api/reservations/:id
**描述**: 取消預約

**回應**:
```json
{
  "message": "已取消該預約"
}
```

---

### GET /api/reservations/public
**描述**: 公開查詢預約（不需要認證）

**請求參數**:
- `studentId` (query, optional): 學號
- `studentName` (query, optional): 姓名
- `studentEmail` (query, optional): Email

**回應**:
```json
[
  {
    "id": 1,
    "studentId": "B123456789",
    "studentName": "姓名",
    "studentEmail": "email@example.com",
    "timestamp": "2025-01-01T10:00:00.000Z",
    "eventId": 1,
    "eventName": "活動名稱",
    "date": "2025-01-15",
    "startTime": "12:00",
    "endTime": "13:00"
  }
]
```

---

## 三、活動相關 API

### GET /api/events
**描述**: 取得所有活動（前台，無需認證）

**回應**:
```json
[
  {
    "id": 1,
    "name": "活動名稱",
    "date": "2025-01-15",
    "startTime": "12:00",
    "endTime": "13:00",
    "maxCapacity": 30,
    "eventType": "English Table",
    "availableSpots": 20
  }
]
```

---

### GET /api/events/:id/reservations
**描述**: 取得活動預約詳情（需認證）

**回應**:
```json
{
  "reservations": [
    {
      "id": 1,
      "studentId": "B123456789",
      "studentName": "姓名",
      "studentEmail": "email@example.com",
      "checkinStatus": "已簽到" | "未簽到" | "已登記違規",
      "checkinTime": "2025-01-15T12:05:00.000Z",
      "group": "Group 1" | null
    }
  ],
  "eventDate": "2025-01-15",
  "eventName": "活動名稱",
  "eventType": "English Table"
}
```

---

### POST /api/events/:id/checkin
**描述**: 簽到功能（需認證）

**請求**:
```json
{
  "reservationId": 1
}
```

**回應**:
```json
{
  "message": "簽到成功",
  "checkinTime": "2025-01-15T12:05:00.000Z"
}
```

---

### POST /api/events/:id/violations
**描述**: 登記活動違規（需認證）

**請求**:
```json
{
  "studentId": "B123456789",
  "violationType": "擾亂秩序" | "未遵守規定" | "其他",
  "description": "string (optional)"
}
```

**錯誤回應（400）**:
```json
{
  "success": false,
  "errorCode": "MISSING_STUDENT_ID" | "MISSING_VIOLATION_TYPE",
  "message": "缺少必要參數：studentId",
  "error": "請提供學號"
}
```

---

### POST /api/events/:id/auto-check
**描述**: 活動結束後自動檢查並記錄違規（管理員專用）

**回應**:
```json
{
  "processedCount": 10,
  "violationRecords": 2,
  "noShowRecords": 3,
  "errors": []
}
```

---

## 四、問卷相關 API

### POST /api/surveys/:surveyId
**描述**: 提交問卷

**請求**:
```json
{
  "studentId": "B123456789",
  "studentName": "姓名",
  "studentEmail": "email@example.com",
  "grade": "一年級",
  "department": "科系",
  "q1": 5,
  "q2": 4,
  ...
}
```

**錯誤回應（400）**:
```json
{
  "success": false,
  "errorCode": "INVALID_STUDENT_ID" | "SURVEY_ALREADY_FILLED",
  "message": "學號格式不正確",
  "error": "請提供有效的學號"
}
```

---

### GET /api/surveys/check/:surveyId/:studentId
**描述**: 檢查問卷填寫狀態

**回應**:
```json
{
  "filled": true | false
}
```

**錯誤回應（400）**:
```json
{
  "success": false,
  "errorCode": "MISSING_STUDENT_ID" | "UNSUPPORTED_SURVEY_TYPE",
  "message": "缺少必要參數：studentId",
  "error": "請提供學號"
}
```

---

### GET /api/admin/surveys/export/:surveyId
**描述**: 匯出問卷資料 Excel（管理員專用）

**回應**: Excel 檔案（binary）

---

## 五、黑名單相關 API

### POST /api/blacklist/recordViolation
**描述**: 登記違規（需認證）

**請求**:
```json
{
  "studentId": "B123456789",
  "name": "姓名 (optional)",
  "reason": "string (optional)"
}
```

**錯誤回應（400）**:
```json
{
  "success": false,
  "errorCode": "MISSING_IDENTIFIER",
  "message": "請提供學號或姓名",
  "error": "請提供學號或姓名"
}
```

---

### GET /api/blacklist
**描述**: 取得所有違規紀錄（需認證）

**請求參數**:
- `semester` (query, optional): 學期（如 '114-1'）

**回應**: 違規紀錄陣列

---

## 六、班級參與概況 API

### GET /api/admin/classes/overview
**描述**: 取得班級參與概況（管理員專用）

**請求參數**:
- `semester` (query, default: '114-1'): 學期
- `activityType` (query, default: 'All'): 活動類型
- `q` (query, optional): 搜尋關鍵字
- `sortBy` (query, default: 'coverage'): 排序欄位
- `sortOrder` (query, default: 'desc'): 排序順序
- `page` (query, default: 1): 頁碼
- `pageSize` (query, default: 20): 每頁筆數

**回應**:
```json
{
  "data": [
    {
      "classId": 1,
      "className": "班級名稱",
      "teacherName": "老師姓名",
      "studentCount": 30,
      "participatedCount": 25,
      "coverage": 83.33,
      "attendedCountTotal": 50,
      "avgAttendPerStudent": 1.67,
      "noShowCountTotal": 2,
      "byType": {
        "EnglishTable": 30,
        "EnglishClub": 20
      }
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 10,
    "totalPages": 1
  }
}
```

---

### GET /api/admin/classes/:classId/overview
**描述**: 取得班級明細（管理員專用）

**請求參數**: 同 `/api/admin/classes/overview`

**回應**:
```json
{
  "classInfo": {
    "id": 1,
    "name": "班級名稱",
    "semester": "114-1",
    "department": "系所",
    "teacherName": "老師姓名"
  },
  "data": [
    {
      "studentId": "B123456789",
      "studentName": "姓名",
      "department": "系所",
      "email": "email@example.com",
      "reservedCount": 5,
      "attendedCountTotal": 4,
      "noShowCount": 1
    }
  ],
  "pagination": { ... }
}
```

---

## 錯誤碼對照表

| 錯誤碼 | HTTP 狀態碼 | 說明 |
|--------|------------|------|
| MISSING_STUDENT_ID | 400 | 缺少學號參數 |
| MISSING_STUDENT_NAME | 400 | 缺少姓名參數 |
| MISSING_STUDENT_EMAIL | 400 | 缺少 Email 參數 |
| MISSING_EVENT_ID | 400 | 缺少活動 ID 參數 |
| MISSING_VIOLATION_TYPE | 400 | 缺少違規類型參數 |
| MISSING_IDENTIFIER | 400 | 缺少識別資訊（學號或姓名） |
| INVALID_STUDENT_ID | 400 | 學號格式不正確 |
| INVALID_NAME | 400 | 姓名格式不正確 |
| INVALID_EMAIL | 400 | Email 格式不正確 |
| SURVEY_ALREADY_FILLED | 400 | 已填過問卷 |
| UNSUPPORTED_SURVEY_TYPE | 400 | 不支援的問卷類型 |
| USER_NOT_FOUND | 404 | 找不到對應的學生 |
| SERVER_ERROR | 500 | 伺服器錯誤 |

---

## 統一錯誤回應格式

所有 API 錯誤回應應遵循以下格式：

```json
{
  "success": false,
  "errorCode": "ERROR_CODE",
  "message": "錯誤訊息（中文）",
  "error": "錯誤訊息（完整）"
}
```

成功回應則不包含 `success` 欄位，或設為 `true`。

---

**文件版本**: v1.0.0
**最後更新**: 2025-01-XX

