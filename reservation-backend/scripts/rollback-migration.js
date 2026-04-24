// scripts/rollback-migration.js
// 回滾資料庫遷移腳本

const { sequelize } = require('../models');
const migration = require('../migrations/add-indexes-to-english-test-registrations.js');

async function rollbackMigration() {
  try {
    console.log('🔄 開始回滾資料庫遷移...\n');
    
    // 測試資料庫連接
    await sequelize.authenticate();
    console.log('✅ 資料庫連接成功\n');
    
    const queryInterface = sequelize.getQueryInterface();
    
    // 執行回滾
    await migration.down(queryInterface, sequelize.constructor);
    
    console.log('\n✅ 回滾完成！');
    console.log('\n⚠️  注意：唯一約束已移除，系統將恢復到優化前的狀態');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 回滾失敗:', error);
    process.exit(1);
  }
}

rollbackMigration();
