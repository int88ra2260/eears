# 英檢報名系統優化方案

## 📋 優化項目總覽

根據您的建議，以下是四個主要優化項目的詳細分析和實施方案：

1. ✅ **為 english_test_registrations 建索引與唯一約束**
2. ✅ **報名流程改成 DB 層防重**
3. ✅ **寄信改為背景處理**
4. ✅ **統計改為 SQL 聚合**

---

## 1. 索引與唯一約束優化

### 📊 現狀分析

**目前狀況**：
- `studentId` 在 Sequelize 模型中定義了 `unique: true`
- **但需要確認資料庫層面是否有實際的唯一約束**
- 缺少其他關鍵索引，導致查詢性能不佳

**問題**：
- 統計查詢需要掃描全表（`findAll` 載入所有記錄）
- 排序查詢（`status + approvedSequence`）沒有索引
- 查詢報名資料（`studentId`, `idNumber`）可能沒有索引

### ✅ 建議的索引和約束

```sql
-- 1. 唯一約束（確保資料庫層面的唯一性）
ALTER TABLE english_test_registrations 
ADD CONSTRAINT uk_student_id UNIQUE (studentId);

-- 2. 複合索引（已通過排序查詢）
CREATE INDEX idx_status_approved_sequence 
ON english_test_registrations(status, approvedSequence);

-- 3. 時間索引（預設排序）
CREATE INDEX idx_created_at 
ON english_test_registrations(createdAt DESC);

-- 4. 查詢索引
CREATE INDEX idx_student_id 
ON english_test_registrations(studentId);

CREATE INDEX idx_id_number 
ON english_test_registrations(idNumber);

-- 5. 狀態索引（統計查詢優化）
CREATE INDEX idx_status 
ON english_test_registrations(status);

-- 6. 測驗類型索引（統計查詢優化）
CREATE INDEX idx_exam_type 
ON english_test_registrations(examType);
```

### 📈 預期效果

- **查詢性能**：提升 10-100 倍（取決於資料量）
- **統計查詢**：從 O(n) 降低到 O(log n)
- **排序查詢**：使用索引排序，避免全表掃描

---

## 2. 報名流程 DB 層防重優化

### 📊 現狀分析

**目前實現**（`englishTestRegistrationRouter.js:603-619`）：
```javascript
// 檢查是否已報名（使用事務確保原子性）
const transaction = await sequelize.transaction();

try {
  const existing = await EnglishTestRegistration.findOne({
    where: { studentId: formData.studentId },
    transaction  // ❌ 沒有 lock: true
  });

  if (existing) {
    await transaction.rollback();
    return res.status(409).json({ error: '您已經報名過了' });
  }

  // 建立報名記錄
  const registration = await EnglishTestRegistration.create({...}, { transaction });
  await transaction.commit();
}
```

**問題**：
1. **Race Condition**：兩個請求同時通過 `findOne` 檢查
2. **性能開銷**：需要先查詢再插入，多一次資料庫操作
3. **鎖定缺失**：沒有使用行鎖定，無法防止競爭條件

### ✅ 優化方案

**方案 A：直接 INSERT + 捕捉唯一約束錯誤（推薦）**

```javascript
// 移除 findOne 檢查，直接 INSERT
const transaction = await sequelize.transaction();

try {
  const registration = await EnglishTestRegistration.create({
    studentId: formData.studentId,
    // ... 其他欄位
  }, { transaction });

  await transaction.commit();
  
  // 立即回應成功
  res.json({ 
    message: '報名成功',
    registrationId: registration.id 
  });
  
  // 寄信在背景處理（見第3點）
  
} catch (error) {
  await transaction.rollback();
  
  // 處理唯一約束錯誤
  if (error.name === 'SequelizeUniqueConstraintError') {
    const field = error.errors?.[0]?.path;
    if (field === 'studentId') {
      return res.status(409).json({ 
        error: '您已經報名過了',
        code: 'DUPLICATE_REGISTRATION'
      });
    }
  }
  
  throw error; // 其他錯誤繼續拋出
}
```

**優點**：
- ✅ **消除 Race Condition**：資料庫唯一約束保證原子性
- ✅ **減少資料庫操作**：從 2 次（SELECT + INSERT）減少到 1 次（INSERT）
- ✅ **性能提升**：減少約 50% 的資料庫操作時間
- ✅ **代碼簡化**：移除 `findOne` 檢查邏輯

**注意事項**：
- 必須確保資料庫層面有 `UNIQUE(studentId)` 約束
- 錯誤處理需要明確區分唯一約束錯誤和其他錯誤

---

