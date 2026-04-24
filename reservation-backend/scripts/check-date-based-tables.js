// scripts/check-date-based-tables.js
// 檢查2025/11/05前後的資料是否使用不同的表

const { sequelize, Event, Reservation } = require('../models');

async function checkDateBasedTables() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    const cutoffDate = '2025-11-05';

    // 檢查2025-11-05之前的預約數
    const beforeCount = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM reservations r 
      INNER JOIN events e ON r.eventId = e.id 
      WHERE e.date < :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    // 檢查2025-11-05之後的預約數
    const afterCount = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM reservations r 
      INNER JOIN events e ON r.eventId = e.id 
      WHERE e.date >= :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📊 ${cutoffDate} 之前的預約數: ${beforeCount[0]?.count || 0}`);
    console.log(`📊 ${cutoffDate} 之後的預約數: ${afterCount[0]?.count || 0}\n`);

    // 檢查2025-11-05之前的活動範例
    const sampleBefore = await sequelize.query(`
      SELECT 
        e.id, 
        e.name, 
        e.date, 
        COUNT(r.id) as reservationCount,
        e.maxCapacity
      FROM events e 
      LEFT JOIN reservations r ON e.id = r.eventId 
      WHERE e.date < :cutoffDate
      GROUP BY e.id, e.name, e.date, e.maxCapacity
      ORDER BY e.date DESC 
      LIMIT 5
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    // 檢查2025-11-05之後的活動範例
    const sampleAfter = await sequelize.query(`
      SELECT 
        e.id, 
        e.name, 
        e.date, 
        COUNT(r.id) as reservationCount,
        e.maxCapacity
      FROM events e 
      LEFT JOIN reservations r ON e.id = r.eventId 
      WHERE e.date >= :cutoffDate
      GROUP BY e.id, e.name, e.date, e.maxCapacity
      ORDER BY e.date ASC 
      LIMIT 5
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`\n📅 ${cutoffDate} 之前的活動範例:`);
    sampleBefore.forEach(e => {
      const available = e.maxCapacity - e.reservationCount;
      console.log(`  ${e.date} ${e.name}: ${e.reservationCount} 預約, 剩餘 ${available}`);
    });

    console.log(`\n📅 ${cutoffDate} 之後的活動範例:`);
    sampleAfter.forEach(e => {
      const available = e.maxCapacity - e.reservationCount;
      console.log(`  ${e.date} ${e.name}: ${e.reservationCount} 預約, 剩餘 ${available}`);
    });

    // 檢查是否有預約記錄但活動不在events表中
    const orphanReservations = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM reservations r
      LEFT JOIN events e ON r.eventId = e.id
      WHERE e.id IS NULL
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`\n⚠️  孤兒預約記錄（活動不存在）: ${orphanReservations[0]?.count || 0}`);

    // 檢查是否有活動但預約記錄在錯誤的表中
    const eventsWithoutReservations = await sequelize.query(`
      SELECT 
        e.id,
        e.name,
        e.date,
        (SELECT COUNT(*) FROM reservations WHERE eventId = e.id) as reservationCount
      FROM events e
      WHERE e.date >= :cutoffDate
      ORDER BY e.date ASC
      LIMIT 10
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`\n🔍 ${cutoffDate} 之後的活動詳細檢查:`);
    eventsWithoutReservations.forEach(e => {
      console.log(`  Event ID ${e.id}: ${e.date} ${e.name} - 預約數: ${e.reservationCount}`);
    });

    // 檢查是否有使用不同表名的情況
    const allTables = await sequelize.query('SHOW TABLES', {
      type: sequelize.QueryTypes.SELECT
    });

    const tableNames = allTables.map(t => Object.values(t)[0]);
    console.log(`\n📋 資料庫中的所有表:`);
    ['events', 'event', 'reservations', 'reservation'].forEach(tn => {
      const exists = tableNames.includes(tn);
      console.log(`  ${tn}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    });

    // 檢查舊表（event, reservation）中是否有2025-11-05之後的資料
    if (tableNames.includes('event')) {
      const oldEventAfter = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM event
        WHERE date >= :cutoffDate
      `, {
        replacements: { cutoffDate },
        type: sequelize.QueryTypes.SELECT
      });
      console.log(`\n📊 舊表 'event' 中 ${cutoffDate} 之後的活動數: ${oldEventAfter[0]?.count || 0}`);
    }

    if (tableNames.includes('reservation')) {
      const oldReservationAfter = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM reservation r
        INNER JOIN event e ON r.eventId = e.id
        WHERE e.date >= :cutoffDate
      `, {
        replacements: { cutoffDate },
        type: sequelize.QueryTypes.SELECT
      });
      console.log(`📊 舊表 'reservation' 中 ${cutoffDate} 之後的預約數: ${oldReservationAfter[0]?.count || 0}`);
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkDateBasedTables();
