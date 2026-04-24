// scripts/test-unified-query.js
// 測試統一查詢是否正確

const { sequelize, Event } = require('../models');
const { getMultipleEventsCheckinStats } = require('../utils/eventStats');

async function testUnifiedQuery() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    // 測試查詢 2025-11-05 之後的活動
    const eventsAfter = await sequelize.query(`
      SELECT id, name, date 
      FROM (
        SELECT id, name, date FROM events WHERE date >= '2025-11-05'
        UNION ALL
        SELECT id, name, date FROM event WHERE date >= '2025-11-05'
      ) AS combined_events
      ORDER BY date ASC
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📋 2025-11-05 之後的活動：');
    eventsAfter.forEach(e => {
      console.log(`   - ${e.name} (${e.date}): ID=${e.id}`);
    });
    console.log('');

    if (eventsAfter.length > 0) {
      const eventIds = eventsAfter.map(e => e.id);
      console.log('🔍 使用統計函數查詢這些活動的預約數：');
      const stats = await getMultipleEventsCheckinStats(eventIds);
      
      eventsAfter.forEach(e => {
        const stat = stats.get(e.id) || { totalReservations: 0 };
        console.log(`   - ${e.name} (${e.date}): ${stat.totalReservations} 筆預約`);
      });
      console.log('');

      // 直接查詢資料庫驗證
      console.log('🔍 直接查詢資料庫驗證：');
      for (const e of eventsAfter.slice(0, 3)) {
        const directQuery = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM (
            SELECT id FROM reservations WHERE eventId = :eventId
            UNION ALL
            SELECT id FROM reservation WHERE eventId = :eventId
          ) AS combined
        `, {
          replacements: { eventId: e.id },
          type: sequelize.QueryTypes.SELECT
        });
        console.log(`   - ${e.name} (${e.date}): 直接查詢 = ${directQuery[0]?.count || 0} 筆`);
      }
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testUnifiedQuery();
