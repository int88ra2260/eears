// scripts/test-bestep-migrations.js
// 測試 BESTEP migration 是否正確

const { sequelize } = require('../models');

async function testMigrations() {
  try {
    console.log('🔍 檢查 BESTEP 相關資料表...\n');

    // 檢查表是否存在
    const tables = [
      'bestep_attendance',
      'bestep_exam_scores',
      'bestep_exam_sessions',
      'bestep_team_rankings'
    ];

    for (const tableName of tables) {
      const [results] = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = DATABASE() 
        AND table_name = '${tableName}'
      `);
      
      if (results[0].count > 0) {
        console.log(`✅ ${tableName} 表存在`);
        
        // 檢查欄位
        const [columns] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `);
        
        console.log(`   欄位數: ${columns.length}`);
      } else {
        console.log(`❌ ${tableName} 表不存在`);
      }
    }

    console.log('\n✅ Migration 檢查完成');
    process.exit(0);
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    process.exit(1);
  }
}

testMigrations();
