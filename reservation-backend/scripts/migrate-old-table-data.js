// scripts/migrate-old-table-data.js
// 將舊表（event, reservation）中的資料遷移到新表（events, reservations）

const { sequelize } = require('../models');

async function migrateOldTableData() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    // 檢查舊表是否存在
    const tables = await sequelize.query('SHOW TABLES', {
      type: sequelize.QueryTypes.SELECT
    });

    const tableNames = tables.map(t => Object.values(t)[0]);
    const hasOldEventTable = tableNames.includes('event');
    const hasOldReservationTable = tableNames.includes('reservation');

    if (!hasOldEventTable && !hasOldReservationTable) {
      console.log('✅ 沒有發現舊表，無需遷移\n');
      return;
    }

    console.log('📋 開始遷移舊表資料...\n');

    // 1. 遷移 event 表到 events 表
    if (hasOldEventTable) {
      console.log('1. 遷移 event 表到 events 表...');
      
      // 檢查是否有重複的 ID
      const duplicateEvents = await sequelize.query(`
        SELECT e1.id
        FROM event e1
        INNER JOIN events e2 ON e1.id = e2.id
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      if (duplicateEvents.length > 0) {
        console.log(`   ⚠️  發現 ${duplicateEvents.length} 筆重複的活動 ID，將跳過這些記錄`);
      }

      // 遷移不重複的活動
      const migrateEvents = await sequelize.query(`
        INSERT INTO events (id, name, date, startTime, endTime, maxCapacity, eventType, customReservationRule, location, autoCheckCompleted)
        SELECT id, name, date, startTime, endTime, maxCapacity, eventType, customReservationRule, location, 
               COALESCE(autoCheckCompleted, 0) as autoCheckCompleted
        FROM event
        WHERE id NOT IN (SELECT id FROM events)
        ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          date = VALUES(date),
          startTime = VALUES(startTime),
          endTime = VALUES(endTime),
          maxCapacity = VALUES(maxCapacity),
          eventType = VALUES(eventType),
          customReservationRule = VALUES(customReservationRule),
          location = VALUES(location),
          autoCheckCompleted = VALUES(autoCheckCompleted)
      `);

      console.log(`   ✅ 已遷移活動資料`);
    }

    // 2. 遷移 reservation 表到 reservations 表
    if (hasOldReservationTable) {
      console.log('\n2. 遷移 reservation 表到 reservations 表...');
      
      // 檢查是否有重複的 ID
      const duplicateReservations = await sequelize.query(`
        SELECT r1.id
        FROM reservation r1
        INNER JOIN reservations r2 ON r1.id = r2.id
      `, {
        type: sequelize.QueryTypes.SELECT
      });

      if (duplicateReservations.length > 0) {
        console.log(`   ⚠️  發現 ${duplicateReservations.length} 筆重複的預約 ID，將跳過這些記錄`);
      }

      // 遷移不重複的預約
      const migrateReservations = await sequelize.query(`
        INSERT INTO reservations (id, eventId, userId, studentId, studentName, studentEmail, timestamp, checkinStatus, checkinTime, \`group\`)
        SELECT id, eventId, userId, studentId, studentName, studentEmail, timestamp, 
               COALESCE(checkinStatus, '未簽到') as checkinStatus,
               checkinTime,
               \`group\`
        FROM reservation
        WHERE id NOT IN (SELECT id FROM reservations)
        ON DUPLICATE KEY UPDATE
          eventId = VALUES(eventId),
          userId = VALUES(userId),
          studentId = VALUES(studentId),
          studentName = VALUES(studentName),
          studentEmail = VALUES(studentEmail),
          timestamp = VALUES(timestamp),
          checkinStatus = VALUES(checkinStatus),
          checkinTime = VALUES(checkinTime),
          \`group\` = VALUES(\`group\`)
      `);

      console.log(`   ✅ 已遷移預約資料`);
    }

    // 3. 驗證遷移結果
    console.log('\n3. 驗證遷移結果...');
    
    const eventsCount = await sequelize.query('SELECT COUNT(*) as count FROM events', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`   events 表總數: ${eventsCount[0]?.count || 0}`);

    const reservationsCount = await sequelize.query('SELECT COUNT(*) as count FROM reservations', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`   reservations 表總數: ${reservationsCount[0]?.count || 0}`);

    // 檢查 2025-11-05 之後的資料
    const afterDate = '2025-11-05';
    const eventsAfter = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM events 
      WHERE date >= :afterDate
    `, {
      replacements: { afterDate },
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`   ${afterDate} 之後的活動數: ${eventsAfter[0]?.count || 0}`);

    const reservationsAfter = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM reservations r
      INNER JOIN events e ON r.eventId = e.id
      WHERE e.date >= :afterDate
    `, {
      replacements: { afterDate },
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`   ${afterDate} 之後的預約數: ${reservationsAfter[0]?.count || 0}`);

    console.log('\n✅ 遷移完成！');

  } catch (error) {
    console.error('❌ 遷移錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrateOldTableData();