## 3. 寄信改為背景處理

### 📊 現狀分析

**目前實現**（`englishTestRegistrationRouter.js:684-717`）：
```javascript
// 提交事務
await transaction.commit();

// 發送報名完成通知郵件（非同步，不阻塞回應）
try {
  const fullRegistration = await EnglishTestRegistration.findByPk(registration.id);
  await sendEmail('englishTestRegistrationSuccess', {...});  // ❌ 仍然是 await
} catch (emailError) {
  console.error('發送報名完成通知郵件失敗:', emailError);
}

res.json({ message: '報名成功', registrationId: registration.id });
```

**問題**：
- 雖然有 try-catch，但 `await sendEmail()` 仍然會等待郵件發送完成
- 如果郵件服務慢或失敗，會延遲回應時間
- 預約系統已有 `emailQueue`，但英檢報名沒有使用

### ✅ 優化方案

**方案 A：使用現有的 emailQueue（推薦）**

```javascript
// 提交事務
await transaction.commit();

// 立即回應成功
res.json({ 
  message: '報名成功',
  registrationId: registration.id 
});

// 寄信在背景處理（不阻塞回應）
const emailQueue = require('../utils/emailQueue');
emailQueue.enqueue('englishTestRegistrationSuccess', {
  studentId: registration.studentId,
  studentName: registration.name,
  // ... 其他資料
}).catch(err => {
  console.error('郵件加入佇列失敗:', err);
  // 不影響報名成功
});
```

**方案 B：使用 Promise（不等待）**

```javascript
// 提交事務
await transaction.commit();

// 立即回應成功
res.json({ 
  message: '報名成功',
  registrationId: registration.id 
});

// 寄信在背景處理（不等待）
sendEmail('englishTestRegistrationSuccess', {...})
  .catch(err => {
    console.error('發送報名完成通知郵件失敗:', err);
  });
// 不使用 await，讓它非同步執行
```

**優點**：
- ✅ **響應速度**：立即回應，不等待郵件發送
- ✅ **用戶體驗**：報名成功立即得到回應
- ✅ **系統穩定性**：郵件失敗不影響報名流程
- ✅ **可擴展性**：使用佇列可以處理大量郵件

**建議**：使用方案 A（emailQueue），因為：
- 預約系統已經在使用，代碼一致
- 支援重試機制
- 可以監控郵件發送狀態

---

## 4. 統計改為 SQL 聚合

### 📊 現狀分析

**目前實現**（`englishTestRegistrationRouter.js:907-925`）：
```javascript
// 計算統計資訊（根據篩選條件計算，而非所有資料）
const filteredRegistrations = await EnglishTestRegistration.findAll({
  where,
  attributes: ['examType', 'status']  // ❌ 載入所有符合條件的記錄
});

// 在記憶體中計算統計
const stats = {
  total: filteredRegistrations.length,
  pending: filteredRegistrations.filter(r => r.status === 'pending').length,
  approved: filteredRegistrations.filter(r => r.status === 'approved').length,
  rejected: filteredRegistrations.filter(r => r.status === 'rejected').length,
  nonExam: filteredRegistrations.filter(r => r.examType === 'NON').length,
  listeningReading: filteredRegistrations.filter(r => r.examType === 'LRSW' || r.examType === 'LR').length,
  speakingWriting: filteredRegistrations.filter(r => r.examType === 'LRSW' || r.examType === 'SW').length
};
```

**問題**：
- ❌ **載入所有記錄**：即使只需要統計，也載入了所有符合條件的記錄
- ❌ **記憶體浪費**：大量資料載入到記憶體
- ❌ **性能問題**：資料量大時（如 1000+ 筆）會很慢
- ❌ **網路傳輸**：從資料庫傳輸大量資料到應用層

### ✅ 優化方案

**使用 SQL 聚合查詢**：

```javascript
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

// 構建 WHERE 條件（與現有邏輯相同）
const where = {};
// ... 現有的 where 構建邏輯

// 構建 WHERE 子句字串（用於 SQL 查詢）
const whereConditions = [];
const replacements = {};
let paramIndex = 1;

if (where.status) {
  whereConditions.push(`status = :status`);
  replacements.status = where.status;
}

if (where.createdAt) {
  if (where.createdAt[Op.gte]) {
    whereConditions.push(`createdAt >= :dateFrom`);
    replacements.dateFrom = where.createdAt[Op.gte];
  }
  if (where.createdAt[Op.lte]) {
    whereConditions.push(`createdAt <= :dateTo`);
    replacements.dateTo = where.createdAt[Op.lte];
  }
}

// ... 其他條件

const whereClause = whereConditions.length > 0 
  ? `WHERE ${whereConditions.join(' AND ')}`
  : '';

// 使用 SQL 聚合查詢
const statsQuery = `
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN examType = 'NON' THEN 1 ELSE 0 END) as nonExam,
    SUM(CASE WHEN examType IN ('LRSW', 'LR') THEN 1 ELSE 0 END) as listeningReading,
    SUM(CASE WHEN examType IN ('LRSW', 'SW') THEN 1 ELSE 0 END) as speakingWriting
  FROM english_test_registrations
  ${whereClause}
