# 英檢報名系統優化實施指南

## 📋 優化項目清單

1. ✅ 索引與唯一約束（遷移文件已創建）
2. ✅ 報名流程 DB 層防重（需要修改代碼）
3. ✅ 寄信改為背景處理（需要修改代碼）
4. ✅ 統計改為 SQL 聚合（需要修改代碼）

---

## 🚀 實施步驟

### 步驟 1：執行資料庫遷移（索引和唯一約束）

```bash
cd reservation-backend

# 執行遷移
node -e "
const { sequelize } = require('./models');
const migration = require('./migrations/add-indexes-to-english-test-registrations.js');

async function runMigration() {
  try {
    const queryInterface = sequelize.getQueryInterface();
    await migration.up(queryInterface, sequelize.constructor);
    console.log('✅ 遷移完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    process.exit(1);
  }
}

runMigration();
"
```

**驗證**：
```sql
-- 檢查唯一約束
SHOW CREATE TABLE english_test_registrations;

-- 檢查索引
SHOW INDEXES FROM english_test_registrations;
```

---

### 步驟 2：優化報名流程（DB 層防重）

**檔案**：`routes/englishTestRegistrationRouter.js`

**修改位置**：約第 603-727 行

**修改前**：
```javascript
// 檢查是否已報名（使用事務確保原子性）
const transaction = await sequelize.transaction();

try {
  const existing = await EnglishTestRegistration.findOne({
    where: { studentId: formData.studentId },
    transaction
  });

  if (existing) {
    await transaction.rollback();
    return res.status(409).json({ 
      error: '您已經報名過了',
      code: 'DUPLICATE_REGISTRATION'
    });
  }

  // 建立報名記錄
  const registration = await EnglishTestRegistration.create({...}, { transaction });
  await transaction.commit();
  // ...
}
```

**修改後**：
```javascript
// 直接 INSERT，由資料庫唯一約束保證原子性
const transaction = await sequelize.transaction();

try {
  // 直接建立報名記錄（移除 findOne 檢查）
  const registration = await EnglishTestRegistration.create({
    studentId: formData.studentId,
    name: formData.name,
    idNumber: formData.idNumber,
    email: formData.email,
    studentNameZh: formData.studentNameZh || formData.name,
    lastNameEn: formData.lastNameEn || '',
    firstNameEn: formData.firstNameEn || '',
    birthDate: formData.birthDate && formData.birthDate.trim() !== '' ? formData.birthDate : null,
    examType: formData.examType || null,
    hasTakenBESTEP: formData.hasTakenBESTEP || '否',
    hasCEFRB2: formData.hasCEFRB2 || '否',
    passedExamTypes: passedExamTypes.length > 0 ? passedExamTypes : null,
    passedExamOther: formData.passedExamOther || null,
    b2CertificateFile: filePaths.b2CertificateFile ? (typeof filePaths.b2CertificateFile === 'string' ? filePaths.b2CertificateFile : JSON.stringify(filePaths.b2CertificateFile)) : null,
    b2SkillType: formData.b2SkillType || null,
    listeningExamType: (formData.listeningExamType && formData.listeningExamType.trim() !== '') ? formData.listeningExamType : null,
    listeningScore: (formData.listeningScore && formData.listeningScore.trim() !== '') ? formData.listeningScore : null,
    readingExamType: (formData.readingExamType && formData.readingExamType.trim() !== '') ? formData.readingExamType : null,
    readingScore: (formData.readingScore && formData.readingScore.trim() !== '') ? formData.readingScore : null,
    speakingExamType: (formData.speakingExamType && formData.speakingExamType.trim() !== '') ? formData.speakingExamType : null,
    speakingScore: (formData.speakingScore && formData.speakingScore.trim() !== '') ? formData.speakingScore : null,
    writingExamType: (formData.writingExamType && formData.writingExamType.trim() !== '') ? formData.writingExamType : null,
    writingScore: (formData.writingScore && formData.writingScore.trim() !== '') ? formData.writingScore : null,
    nationalId: formData.nationalId || formData.idNumber,
    phone: formData.phone || '',
    postalCode: formData.postalCode || '',
    city: formData.city || '',
    district: formData.district || '',
    address: formData.address || '',
    degreeLevel: formData.degreeLevel || '',
    grade: formData.grade || '',
    college: formData.college || '',
    department: formData.department || '',
    isLowIncome: formData.isLowIncome || '否',
    hasDisabilityCard: formData.hasDisabilityCard || '否',
    disabilityTypes: disabilityTypes.length > 0 ? disabilityTypes : null,
    disabilityCertFront: filePaths.disabilityCertFront || null,
    disabilityCertBack: filePaths.disabilityCertBack || null,
    examAssistanceOptions: examAssistanceOptions.length > 0 ? examAssistanceOptions : null,
    examAssistanceOther: formData.examAssistanceOther || null,
    idPhoto: filePaths.idPhoto || null,
    agreedToTerms: formData.agreedToTerms === 'true' || formData.agreedToTerms === true || formData.agreedToTerms === 'true',
    infoSource: formData.infoSource || '',
    status: (formData.examType === 'NON') ? 'rejected' : 'pending'
  }, { transaction });

  // 提交事務
  await transaction.commit();

  console.log('報名記錄建立成功，ID:', registration.id);

  // 立即回應成功
  res.json({ 
    message: '報名成功',
    registrationId: registration.id 
  });

  // 寄信在背景處理（見步驟 3）
  // ...

} catch (createError) {
  await transaction.rollback();
  
  // 處理唯一約束錯誤（重複報名）
  if (createError.name === 'SequelizeUniqueConstraintError') {
    const field = createError.errors && createError.errors[0] ? createError.errors[0].path : 'unknown';
    if (field === 'studentId') {
      return res.status(409).json({ 
        error: '您已經報名過了',
        code: 'DUPLICATE_REGISTRATION'
      });
    }
    return res.status(409).json({ 
      error: '資料重複',
      details: createError.message
    });
  }
  
  // 重新拋出其他錯誤，讓外層 catch 處理
  throw createError;
}
```

