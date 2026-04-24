// scripts/run-migration.js
// 執行資料庫遷移腳本

const { sequelize } = require('../models');
const migration = require('../migrations/add-indexes-to-english-test-registrations.js');

async function runMigration() {
  try {
    console.log('🚀 開始執行資料庫遷移...\n');
    
    // 測試資料庫連接
    await sequelize.authenticate();
    console.log('✅ 資料庫連接成功\n');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // 執行遷移
    await migration.up(queryInterface, sequelize.constructor);
    
    console.log('\n✅ 遷移完成！');
    console.log('\n📋 下一步：');
    console.log('1. 執行驗證腳本：node scripts/verify-optimization.js');
    console.log('2. 重啟後端服務');
    console.log('3. 執行功能測試');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 遷移失敗:', error);
    console.error('\n💡 如果遇到唯一約束錯誤，可能是資料庫中存在重複的 studentId');
    console.error('   請先檢查並清理重複資料：');
    console.error('   SELECT studentId, COUNT(*) as count FROM english_test_registrations GROUP BY studentId HAVING count > 1;');
    process.exit(1);
  }
}

runMigration();