`;

const statsResult = await sequelize.query(statsQuery, {
  type: QueryTypes.SELECT,
  replacements
});

const stats = {
  total: parseInt(statsResult[0].total) || 0,
  pending: parseInt(statsResult[0].pending) || 0,
  approved: parseInt(statsResult[0].approved) || 0,
  rejected: parseInt(statsResult[0].rejected) || 0,
  nonExam: parseInt(statsResult[0].nonExam) || 0,
  listeningReading: parseInt(statsResult[0].listeningReading) || 0,
  speakingWriting: parseInt(statsResult[0].speakingWriting) || 0
};
```

**或者使用 Sequelize 的聚合方法**：

```javascript
const { sequelize } = require('../models');
const { Op } = require('sequelize');

// 使用 Sequelize 聚合
const stats = await EnglishTestRegistration.findAll({
  where,
  attributes: [
    [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'pending' THEN 1 ELSE 0 END")), 'pending'],
    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'approved' THEN 1 ELSE 0 END")), 'approved'],
    [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'rejected' THEN 1 ELSE 0 END")), 'rejected'],
    [sequelize.fn('SUM', sequelize.literal("CASE WHEN examType = 'NON' THEN 1 ELSE 0 END")), 'nonExam'],
    [sequelize.fn('SUM', sequelize.literal("CASE WHEN examType IN ('LRSW', 'LR') THEN 1 ELSE 0 END")), 'listeningReading'],
    [sequelize.fn('SUM', sequelize.literal("CASE WHEN examType IN ('LRSW', 'SW') THEN 1 ELSE 0 END")), 'speakingWriting']
  ],
  raw: true
});

// 轉換結果
const statsData = {
  total: parseInt(stats[0]?.total) || 0,
  pending: parseInt(stats[0]?.pending) || 0,
  approved: parseInt(stats[0]?.approved) || 0,
  rejected: parseInt(stats[0]?.rejected) || 0,
  nonExam: parseInt(stats[0]?.nonExam) || 0,
  listeningReading: parseInt(stats[0]?.listeningReading) || 0,
  speakingWriting: parseInt(stats[0]?.speakingWriting) || 0
};
```

**優點**：
- ✅ **性能提升**：只返回統計結果，不載入記錄
- ✅ **記憶體節省**：從 O(n) 降低到 O(1)
- ✅ **網路傳輸**：只傳輸統計結果（幾個數字）
- ✅ **可擴展性**：資料量大時性能穩定

**預期效果**：
- 資料量 100 筆：提升約 10 倍
- 資料量 1000 筆：提升約 100 倍
- 資料量 10000 筆：提升約 1000 倍

---

## 🚀 實施優先級

### 🔴 高優先級（立即實施）

1. **索引與唯一約束** - 影響所有查詢性能
2. **報名流程 DB 層防重** - 消除 Race Condition，提升性能

### 🟡 中優先級（近期實施）

3. **統計改為 SQL 聚合** - 提升統計查詢性能
4. **寄信改為背景處理** - 提升響應速度

---

## 📝 實施步驟

### 步驟 1：建立索引和唯一約束

1. 創建遷移文件
2. 執行遷移
3. 驗證索引建立成功

### 步驟 2：優化報名流程

1. 移除 `findOne` 檢查
2. 直接 `INSERT` + 錯誤處理
3. 測試重複報名場景

### 步驟 3：優化寄信處理

1. 使用 `emailQueue` 或非同步處理
2. 立即回應成功
3. 測試郵件發送

### 步驟 4：優化統計查詢

1. 改用 SQL 聚合查詢
2. 測試統計結果正確性
3. 性能測試

---

## ⚠️ 注意事項

1. **唯一約束**：確保資料庫層面有 `UNIQUE(studentId)` 約束
2. **錯誤處理**：明確區分唯一約束錯誤和其他錯誤
3. **向後兼容**：確保 API 回應格式不變
4. **測試**：每個優化都要進行充分測試

---

**文檔建立時間**：2024-12-11  
**優化建議者**：AI Assistant
