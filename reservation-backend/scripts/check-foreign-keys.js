// scripts/check-foreign-keys.js
// 檢查並修正外鍵約束

const { sequelize } = require('../models');

async function checkForeignKeys() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    // 檢查 reservations 表的外鍵約束
    const fkQuery = `
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'reservations'
        AND CONSTRAINT_NAME LIKE '%ibfk%'
    `;

    const foreignKeys = await sequelize.query(fkQuery, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('📋 reservations 表的外鍵約束：');
    if (foreignKeys.length === 0) {
      console.log('   沒有找到外鍵約束\n');
    } else {
      foreignKeys.forEach(fk => {
        console.log(`   - ${fk.CONSTRAINT_NAME}: ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
      });
      console.log('');
    }

    // 檢查是否有指向錯誤表的外鍵約束
    const wrongFk = foreignKeys.filter(fk => 
      fk.REFERENCED_TABLE_NAME === 'Event' || 
      fk.REFERENCED_TABLE_NAME === 'event' ||
      fk.REFERENCED_TABLE_NAME === 'Reservation' ||
      fk.REFERENCED_TABLE_NAME === 'reservation'
    );

    if (wrongFk.length > 0) {
      console.log('⚠️  發現指向錯誤表的外鍵約束：');
      wrongFk.forEach(fk => {
        console.log(`   - ${fk.CONSTRAINT_NAME} 指向 ${fk.REFERENCED_TABLE_NAME}（應該是 events 或 reservations）`);
      });
      console.log('\n💡 建議：');
      console.log('   1. 刪除錯誤的外鍵約束');
      console.log('   2. 重新建立指向正確表的外鍵約束');
      console.log('   3. 或使用 migration 腳本來修正\n');
    } else {
      console.log('✅ 所有外鍵約束都指向正確的表\n');
    }

    // 檢查表是否存在
    const tables = await sequelize.query('SHOW TABLES', {
      type: sequelize.QueryTypes.SELECT
    });

    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('📊 資料庫中的表：');
    console.log(`   - events: ${tableNames.includes('events') ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - event: ${tableNames.includes('event') ? '⚠️  存在（可能是舊表）' : '✅ 不存在'}`);
    console.log(`   - reservations: ${tableNames.includes('reservations') ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`   - reservation: ${tableNames.includes('reservation') ? '⚠️  存在（可能是舊表）' : '✅ 不存在'}`);
    console.log('');

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkForeignKeys();
