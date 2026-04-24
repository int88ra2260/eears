// scripts/migrate-all-reservations.js
// 遷移所有舊表中的預約記錄，即使 ID 重複也使用新 ID

const { sequelize } = require('../models');

async function migrateAllReservations() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    const cutoffDate = '2025-11-05';

    // 檢查舊表中 2025-11-05 之後的預約記錄
    const oldReservations = await sequelize.query(`
      SELECT r.*, e.date as eventDate
      FROM reservation r
      INNER JOIN event e ON r.eventId = e.id
      WHERE e.date >= :cutoffDate
      AND r.id NOT IN (SELECT id FROM reservations)
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`📊 找到 ${oldReservations.length} 筆需要遷移的預約記錄\n`);

    if (oldReservations.length === 0) {
      console.log('✅ 沒有需要遷移的記錄\n');
      return;
    }

    // 獲取新表的最大 ID
    const maxIdResult = await sequelize.query('SELECT MAX(id) as maxId FROM reservations', {
      type: sequelize.QueryTypes.SELECT
    });
    let nextId = (maxIdResult[0]?.maxId || 0) + 1;

    console.log(`📝 開始遷移，下一個可用 ID: ${nextId}\n`);

    let migrated = 0;
    let skipped = 0;

    for (const oldReservation of oldReservations) {
      try {
        // 檢查新表中是否已經有相同的 eventId + studentId 組合
        const existing = await sequelize.query(`
          SELECT id FROM reservations 
          WHERE eventId = :eventId AND studentId = :studentId
        `, {
          replacements: {
            eventId: oldReservation.eventId,
            studentId: oldReservation.studentId
          },
          type: sequelize.QueryTypes.SELECT
        });

        if (existing.length > 0) {
          skipped++;
          continue;
        }

        // 檢查 eventId 是否存在於新表的 events 中
        const eventExists = await sequelize.query(`
          SELECT id FROM events WHERE id = :eventId
        `, {
          replacements: { eventId: oldReservation.eventId },
          type: sequelize.QueryTypes.SELECT
        });

        if (eventExists.length === 0) {
          console.log(`   ⚠️  跳過預約 ID ${oldReservation.id}：活動 ID ${oldReservation.eventId} 不存在於 events 表`);
          skipped++;
          continue;
        }

        // 插入新記錄，使用新的 ID
        await sequelize.query(`
          INSERT INTO reservations (id, eventId, userId, studentId, studentName, studentEmail, timestamp, checkinStatus, checkinTime, \`group\`)
          VALUES (:id, :eventId, :userId, :studentId, :studentName, :studentEmail, :timestamp, :checkinStatus, :checkinTime, :group)
        `, {
          replacements: {
            id: nextId++,
            eventId: oldReservation.eventId,
            userId: oldReservation.userId,
            studentId: oldReservation.studentId,
            studentName: oldReservation.studentName,
            studentEmail: oldReservation.studentEmail,
            timestamp: oldReservation.timestamp,
            checkinStatus: oldReservation.checkinStatus || '未簽到',
            checkinTime: oldReservation.checkinTime,
            group: oldReservation.group
          }
        });

        migrated++;
        if (migrated % 100 === 0) {
          console.log(`   ✅ 已遷移 ${migrated} 筆...`);
        }
      } catch (error) {
        console.error(`   ❌ 遷移預約 ID ${oldReservation.id} 失敗:`, error.message);
        skipped++;
      }
    }

    console.log(`\n✅ 遷移完成！`);
    console.log(`   成功遷移: ${migrated} 筆`);
    console.log(`   跳過: ${skipped} 筆`);

    // 驗證結果
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

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrateAllReservations();
