// scripts/check-student-id-mismatch.js
// 檢查學生ID不匹配問題

require('dotenv').config();
const { sequelize, Class, ClassMembership, Reservation, Event } = require('../models');

async function checkStudentIdMismatch() {
  try {
    console.log('🔍 檢查學生ID匹配問題...\n');

    // 1. 取得所有班級的學生ID
    console.log('1. 取得班級學生ID列表...');
    const classMemberships = await ClassMembership.findAll({
      attributes: ['studentId', 'classId', 'semester'],
      include: [{
        model: Class,
        attributes: ['name', 'semester']
      }]
    });

    const classStudentIds = [...new Set(classMemberships.map(m => m.studentId))];
    console.log(`   班級學生ID總數: ${classStudentIds.length}`);
    console.log(`   班級學生ID範例:`, classStudentIds.slice(0, 10));

    // 2. 取得所有預約中的學生ID
    console.log('\n2. 取得預約資料中的學生ID列表...');
    const reservationStudentIds = await sequelize.query(`
      SELECT DISTINCT studentId
      FROM Reservations
      WHERE studentId IS NOT NULL
    `, { type: sequelize.QueryTypes.SELECT });

    const reservationIds = reservationStudentIds.map(r => r.studentId);
    console.log(`   預約學生ID總數: ${reservationIds.length}`);
    console.log(`   預約學生ID範例:`, reservationIds.slice(0, 10));

    // 3. 檢查匹配情況
    console.log('\n3. 檢查ID匹配情況...');
    const matchedIds = classStudentIds.filter(id => reservationIds.includes(id));
    const unmatchedClassIds = classStudentIds.filter(id => !reservationIds.includes(id));
    const unmatchedReservationIds = reservationIds.filter(id => !classStudentIds.includes(id));

    console.log(`   匹配的學生ID數: ${matchedIds.length}`);
    console.log(`   班級中但沒有預約的學生ID數: ${unmatchedClassIds.length}`);
    console.log(`   有預約但不在班級中的學生ID數: ${unmatchedReservationIds.length}`);

    if (matchedIds.length > 0) {
      console.log(`   匹配的學生ID範例:`, matchedIds.slice(0, 5));
    }

    if (unmatchedClassIds.length > 0) {
      console.log(`   班級中但沒有預約的學生ID範例:`, unmatchedClassIds.slice(0, 5));
    }

    // 4. 檢查匹配學生的預約統計
    if (matchedIds.length > 0) {
      console.log('\n4. 檢查匹配學生的預約統計...');
      const matchedStats = await sequelize.query(`
        SELECT 
          r.studentId,
          COUNT(*) as totalReservations,
          SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) as attendedCount,
          SUM(CASE WHEN r.checkinStatus = '未簽到' THEN 1 ELSE 0 END) as notAttendedCount,
          SUM(CASE WHEN r.checkinStatus = '已登記違規' THEN 1 ELSE 0 END) as violationCount
        FROM Reservations r
        WHERE r.studentId IN (:studentIds)
        GROUP BY r.studentId
        LIMIT 10
      `, {
        replacements: { studentIds: matchedIds },
        type: sequelize.QueryTypes.SELECT
      });

      console.log(`   匹配學生的預約統計（前10名）:`);
      matchedStats.forEach(stat => {
        console.log(`      - ${stat.studentId}: 總預約=${stat.totalReservations}, 已簽到=${stat.attendedCount}, 未簽到=${stat.notAttendedCount}, 違規=${stat.violationCount}`);
      });
    }

    // 5. 檢查114-1學期的活動和預約
    console.log('\n5. 檢查114-1學期的活動和預約...');
    const events1141 = await sequelize.query(`
      SELECT 
        e.id,
        e.name,
        e.date,
        e.eventType,
        COUNT(r.id) as reservationCount,
        SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) as attendedCount
      FROM Events e
      LEFT JOIN Reservations r ON e.id = r.eventId
      WHERE e.date BETWEEN '2025-08-01' AND '2026-01-31'
      GROUP BY e.id, e.name, e.date, e.eventType
      ORDER BY e.date DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`   114-1學期活動統計（最近10個）:`);
    events1141.forEach(event => {
      console.log(`      - ${event.date} ${event.name}: 預約數=${event.reservationCount}, 簽到數=${event.attendedCount}`);
    });

    // 6. 檢查班級學生在114-1學期的預約
    if (classStudentIds.length > 0) {
      console.log('\n6. 檢查班級學生在114-1學期的預約...');
      const classReservations1141 = await sequelize.query(`
        SELECT 
          r.studentId,
          COUNT(*) as totalReservations,
          SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) as attendedCount
        FROM Reservations r
        INNER JOIN Events e ON r.eventId = e.id
        WHERE r.studentId IN (:studentIds)
          AND e.date BETWEEN '2025-08-01' AND '2026-01-31'
        GROUP BY r.studentId
        LIMIT 10
      `, {
        replacements: { studentIds: classStudentIds },
        type: sequelize.QueryTypes.SELECT
      });

      if (classReservations1141.length > 0) {
        console.log(`   班級學生在114-1學期的預約統計（前10名）:`);
        classReservations1141.forEach(stat => {
          console.log(`      - ${stat.studentId}: 預約數=${stat.totalReservations}, 簽到數=${stat.attendedCount}`);
        });
      } else {
        console.log(`   ⚠️  班級學生在114-1學期沒有任何預約記錄！`);
      }
    }

    console.log('\n✅ 檢查完成！');

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

// 執行檢查
checkStudentIdMismatch();


