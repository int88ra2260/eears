// db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
  host: process.env.DB_HOST || 'localhost',
  dialect: 'mysql',
  logging: false,  // 關閉SQL查詢日誌
  // 優化後的連接池配置（支援高並發 - 250個學生同時預約）
  pool: {
    max: 120,         // 最大連接數：支援 250 個並發學生（約為 MySQL max_connections 的 1/3）
    min: 20,          // 最小連接數：保持基本連接池，減少連接建立開銷
    acquire: 30000,   // 獲取連接的最大等待時間（30秒）
    idle: 10000,      // 連接空閒時間（10秒後釋放）
    evict: 1000,      // 檢查空閒連接的間隔（1秒）
    handleDisconnects: true  // 自動處理斷線重連
  },
  // 確保表格名稱保持原樣
  define: {
    freezeTableName: true,
    underscored: false
  }
});

module.exports = sequelize;
