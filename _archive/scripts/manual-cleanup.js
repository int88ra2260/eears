// 手動清理資料庫表格
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  }
);

async function cleanup() {
  try {
    console.log('開始清理資料庫...');
    
    // 刪除外鍵約束
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    
    // 刪除表格
    await sequelize.query('DROP TABLE IF EXISTS class_memberships');
    await sequelize.query('DROP TABLE IF EXISTS classes');
    await sequelize.query('DROP TABLE IF EXISTS settings');
    
    // 重新啟用外鍵檢查
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ 資料庫清理完成！');
    
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

cleanup();
