// scripts/check-english-test-registration-semester-null.js
// 檢查 english_test_registrations 中 semester 為 NULL 或空字串的資料

require('dotenv').config();
const { sequelize } = require('../models');

async function checkSemesterNull() {
  try {
    console.log('🔍 檢查 English Test 報名 semester 為 NULL/空字串...\n');

    const rows = await sequelize.query(
      `
      SELECT id, studentId, semester, updatedAt
      FROM english_test_registrations
      WHERE semester IS NULL
         OR semester = ''
         OR semester = 'null';
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!rows || rows.length === 0) {
      console.log('✅ 未發現 semester 為 NULL/空字串 的資料。\n');
      return;
    }

    console.log(`⚠️  發現 ${rows.length} 筆可能問題資料：\n`);
    for (const r of rows) {
      console.log(`- id: ${r.id} | studentId: ${r.studentId} | semester: ${r.semester}`);
    }
    console.log('');
  } catch (error) {
    console.error('❌ 檢查失敗：', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkSemesterNull();

