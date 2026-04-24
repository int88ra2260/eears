// 緊急檢查資料庫狀態
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

async function emergencyCheck() {
  try {
    console.log('🚨 緊急檢查資料庫狀態...\n');
    
    // 1. 檢查所有表格
    console.log('📋 檢查表格存在性:');
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    console.log(`找到 ${tables.length} 個表格:`, tables.map(t => Object.values(t)[0]));
    
    // 2. 檢查每個表格的資料量
    console.log('\n📊 檢查各表格資料量:');
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      try {
        const count = await sequelize.query(`SELECT COUNT(*) as count FROM \`${tableName}\``, { 
          type: Sequelize.QueryTypes.SELECT 
        });
        console.log(`  ${tableName}: ${count[0].count} 筆資料`);
      } catch (error) {
        console.log(`  ${tableName}: ❌ 錯誤 - ${error.message}`);
      }
    }
    
    // 3. 檢查重要表格的結構
    console.log('\n🔍 檢查重要表格結構:');
    const importantTables = ['users', 'events', 'reservations', 'classes'];
    
    for (const tableName of importantTables) {
      try {
        const columns = await sequelize.query(`DESCRIBE \`${tableName}\``, { 
          type: Sequelize.QueryTypes.SELECT 
        });
        console.log(`\n  ${tableName} 欄位:`);
        columns.forEach(col => {
          console.log(`    - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });
      } catch (error) {
        console.log(`  ${tableName}: ❌ 表格不存在或無法訪問 - ${error.message}`);
      }
    }
    
    // 4. 檢查是否有備份
    console.log('\n💾 檢查可能的備份:');
    try {
      const backupTables = await sequelize.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'activity_reservation' 
        AND TABLE_NAME LIKE '%backup%' OR TABLE_NAME LIKE '%_old%'
      `, { type: Sequelize.QueryTypes.SELECT });
      
      if (backupTables.length > 0) {
        console.log('  發現可能的備份表格:', backupTables.map(t => t.TABLE_NAME));
      } else {
        console.log('  ❌ 沒有發現備份表格');
      }
    } catch (error) {
      console.log('  ❌ 無法檢查備份:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

emergencyCheck();
