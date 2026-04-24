// scripts/check-english-test-registration-duplicates.js
// 檢查 english_test_registrations 中 (studentId, semester) 是否存在重複資料

require('dotenv').config();
const { sequelize } = require('../models');

async function checkEnglishTestRegistrationDuplicates() {
  try {
    console.log('🔍 檢查 English Test 報名重複資料（studentId + semester）...\n');

    const duplicates = await sequelize.query(
      `
      SELECT
        studentId,
        semester,
        COUNT(*) AS count,
        GROUP_CONCAT(id ORDER BY updatedAt DESC, id DESC SEPARATOR ',') AS idList
      FROM english_test_registrations
      WHERE studentId IS NOT NULL
        AND semester IS NOT NULL
        AND semester <> ''
      GROUP BY studentId, semester
      HAVING COUNT(*) > 1
      ORDER BY count DESC;
      `,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (!duplicates || duplicates.length === 0) {
      console.log('✅ 未發現 (studentId + semester) 重複資料。\n');
      return;
    }

    console.log(`⚠️  發現 ${duplicates.length} 組重複資料：\n`);
    for (const d of duplicates) {
      console.log(`- studentId: ${d.studentId}`);
      console.log(`  semester : ${d.semester}`);
      console.log(`  count    : ${d.count}`);
      console.log(`  idList   : ${d.idList}`);
      console.log('');
    }
  } catch (error) {
    console.error('❌ 檢查失敗：', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

checkEnglishTestRegistrationDuplicates();

