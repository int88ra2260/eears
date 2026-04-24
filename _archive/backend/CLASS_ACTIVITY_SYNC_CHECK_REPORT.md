# 班級參與概況和活動報表同步檢查報告

## 檢查時間
執行時間：2025年（腳本執行時）

## 檢查範圍
- 學期：114-1 (2025-08-01 ~ 2026-01-31)
- 班級數：6
- 活動數：54
- 有預約的活動數：30

## 發現的問題

### 1. 活動報表數據不一致 ⚠️⚠️

**問題描述：**
- 通過 Sequelize `Event.findAll` 載入的預約數據與資料庫直接查詢的結果不一致
- 載入的預約數通常少於資料庫實際的預約數

**範例：**
- English Club (2025-11-26)：載入 30 筆，資料庫查詢 77 筆
- English Table (2025-11-20)：載入 20 筆，資料庫查詢 73 筆
- Job Talk (2025-11-20)：載入 10 筆，資料庫查詢 56 筆

**可能原因：**
1. Sequelize 的 `include` 查詢可能有 limit 限制或分頁問題
2. 活動報表查詢只載入了 `Reservation` 的 `id` 屬性，可能影響查詢結果
3. 可能有重複的活動ID導致查詢結果不正確

### 2. 簽到狀態數據不一致 ⚠️⚠️⚠️ **嚴重問題**

**問題描述：**
- 資料庫中**所有預約的 `checkinStatus` 都是 `'未簽到'`**
- 總共 2388 筆預約記錄，全部都是「未簽到」狀態
- 沒有任何「已簽到」或「已登記違規」的記錄

**檢查結果：**
```
checkinStatus 值分布:
  未簽到: 2388 筆
```

**影響：**
1. 班級參與概況顯示的簽到數都是 0（因為資料庫中確實沒有「已簽到」的記錄）
2. 活動報表顯示的簽到數可能是錯誤的（可能是 Sequelize 的緩存或預設值）
3. 簽到功能可能沒有正常工作，或者簽到狀態沒有正確更新到資料庫

**可能原因：**
1. 簽到功能沒有正常運作
2. 簽到狀態更新邏輯有問題
3. 資料庫更新失敗但沒有錯誤提示
4. 簽到記錄可能被重置或清空

### 3. 班級參與概況統計正常 ✅

**檢查結果：**
- 班級參與概況使用直接 SQL 查詢，數據與資料庫一致
- 統計邏輯正確，能夠正確計算預約數、簽到數、違規數

**範例：**
- 工程英文 （中高級）GESP211：總預約數 89，已簽到 0，未簽到 89
- 英文中級 GEEN116：總預約數 34，已簽到 0，未簽到 34

## 建議的解決方案

### 1. 修復活動報表查詢

**問題：** `routes/eventRouter.js` 中的活動報表查詢只載入了 `Reservation` 的 `id` 屬性

**當前代碼：**
```javascript
let events = await Event.findAll({
  include: { model: Reservation, attributes: ['id'] }
});
```

**建議修改：**
```javascript
let events = await Event.findAll({
  include: { 
    model: Reservation, 
    attributes: ['id', 'studentId', 'checkinStatus', 'checkinTime']
  }
});
```

**注意：** 如果只需要預約數，可以保持只載入 `id`，但需要確保統計邏輯正確。

### 2. 統一使用直接 SQL 查詢

**建議：** 對於需要統計簽到狀態的查詢，統一使用直接 SQL 查詢，避免 Sequelize include 的問題。

**範例：**
```javascript
const stats = await sequelize.query(`
  SELECT 
    COUNT(*) as totalReservations,
    SUM(CASE WHEN checkinStatus = '已簽到' THEN 1 ELSE 0 END) as checkedIn,
    SUM(CASE WHEN checkinStatus = '未簽到' THEN 1 ELSE 0 END) as notCheckedIn,
    SUM(CASE WHEN checkinStatus = '已登記違規' THEN 1 ELSE 0 END) as violations
  FROM Reservations
  WHERE eventId = :eventId
`, {
  replacements: { eventId: event.id },
  type: sequelize.QueryTypes.SELECT
});
```

### 3. 檢查資料庫中的 checkinStatus 值

**建議：** 檢查資料庫中 `checkinStatus` 欄位的實際值，確認是否為：
- `'已簽到'`
- `'未簽到'`
- `'已登記違規'`
- `NULL`
- 或其他值

**查詢語句：**
```sql
SELECT DISTINCT checkinStatus, COUNT(*) as count
FROM Reservations
GROUP BY checkinStatus;
```

### 4. 驗證活動ID唯一性

**建議：** 檢查是否有重複的活動ID，可能導致查詢結果不正確。

**查詢語句：**
```sql
SELECT id, COUNT(*) as count
FROM Events
GROUP BY id
HAVING COUNT(*) > 1;
```

## 檢查腳本

檢查腳本位置：`reservation-backend/scripts/check-class-activity-sync.js`

**使用方法：**
```bash
cd reservation-backend
node scripts/check-class-activity-sync.js
```

## 總結

1. **班級參與概況**：✅ 數據正確，使用直接 SQL 查詢，統計邏輯正確
2. **活動報表**：⚠️ 數據不一致，需要修復查詢邏輯
3. **簽到狀態**：⚠️⚠️⚠️ **嚴重問題** - 資料庫中所有預約都是「未簽到」狀態

**關鍵發現：**
- 資料庫中**所有 2388 筆預約記錄的 `checkinStatus` 都是 `'未簽到'`**
- 沒有任何「已簽到」或「已登記違規」的記錄
- 這表示簽到功能可能沒有正常工作，或簽到狀態沒有正確更新

**優先處理：**
1. **立即檢查簽到功能**：確認簽到 API 是否正常工作，簽到狀態是否正確更新到資料庫
2. **檢查簽到歷史記錄**：查看是否有簽到記錄被刪除或重置
3. **修復活動報表的查詢邏輯**：確保載入所有必要的屬性，統一使用直接 SQL 查詢
4. **驗證簽到流程**：測試簽到功能，確認狀態能正確更新到資料庫

