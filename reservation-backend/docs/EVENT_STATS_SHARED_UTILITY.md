# 活動統計共用工具函數說明

## 概述

為了確保班級參與概況和活動報表的簽到數據一致，我們創建了共用的工具函數 `utils/eventStats.js`，統一處理活動的簽到統計。

## 功能

### 1. `getEventCheckinStats(eventId)`

取得單個活動的簽到統計。

**參數：**
- `eventId` (number): 活動ID

**返回：**
```javascript
{
  totalReservations: 10,    // 總預約數
  checkedIn: 8,             // 已簽到數
  notCheckedIn: 1,          // 未簽到數
  violations: 1             // 已登記違規數
}
```

**使用範例：**
```javascript
const { getEventCheckinStats } = require('../utils/eventStats');

const stats = await getEventCheckinStats(123);
console.log(`活動 123 的簽到統計：`, stats);
```

### 2. `getMultipleEventsCheckinStats(eventIds)`

批量取得多個活動的簽到統計（用於活動報表）。

**參數：**
- `eventIds` (Array<number>): 活動ID陣列

**返回：**
```javascript
Map<eventId, {
  totalReservations: number,
  checkedIn: number,
  notCheckedIn: number,
  violations: number
}>
```

**使用範例：**
```javascript
const { getMultipleEventsCheckinStats } = require('../utils/eventStats');

const eventIds = [1, 2, 3];
const statsMap = await getMultipleEventsCheckinStats(eventIds);

eventIds.forEach(eventId => {
  const stats = statsMap.get(eventId);
  console.log(`活動 ${eventId} 的簽到統計：`, stats);
});
```

### 3. `getStudentParticipationStats(studentIds, semesterRange, activityType)`

取得指定學生的活動參與統計（用於班級參與概況）。

**參數：**
- `studentIds` (Array<string>): 學生ID陣列
- `semesterRange` (Object): 學期範圍 `{ start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' }`
- `activityType` (string): 活動類型 ('All', 'ET', 'EC', 'JT', 'IF')，預設為 'All'

**返回：**
```javascript
{
  participatedCount: 25,        // 至少參與人數
  attendedCountTotal: 50,       // 簽到總次數
  noShowCountTotal: 2,          // 違規總數
  byType: {
    EnglishTable: 30,
    EnglishClub: 10,
    JobTalk: 5,
    InternationalForum: 5
  }
}
```

**使用範例：**
```javascript
const { getStudentParticipationStats } = require('../utils/eventStats');

const studentIds = ['B111010044', 'B113012038'];
const semesterRange = { start: '2025-08-01', end: '2026-01-31' };
const stats = await getStudentParticipationStats(studentIds, semesterRange, 'All');
console.log('班級參與統計：', stats);
```

## 整合情況

### 活動報表 (`routes/eventRouter.js`)

**修改前：**
- 只載入 `Reservation` 的 `id` 屬性
- 無法取得簽到統計
- 預約數可能不準確（Sequelize include 的問題）

**修改後：**
- 使用 `getMultipleEventsCheckinStats` 批量取得所有活動的簽到統計
- 返回完整的簽到數據：`checkedIn`, `notCheckedIn`, `violations`
- 數據來源統一，確保準確性

**API 回應範例：**
```json
[
  {
    "eventId": 1,
    "name": "English Table",
    "date": "2025-11-19",
    "reservedCount": 72,
    "checkedIn": 71,
    "notCheckedIn": 0,
    "violations": 1,
    "availableSpots": 8
  }
]
```

### 班級參與概況 (`controllers/adminClassesController.js`)

**修改前：**
- 使用自己的 SQL 查詢邏輯
- 與活動報表的數據來源不一致

**修改後：**
- `getParticipationStats` 函數現在調用共用的 `getStudentParticipationStats`
- 確保與活動報表使用相同的數據查詢邏輯
- 數據一致性得到保證

**注意：**
- `getStudentParticipationStats`（單個學生）函數保留原樣，因為它返回更詳細的統計（時數、計點數等）
- 只有 `getParticipationStats`（多個學生）使用共用函數

## 優勢

1. **數據一致性**：活動報表和班級參與概況使用相同的查詢邏輯，確保數據一致
2. **維護性**：統計邏輯集中在一個地方，易於維護和更新
3. **性能**：批量查詢減少資料庫查詢次數
4. **準確性**：使用直接 SQL 查詢，避免 Sequelize include 的問題

## 注意事項

1. **簽到狀態值**：確保資料庫中的 `checkinStatus` 值為：
   - `'已簽到'`
   - `'未簽到'`
   - `'已登記違規'`

2. **活動類型映射**：活動類型名稱需要正確映射：
   - `'English Table'` → `EnglishTable`
   - `'English Club'` → `EnglishClub`
   - `'Job Talk'` → `JobTalk`
   - `'International Forum'` → `InternationalForum`

3. **學號格式**：使用共用函數前，確保學號已清洗（大寫、去除空白）

## 未來改進

1. 可以考慮添加緩存機制，減少重複查詢
2. 可以添加更多統計指標（如簽到率、平均參與次數等）
3. 可以支援更多活動類型的過濾