---

### 步驟 3：優化寄信處理（背景處理）

**檔案**：`routes/englishTestRegistrationRouter.js`

**修改位置**：約第 682-722 行（在 `transaction.commit()` 之後）

**修改前**：
```javascript
// 提交事務
await transaction.commit();

console.log('報名記錄建立成功，ID:', registration.id);

// 發送報名完成通知郵件（非同步，不阻塞回應）
try {
  const fullRegistration = await EnglishTestRegistration.findByPk(registration.id);
  
  await sendEmail('englishTestRegistrationSuccess', {
    studentId: fullRegistration.studentId,
    studentName: fullRegistration.name,
    // ... 其他資料
  });
} catch (emailError) {
  console.error('發送報名完成通知郵件失敗:', emailError);
}

res.json({ 
  message: '報名成功',
  registrationId: registration.id 
});
```

**修改後**：
```javascript
// 提交事務
await transaction.commit();

console.log('報名記錄建立成功，ID:', registration.id);

// 立即回應成功（不等待寄信）
res.json({ 
  message: '報名成功',
  registrationId: registration.id 
});

// 寄信在背景處理（使用 emailQueue，不阻塞回應）
const emailQueue = require('../utils/emailQueue');

// 重新載入完整記錄以確保取得所有欄位
EnglishTestRegistration.findByPk(registration.id)
  .then(fullRegistration => {
    return emailQueue.enqueue('englishTestRegistrationSuccess', {
      studentId: fullRegistration.studentId,
      studentName: fullRegistration.name,
      studentNameZh: fullRegistration.studentNameZh || fullRegistration.name,
      lastNameEn: fullRegistration.lastNameEn || '',
      firstNameEn: fullRegistration.firstNameEn || '',
      name: fullRegistration.name,
      idNumber: fullRegistration.idNumber || fullRegistration.nationalId,
      nationalId: fullRegistration.nationalId || fullRegistration.idNumber,
      email: fullRegistration.email,
      phone: fullRegistration.phone || '',
      registrationId: fullRegistration.id,
      registrationDate: fullRegistration.createdAt,
      status: fullRegistration.status,
      examType: fullRegistration.examType,
      hasCEFRB2: fullRegistration.hasCEFRB2 || '否',
      listeningExamType: fullRegistration.listeningExamType,
      listeningScore: fullRegistration.listeningScore,
      readingExamType: fullRegistration.readingExamType,
      readingScore: fullRegistration.readingScore,
      speakingExamType: fullRegistration.speakingExamType,
      speakingScore: fullRegistration.speakingScore,
      writingExamType: fullRegistration.writingExamType,
      writingScore: fullRegistration.writingScore
    });
  })
  .catch(err => {
    console.error('郵件加入佇列失敗:', err);
    // 不影響報名成功
  });
```

---

### 步驟 4：優化統計查詢（SQL 聚合）

**檔案**：`routes/englishTestRegistrationRouter.js`

**修改位置**：約第 907-925 行

