// scripts/check-duplicate-reservations.js
// 檢查並報告重複的預約記錄

require('dotenv').config();
const { sequelize, Reservation, Event } = require('../models');

async function checkDuplicateReservations() {
  try {
    console.log('🔍 檢查重複預約記錄...\n');

    // 檢查 eventId + studentId 的重複
    const duplicateByStudentId = await sequelize.query(`
      SELECT 
        eventId,
        studentId,
        COUNT(*) as count,
        GROUP_CONCAT(id ORDER BY id) as reservationIds
      FROM Reservations
      WHERE studentId IS NOT NULL
      GROUP BY eventId, studentId
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // 檢查 eventId + studentEmail 的重複
    const duplicateByEmail = await sequelize.query(`
      SELECT 
        eventId,
        studentEmail,
        COUNT(*) as count,
        GROUP_CONCAT(id ORDER BY id) as reservationIds
      FROM Reservations
      WHERE studentEmail IS NOT NULL
      GROUP BY eventId, studentEmail
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (duplicateByStudentId.length > 0) {
      console.log(`⚠️  發現 ${duplicateByStudentId.length} 組重複的預約（eventId + studentId）:\n`);
      for (const dup of duplicateByStudentId) {
        const event = await Event.findByPk(dup.eventId);
        console.log(`   - 活動: ${event ? event.name : '未知'} (ID: ${dup.eventId})`);
        console.log(`     學號: ${dup.studentId}`);
        console.log(`     重複數: ${dup.count}`);
        console.log(`     預約ID: ${dup.reservationIds}`);
        console.log('');
      }
    } else {
      console.log('✅ 沒有發現重複的預約（eventId + studentId）\n');
    }

    if (duplicateByEmail.length > 0) {
      console.log(`⚠️  發現 ${duplicateByEmail.length} 組重複的預約（eventId + studentEmail）:\n`);
      for (const dup of duplicateByEmail) {
        const event = await Event.findByPk(dup.eventId);
        console.log(`   - 活動: ${event ? event.name : '未知'} (ID: ${dup.eventId})`);
        console.log(`     Email: ${dup.studentEmail}`);
        console.log(`     重複數: ${dup.count}`);
        console.log(`     預約ID: ${dup.reservationIds}`);
        console.log('');
      }
    } else {
      console.log('✅ 沒有發現重複的預約（eventId + studentEmail）\n');
    }

    // 檢查每個活動的預約數和 maxCapacity
    console.log('\n📊 檢查活動預約數和名額:\n');
    const events = await Event.findAll({
      include: [{ model: Reservation, attributes: ['id'] }],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    let issuesFound = 0;
    for (const event of events) {
      const reservedCount = event.Reservations ? event.Reservations.length : 0;
      const maxCapacity = parseInt(event.maxCapacity) || 0;
      const availableSpots = maxCapacity - reservedCount;

      if (availableSpots < 0 || reservedCount > maxCapacity) {
        issuesFound++;
        console.log(`⚠️  活動: ${event.name} (ID: ${event.id})`);
        console.log(`     日期: ${event.date}`);
        console.log(`     最大名額: ${maxCapacity}`);
        console.log(`     預約人數: ${reservedCount}`);
        console.log(`     剩餘名額: ${availableSpots}`);
        console.log('');
      }
    }

    if (issuesFound === 0) {
      console.log('✅ 所有活動的名額計算正常\n');
    } else {
      console.log(`\n⚠️  發現 ${issuesFound} 個活動的名額計算有問題\n`);
    }

    console.log('✅ 檢查完成！');

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

// 執行檢查
checkDuplicateReservations();

