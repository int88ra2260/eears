// run-migration-success-sequence.js
// 執行遷移腳本：更新 successSequence 欄位

const migration = require('./migrations/20250120000000-update-success-sequence');
const sequelize = require('./db');
const { Sequelize } = require('sequelize');

async function runMigration() {
  try {
    console.log('開始執行遷移...');
    
    // 確保資料庫連接
    await sequelize.authenticate();
    console.log('資料庫連接成功');
    
    // 取得 queryInterface
    const queryInterface = sequelize.getQueryInterface();
    
    // 執行遷移
    await migration.up(queryInterface, Sequelize);
    
    console.log('✅ 遷移完成');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ 遷移失敗:', error);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

// 檢查是否為回滾模式
const args = process.argv.slice(2);
if (args.includes('--rollback')) {
  async function rollbackMigration() {
    try {
      console.log('開始回滾遷移...');
      
      // 確保資料庫連接
      await sequelize.authenticate();
      console.log('資料庫連接成功');
      
      // 取得 queryInterface
      const queryInterface = sequelize.getQueryInterface();
      
      // 執行回滾
      await migration.down(queryInterface, Sequelize);
      
      console.log('✅ 回滾完成');
      await sequelize.close();
      process.exit(0);
    } catch (error) {
      console.error('❌ 回滾失敗:', error);
      await sequelize.close().catch(() => {});
      process.exit(1);
    }
  }
  rollbackMigration();
} else {
  runMigration();
}
