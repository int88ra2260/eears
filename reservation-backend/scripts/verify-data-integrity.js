// scripts/verify-data-integrity.js
// 驗證遷移後資料完整性，檢查是否有資料遺失

const { sequelize } = require('../models');

async function verifyDataIntegrity() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    const cutoffDate = '2025-11-05';

    // 1. 檢查舊表中 2025-11-05 之後的預約記錄總數
    const oldReservationsCount = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM reservation r
      INNER JOIN event e ON r.eventId = e.id
      WHERE e.date >= :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    // 2. 檢查新表中 2025-11-05 之後的預約記錄總數
    const newReservationsCount = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM reservations r
      INNER JOIN events e ON r.eventId = e.id
      WHERE e.date >= :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    console.log('📊 資料統計：');
    console.log(`   舊表 (reservation) 中 ${cutoffDate} 之後的預約數: ${oldReservationsCount[0]?.count || 0}`);
    console.log(`   新表 (reservations) 中 ${cutoffDate} 之後的預約數: ${newReservationsCount[0]?.count || 0}\n`);

    // 3. 檢查每個活動的預約數對比
    console.log('📋 活動預約數對比（舊表 vs 新表）：');
    
    const oldEventReservations = await sequelize.query(`
      SELECT 
        e.id as eventId,
        e.name,
        e.date,
        COUNT(r.id) as reservationCount
      FROM event e
      LEFT JOIN reservation r ON e.id = r.eventId
      WHERE e.date >= :cutoffDate
      GROUP BY e.id, e.name, e.date
      ORDER BY e.date, e.name
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    const newEventReservations = await sequelize.query(`
      SELECT 
        e.id as eventId,
        e.name,
        e.date,
        COUNT(r.id) as reservationCount
      FROM events e
      LEFT JOIN reservations r ON e.id = r.eventId
      WHERE e.date >= :cutoffDate
      GROUP BY e.id, e.name, e.date
      ORDER BY e.date, e.name
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    // 建立對照表
    const oldMap = new Map();
    oldEventReservations.forEach(e => {
      oldMap.set(e.eventId, e);
    });

    const newMap = new Map();
    newEventReservations.forEach(e => {
      newMap.set(e.eventId, e);
    });

    let missingCount = 0;
    let mismatchCount = 0;

    console.log('\n   活動 ID | 日期 | 活動名稱 | 舊表預約數 | 新表預約數 | 狀態');
    console.log('   ' + '-'.repeat(80));

    // 檢查所有活動
    const allEventIds = new Set([...oldMap.keys(), ...newMap.keys()]);
    
    for (const eventId of allEventIds) {
      const oldData = oldMap.get(eventId);
      const newData = newMap.get(eventId);
      
      const oldCount = oldData?.reservationCount || 0;
      const newCount = newData?.reservationCount || 0;
      
      let status = '✅';
      if (!newData) {
        status = '❌ 新表中不存在';
        missingCount++;
      } else if (oldCount !== newCount) {
        status = `⚠️  數量不符 (差 ${oldCount - newCount})`;
        mismatchCount++;
      }

      if (oldData) {
        console.log(`   ${eventId} | ${oldData.date} | ${oldData.name.substring(0, 20).padEnd(20)} | ${oldCount.toString().padStart(10)} | ${newCount.toString().padStart(10)} | ${status}`);
      } else if (newData) {
        console.log(`   ${eventId} | ${newData.date} | ${newData.name.substring(0, 20).padEnd(20)} | ${'N/A'.padStart(10)} | ${newCount.toString().padStart(10)} | ⚠️  舊表中不存在`);
      }
    }

    // 4. 檢查是否有預約記錄遺失（基於 eventId + studentId 組合）
    console.log('\n🔍 檢查預約記錄完整性...');
    
    const oldReservations = await sequelize.query(`
      SELECT 
        r.eventId,
        r.studentId,
        r.studentName,
        e.date as eventDate
      FROM reservation r
      INNER JOIN event e ON r.eventId = e.id
      WHERE e.date >= :cutoffDate
    `, {
      replacements: { cutoffDate },
      type: sequelize.QueryTypes.SELECT
    });

    let missingReservations = [];
    for (const oldRes of oldReservations) {
      const exists = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM reservations r
        INNER JOIN events e ON r.eventId = e.id
        WHERE r.eventId = :eventId 
          AND r.studentId = :studentId
          AND e.date >= :cutoffDate
      `, {
        replacements: {
          eventId: oldRes.eventId,
          studentId: oldRes.studentId,
          cutoffDate
        },
        type: sequelize.QueryTypes.SELECT
      });

      if (exists[0]?.count === 0) {
        missingReservations.push(oldRes);
      }
    }

    console.log(`   檢查了 ${oldReservations.length} 筆舊表預約記錄`);
    console.log(`   遺失的預約記錄: ${missingReservations.length} 筆`);

    if (missingReservations.length > 0) {
      console.log('\n   ⚠️  遺失的預約記錄詳情（前10筆）：');
      missingReservations.slice(0, 10).forEach(res => {
        console.log(`     活動 ID ${res.eventId} (${res.eventDate}): ${res.studentId} - ${res.studentName}`);
      });
    }

    // 5. 總結
    console.log('\n📊 驗證總結：');
    console.log(`   ✅ 資料完整的活動: ${allEventIds.size - missingCount - mismatchCount}`);
    console.log(`   ⚠️  新表中不存在的活動: ${missingCount}`);
    console.log(`   ⚠️  預約數不符的活動: ${mismatchCount}`);
    console.log(`   ⚠️  遺失的預約記錄: ${missingReservations.length}`);

    if (missingReservations.length > 0 || missingCount > 0 || mismatchCount > 0) {
      console.log('\n❌ 發現資料遺失或不一致！');
      console.log('   建議執行完整的資料遷移腳本。');
    } else {
      console.log('\n✅ 資料完整性驗證通過！');
    }

  } catch (error) {
    console.error('❌ 錯誤:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

verifyDataIntegrity();
