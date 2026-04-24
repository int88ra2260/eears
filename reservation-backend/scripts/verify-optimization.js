// scripts/verify-optimization.js
// 驗證優化實施的腳本

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

async function verifyOptimization() {
  try {
    console.log('🔍 開始驗證優化實施...\n');

    // 1. 檢查唯一約束
    console.log('1. 檢查唯一約束...');
    const constraints = await sequelize.query(`
      SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
      FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'english_test_registrations'
      AND CONSTRAINT_NAME = 'uk_student_id'
    `, { type: QueryTypes.SELECT });

    if (constraints.length > 0) {
      console.log('   ✅ 唯一約束 uk_student_id 存在');
    } else {
      console.log('   ❌ 唯一約束 uk_student_id 不存在');
    }

    // 2. 檢查索引
    console.log('\n2. 檢查索引...');
    const indexes = await sequelize.query(`
      SHOW INDEXES FROM english_test_registrations
    `, { type: QueryTypes.SELECT });

    const requiredIndexes = [
      'idx_status_approved_sequence',
      'idx_created_at',
      'idx_student_id',
      'idx_id_number',
      'idx_status',
      'idx_exam_type'
    ];

    const existingIndexes = indexes.map(idx => idx.Key_name);
    let allIndexesExist = true;

    requiredIndexes.forEach(indexName => {
      if (existingIndexes.includes(indexName)) {
        console.log(`   ✅ 索引 ${indexName} 存在`);
      } else {
        console.log(`   ❌ 索引 ${indexName} 不存在`);
        allIndexesExist = false;
      }
    });

    // 3. 檢查資料量
    console.log('\n3. 檢查資料...');
    const countResult = await sequelize.query(`
      SELECT COUNT(*) as total FROM english_test_registrations
    `, { type: QueryTypes.SELECT });
    console.log(`   📊 總記錄數: ${countResult[0].total}`);

    // 4. 檢查是否有重複的 studentId（應該沒有，因為有唯一約束）
    console.log('\n4. 檢查重複資料...');
    const duplicates = await sequelize.query(`
      SELECT studentId, COUNT(*) as count
      FROM english_test_registrations
      GROUP BY studentId
      HAVING count > 1
    `, { type: QueryTypes.SELECT });

    if (duplicates.length === 0) {
      console.log('   ✅ 沒有重複的 studentId');
    } else {
      console.log(`   ⚠️  發現 ${duplicates.length} 個重複的 studentId`);
      duplicates.forEach(dup => {
        console.log(`      - ${dup.studentId}: ${dup.count} 筆`);
      });
    }

    // 5. 測試查詢性能（使用 EXPLAIN）
    console.log('\n5. 測試索引使用情況...');
    const explainResult = await sequelize.query(`
      EXPLAIN SELECT * FROM english_test_registrations 
      WHERE studentId = 'TEST123'
    `, { type: QueryTypes.SELECT });

    if (explainResult.length > 0) {
      const key = explainResult[0].key;
      if (key && (key.includes('idx_student_id') || key.includes('uk_student_id'))) {
        console.log(`   ✅ 查詢使用索引: ${key}`);
      } else {
        console.log(`   ⚠️  查詢未使用索引 (key: ${key || 'NULL'})`);
      }
    }

    console.log('\n✅ 驗證完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 驗證失敗:', error);
    process.exit(1);
  }
}

verifyOptimization();
