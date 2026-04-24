// check-event-violations-table.js
// 檢查 event_violations 表是否存在以及結構是否正確

const sequelize = require('./db');

async function checkEventViolationsTable() {
  try {
    console.log('🔍 檢查 event_violations 表...\n');
    
    // 1. 檢查表是否存在
    const [results] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'event_violations'
    `);
    
    if (results.length === 0) {
      console.log('❌ event_violations 表不存在！');
      console.log('💡 請執行 migration: add-checkin-and-violation-features.js');
      return;
    }
    
    console.log('✅ event_violations 表存在\n');
    
    // 2. 檢查表結構
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_TYPE
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'event_violations'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('📋 表結構:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? '可為空' : '不可為空'})`);
    });
    
    // 3. 檢查外鍵約束
    const [foreignKeys] = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'event_violations'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    console.log('\n🔗 外鍵約束:');
    if (foreignKeys.length === 0) {
      console.log('  ⚠️  沒有找到外鍵約束');
    } else {
      foreignKeys.forEach(fk => {
        console.log(`  - ${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
    }
    
    // 4. 檢查索引
    const [indexes] = await sequelize.query(`
      SELECT INDEX_NAME, COLUMN_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'event_violations'
      AND INDEX_NAME != 'PRIMARY'
      ORDER BY INDEX_NAME, SEQ_IN_INDEX
    `);
    
    console.log('\n📊 索引:');
    if (indexes.length === 0) {
      console.log('  ⚠️  沒有找到索引');
    } else {
      const indexMap = {};
      indexes.forEach(idx => {
        if (!indexMap[idx.INDEX_NAME]) {
          indexMap[idx.INDEX_NAME] = [];
        }
        indexMap[idx.INDEX_NAME].push(idx.COLUMN_NAME);
      });
      Object.keys(indexMap).forEach(indexName => {
        console.log(`  - ${indexName}: [${indexMap[indexName].join(', ')}]`);
      });
    }
    
    // 5. 檢查相關表是否存在
    console.log('\n🔍 檢查相關表...');
    const [relatedTables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME IN ('Events', 'events', 'Users', 'users')
    `);
    
    const tableNames = relatedTables.map(t => t.TABLE_NAME);
    console.log(`  找到相關表: ${tableNames.join(', ')}`);
    
    if (!tableNames.includes('Events') && !tableNames.includes('events')) {
      console.log('  ⚠️  Events 表不存在');
    }
    if (!tableNames.includes('Users') && !tableNames.includes('users')) {
      console.log('  ⚠️  Users 表不存在');
    }
    
    // 6. 測試插入（不實際插入）
    console.log('\n✅ 檢查完成！');
    
  } catch (error) {
    console.error('❌ 檢查失敗:', error);
    console.error('錯誤詳情:', error.message);
    console.error('堆疊:', error.stack);
  } finally {
    await sequelize.close();
  }
}

checkEventViolationsTable();

