// scripts/check-date-split.js
// 檢查2025/11/05之前和之後的資料是否使用不同的表

const { sequelize } = require('../models');

async function checkDateSplit() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    // 檢查2025/11/05之前和之後的預約資料
    const beforeCount = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM reservations r 
      INNER JOIN events e ON r.eventId = e.id 
      WHERE e.date < '2025-11-05'
    `, { type: sequelize.QueryTypes.SELECT });

    const afterCount = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM reservations r 
      INNER JOIN events e ON r.eventId = e.id 
      WHERE e.date >= '2025-11-05'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📊 預約資料統計：');
    console.log(`   2025-11-05 之前: ${beforeCount[0]?.count || 0} 筆`);
    console.log(`   2025-11-05 之後: ${afterCount[0]?.count || 0} 筆\n`);

    // 檢查活動統計（使用統計函數）
    const sampleBefore = await sequelize.query(`
      SELECT 
        e.id as eventId, 
        e.name, 
        e.date,
        COUNT(r.id) as reservationCount
      FROM events e 
      LEFT JOIN reservations r ON e.id = r.eventId 
      WHERE e.date < '2025-11-05' 
      GROUP BY e.id 
      ORDER BY e.date DESC 
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    const sampleAfter = await sequelize.query(`
      SELECT 
        e.id as eventId, 
        e.name, 
        e.date,
        COUNT(r.id) as reservationCount
      FROM events e 
      LEFT JOIN reservations r ON e.id = r.eventId 
      WHERE e.date >= '2025-11-05' 
      GROUP BY e.id 
      ORDER BY e.date ASC 
      LIMIT 5
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📋 2025-11-05 之前的活動範例：');
    sampleBefore.forEach(event => {
      console.log(`   - ${event.name} (${event.date}): ${event.reservationCount} 筆預約`);
    });
    console.log('');

    console.log('📋 2025-11-05 之後的活動範例：');
    sampleAfter.forEach(event => {
      console.log(`   - ${event.name} (${event.date}): ${event.reservationCount} 筆預約`);
    });
    console.log('');

    // 檢查是否使用了不同的表
    const tables = await sequelize.query('SHOW TABLES', {
      type: sequelize.QueryTypes.SELECT
    });

    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('📊 檢查是否有日期相關的表：');
    const dateTables = tableNames.filter(name => 
      name.includes('2025') || 
      name.includes('reservation') || 
      name.includes('event')
    );
    dateTables.forEach(name => {
      console.log(`   - ${name}`);
    });
    console.log('');

    // 檢查 reservation 表（單數）中是否有資料
    if (tableNames.includes('reservation')) {
      const reservationTableCount = await sequelize.query(`
        SELECT COUNT(*) as count FROM reservation
      `, { type: sequelize.QueryTypes.SELECT });
      console.log(`⚠️  reservation 表（單數）中有 ${reservationTableCount[0]?.count || 0} 筆資料`);
      
      // 檢查這個表中的日期分布
      const reservationTableDates = await sequelize.query(`
        SELECT COUNT(*) as count 
        FROM reservation r 
        INNER JOIN event e ON r.eventId = e.id 
        WHERE e.date >= '2025-11-05'
      `, { type: sequelize.QueryTypes.SELECT });
      console.log(`   reservation 表中 2025-11-05 之後的資料: ${reservationTableDates[0]?.count || 0} 筆\n`);
    }

    // 檢查 event 表（單數）中是否有資料
    if (tableNames.includes('event')) {
      const eventTableCount = await sequelize.query(`
        SELECT COUNT(*) as count FROM event WHERE date >= '2025-11-05'
      `, { type: sequelize.QueryTypes.SELECT });
      console.log(`⚠️  event 表（單數）中有 ${eventTableCount[0]?.count || 0} 筆 2025-11-05 之後的活動\n`);
    }

    // 使用統計函數檢查
    const { getMultipleEventsCheckinStats } = require('../utils/eventStats');
    const { Event } = require('../models');
    
    const eventsBefore = await Event.findAll({
      where: sequelize.where(sequelize.col('Event.date'), '<', '2025-11-05'),
      limit: 3,
      order: [['date', 'DESC']]
    });

    const eventsAfter = await Event.findAll({
      where: sequelize.where(sequelize.col('Event.date'), '>=', '2025-11-05'),
      limit: 3,
      order: [['date', 'ASC']]
    });

    console.log('🔍 使用統計函數檢查：');
    if (eventsBefore.length > 0) {
      const eventIdsBefore = eventsBefore.map(e => e.id);
      const statsBefore = await getMultipleEventsCheckinStats(eventIdsBefore);
      console.log('   2025-11-05 之前的活動統計：');
      eventsBefore.forEach(event => {
        const stats = statsBefore.get(event.id) || { totalReservations: 0 };
        console.log(`   - ${event.name} (${event.date}): ${stats.totalReservations} 筆預約`);
      });
    }

    if (eventsAfter.length > 0) {
      const eventIdsAfter = eventsAfter.map(e => e.id);
      const statsAfter = await getMultipleEventsCheckinStats(eventIdsAfter);
      console.log('   2025-11-05 之後的活動統計：');
      eventsAfter.forEach(event => {
        const stats = statsAfter.get(event.id) || { totalReservations: 0 };
        console.log(`   - ${event.name} (${event.date}): ${stats.totalReservations} 筆預約`);
      });
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkDateSplit();
