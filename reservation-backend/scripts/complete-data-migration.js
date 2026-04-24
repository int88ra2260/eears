// scripts/complete-data-migration.js
// 完整遷移所有預約資料，根據活動資訊匹配而非 ID

const { sequelize } = require('../models');

async function completeDataMigration() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    const cutoffDate = '2025-11-05';

    // 1. 獲取所有舊表中 2025-11-05 之後的預約記錄
    const oldReservations = await sequelize.query(`
      SELECT 
        r.*,
        e.id as oldEventId,
        e.name as eventName,
        e.date as eventDate,
        e.startTime as eventStartTime,
        e.endTime as eventEndTime,
        e.eventType
      FROM reservation r
      INNER JOIN event e ON r.eventId = e.id
      WHERE e.date >= :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📊 找到 ${oldReservations.length} 筆需要遷移的預約記錄\n`);

    if (oldReservations.length === 0) {
      console.log('✅ 沒有需要遷移的記錄\n');
      return;
    }

    // 2. 獲取新表中的最大 ID
    const maxIdResult = await sequelize.query('SELECT MAX(id) as maxId FROM reservations', {
      type: sequelize.QueryTypes.SELECT
    });
    let nextId = (maxIdResult[0]?.maxId || 0) + 1;

    console.log(`📝 開始遷移，下一個可用 ID: ${nextId}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // 3. 為每個預約記錄找到對應的新活動 ID
    for (const oldRes of oldReservations) {
      try {
        // 根據活動資訊找到新表中的活動 ID
        const matchingEvent = await sequelize.query(`
          SELECT id 
          FROM events 
          WHERE name = :name 
            AND date = :date 
            AND startTime = :startTime 
            AND endTime = :endTime
            AND (eventType = :eventType OR (:eventType IS NULL AND eventType IS NULL))
          LIMIT 1
        `, {
          replacements: {
            name: oldRes.eventName,
            date: oldRes.eventDate,
            startTime: oldRes.eventStartTime,
            endTime: oldRes.eventEndTime,
            eventType: oldRes.eventType
          },
          type: sequelize.QueryTypes.SELECT
        });

        if (matchingEvent.length === 0) {
          console.log(`   ⚠️  跳過預約：找不到匹配的活動 (${oldRes.eventDate} ${oldRes.eventName})`);
          skipped++;
          continue;
        }

        const newEventId = matchingEvent[0].id;

        // 檢查新表中是否已經有相同的預約（基於 eventId + studentId）
        const existing = await sequelize.query(`
          SELECT id FROM reservations 
          WHERE eventId = :eventId AND studentId = :studentId
        `, {
          replacements: {
            eventId: newEventId,
            studentId: oldRes.studentId
          },
          type: sequelize.QueryTypes.SELECT
        });

        if (existing.length > 0) {
          // 已存在，跳過
          skipped++;
          continue;
        }

        // 插入新記錄
        await sequelize.query(`
          INSERT INTO reservations (id, eventId, userId, studentId, studentName, studentEmail, timestamp, checkinStatus, checkinTime, \`group\`)
          VALUES (:id, :eventId, :userId, :studentId, :studentName, :studentEmail, :timestamp, :checkinStatus, :checkinTime, :group)
        `, {
          replacements: {
            id: nextId++,
            eventId: newEventId,
            userId: oldRes.userId,
            studentId: oldRes.studentId,
            studentName: oldRes.studentName,
            studentEmail: oldRes.studentEmail,
            timestamp: oldRes.timestamp,
            checkinStatus: oldRes.checkinStatus || '未簽到',
            checkinTime: oldRes.checkinTime,
            group: oldRes.group
          }
        });

        migrated++;
        if (migrated % 100 === 0) {
          console.log(`   ✅ 已遷移 ${migrated} 筆...`);
        }
      } catch (error) {
        console.error(`   ❌ 遷移預約失敗 (活動: ${oldRes.eventName}, 學生: ${oldRes.studentId}):`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ 遷移完成！`);
    console.log(`   成功遷移: ${migrated} 筆`);
    console.log(`   跳過: ${skipped} 筆`);
    console.log(`   錯誤: ${errors} 筆`);

    // 4. 驗證結果
    const finalCount = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM reservations r
      INNER JOIN events e ON r.eventId = e.id
      WHERE e.date >= :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`\n📊 ${cutoffDate} 之後的預約總數: ${finalCount[0]?.count || 0}`);
    console.log(`   預期: ${oldReservations.length} 筆`);
    console.log(`   實際: ${finalCount[0]?.count || 0} 筆`);

    if (finalCount[0]?.count < oldReservations.length) {
      const missing = oldReservations.length - finalCount[0]?.count;
      console.log(`\n⚠️  仍有 ${missing} 筆預約記錄未遷移（可能是重複記錄或找不到匹配的活動）`);
    } else {
      console.log(`\n✅ 所有預約記錄已成功遷移！`);
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

completeDataMigration();