**修改前**：
```javascript
// 計算統計資訊（根據篩選條件計算，而非所有資料）
const filteredRegistrations = await EnglishTestRegistration.findAll({
  where,
  attributes: ['examType', 'status']
});

// 計算符合篩選條件的統計資訊
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

**修改後**：
```javascript
// 使用 SQL 聚合查詢計算統計資訊（性能優化）
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

// 構建 WHERE 條件字串和參數
const whereConditions = [];
const replacements = {};

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

if (where.examType && where.examType[Op.in]) {
  whereConditions.push(`examType IN (:examTypes)`);
  replacements.examTypes = where.examType[Op.in];
}

if (where.isLowIncome) {
  whereConditions.push(`isLowIncome = :isLowIncome`);
  replacements.isLowIncome = where.isLowIncome;
}

if (where.hasDisabilityCard) {
  whereConditions.push(`hasDisabilityCard = :hasDisabilityCard`);
  replacements.hasDisabilityCard = where.hasDisabilityCard;
}

// 處理搜尋條件（studentId, name, email）
if (where[Op.or]) {
  const orConditions = [];
  where[Op.or].forEach((condition, index) => {
    if (condition.studentId && condition.studentId[Op.like]) {
      orConditions.push(`studentId LIKE :search${index}`);
      replacements[`search${index}`] = condition.studentId[Op.like];
    } else if (condition.name && condition.name[Op.like]) {
      orConditions.push(`name LIKE :search${index}`);
      replacements[`search${index}`] = condition.name[Op.like];
    } else if (condition.email && condition.email[Op.like]) {
      orConditions.push(`email LIKE :search${index}`);
      replacements[`search${index}`] = condition.email[Op.like];
    }
  });
  if (orConditions.length > 0) {
    whereConditions.push(`(${orConditions.join(' OR ')})`);
  }
}

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

// 轉換統計結果
const stats = {
  total: parseInt(statsResult[0]?.total) || 0,
  pending: parseInt(statsResult[0]?.pending) || 0,
  approved: parseInt(statsResult[0]?.approved) || 0,
  rejected: parseInt(statsResult[0]?.rejected) || 0,
  nonExam: parseInt(statsResult[0]?.nonExam) || 0,
  listeningReading: parseInt(statsResult[0]?.listeningReading) || 0,
  speakingWriting: parseInt(statsResult[0]?.speakingWriting) || 0
};
```

---

## ✅ 驗證步驟

### 1. 驗證索引和唯一約束

```sql
-- 檢查唯一約束
SHOW CREATE TABLE english_test_registrations;
-- 應該看到：UNIQUE KEY `uk_student_id` (`studentId`)

-- 檢查索引
SHOW INDEXES FROM english_test_registrations;
-- 應該看到所有添加的索引
```

### 2. 測試重複報名

```bash
# 使用相同學號報名兩次
# 第一次應該成功
# 第二次應該返回 409 錯誤："您已經報名過了"
```

### 3. 測試寄信

```bash
# 報名成功後，檢查：
# 1. API 立即回應成功
# 2. 郵件在背景發送（檢查日誌）
# 3. 郵件佇列狀態正常
```

### 4. 測試統計查詢

```bash
# 訪問報名列表 API
# 檢查：
# 1. 統計結果正確
# 2. 查詢性能提升（使用 EXPLAIN 查看執行計劃）
```

---

## 📊 預期效果

### 性能提升

| 優化項目 | 優化前 | 優化後 | 提升倍數 |
|---------|--------|--------|---------|
| 報名流程 | 2 次 DB 操作 | 1 次 DB 操作 | 2x |
| 統計查詢（1000筆） | ~500ms | ~5ms | 100x |
| 統計查詢（10000筆） | ~5000ms | ~10ms | 500x |
| API 響應時間 | 包含寄信時間 | 立即回應 | 視郵件服務而定 |

### 系統穩定性

- ✅ **消除 Race Condition**：資料庫唯一約束保證原子性
- ✅ **減少記憶體使用**：統計查詢不再載入所有記錄
- ✅ **提升並發能力**：減少資料庫操作次數

---

## ⚠️ 注意事項

1. **備份資料庫**：執行遷移前請備份資料庫
2. **測試環境**：建議先在測試環境驗證
3. **向後兼容**：確保 API 回應格式不變
4. **錯誤處理**：確保錯誤處理邏輯正確
5. **監控**：實施後監控系統性能和錯誤日誌

---

**文檔建立時間**：2024-12-11  
**實施指南版本**：1.0
