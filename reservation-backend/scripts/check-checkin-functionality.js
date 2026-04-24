// scripts/check-checkin-functionality.js
// 檢查簽到功能是否正常運作

require('dotenv').config();
const { sequelize, Reservation, Event } = require('../models');

async function checkCheckinFunctionality() {
  try {
    console.log('🔍 檢查簽到功能...\n');

    // 1. 檢查簽到狀態分布
    console.log('1. 檢查簽到狀態分布...');
    const statusDistribution = await sequelize.query(`
      SELECT 
        checkinStatus,
        COUNT(*) as count,
        COUNT(CASE WHEN checkinTime IS NOT NULL THEN 1 END) as hasCheckinTime
      FROM Reservations
      GROUP BY checkinStatus
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('   簽到狀態分布:');
    statusDistribution.forEach(row => {
      console.log(`     - ${row.checkinStatus}: ${row.count} 筆`);
      if (row.checkinStatus === '已簽到') {
        console.log(`       其中 ${row.hasCheckinTime} 筆有簽到時間記錄`);
      }
    });

    // 2. 檢查已簽到記錄的詳細資訊
    console.log('\n2. 檢查已簽到記錄的詳細資訊...');
    const checkedInReservations = await sequelize.query(`
      SELECT 
        r.id,
        r.studentId,
        r.studentName,
        r.checkinStatus,
        r.checkinTime,
        e.date as eventDate,
        e.name as eventName,
        e.eventType
      FROM Reservations r
      INNER JOIN Events e ON r.eventId = e.id
      WHERE r.checkinStatus = '已簽到'
      ORDER BY r.checkinTime DESC
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });

    if (checkedInReservations.length > 0) {
      console.log(`   找到 ${checkedInReservations.length} 筆已簽到記錄（顯示最近10筆）:`);
      checkedInReservations.forEach(r => {
        console.log(`     - ${r.studentId} (${r.studentName}): ${r.eventDate} ${r.eventName}, 簽到時間: ${r.checkinTime}`);
      });
    } else {
      console.log(`   ⚠️  沒有找到任何已簽到的記錄！`);
    }

    // 3. 檢查簽到時間記錄
    console.log('\n3. 檢查簽到時間記錄...');
    const checkinTimeStats = await sequelize.query(`
      SELECT 
        COUNT(*) as totalReservations,
        COUNT(CASE WHEN checkinTime IS NOT NULL THEN 1 END) as hasCheckinTime,
        COUNT(CASE WHEN checkinTime IS NULL AND checkinStatus = '已簽到' THEN 1 END) as missingCheckinTime
      FROM Reservations
    `, { type: sequelize.QueryTypes.SELECT });

    if (checkinTimeStats[0]) {
      console.log(`   總預約數: ${checkinTimeStats[0].totalReservations}`);
      console.log(`   有簽到時間記錄: ${checkinTimeStats[0].hasCheckinTime}`);
      console.log(`   已簽到但缺少簽到時間: ${checkinTimeStats[0].missingCheckinTime}`);
    }

    // 4. 檢查活動日期與簽到的關係
    console.log('\n4. 檢查活動日期與簽到的關係...');
    const eventCheckinStats = await sequelize.query(`
      SELECT 
        e.date,
        e.name,
        COUNT(r.id) as totalReservations,
        SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) as checkedIn,
        SUM(CASE WHEN r.checkinStatus = '未簽到' THEN 1 ELSE 0 END) as notCheckedIn
      FROM Events e
      LEFT JOIN Reservations r ON e.id = r.eventId
      WHERE e.date >= '2025-08-01'
      GROUP BY e.id, e.date, e.name
      ORDER BY e.date DESC
      LIMIT 20
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`   114-1學期活動簽到統計（最近20個活動）:`);
    eventCheckinStats.forEach(event => {
      const checkinRate = event.totalReservations > 0 
        ? ((event.checkedIn / event.totalReservations) * 100).toFixed(1)
        : 0;
      console.log(`     - ${event.date} ${event.name}: 總預約=${event.totalReservations}, 已簽到=${event.checkedIn}, 未簽到=${event.notCheckedIn}, 簽到率=${checkinRate}%`);
    });

    // 5. 檢查簽到API的限制
    console.log('\n5. 檢查簽到API的限制...');
    const today = new Date().toISOString().split('T')[0];
    console.log(`   當前日期: ${today}`);
    console.log(`   簽到API限制: 只能對當天的活動進行簽到`);
    
    const todayEvents = await sequelize.query(`
      SELECT 
        e.id,
        e.name,
        e.date,
        COUNT(r.id) as reservationCount,
        SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) as checkedInCount
      FROM Events e
      LEFT JOIN Reservations r ON e.id = r.eventId
      WHERE e.date = :today
      GROUP BY e.id, e.name, e.date
    `, {
      replacements: { today },
      type: sequelize.QueryTypes.SELECT
    });

    if (todayEvents.length > 0) {
      console.log(`   今天的活動:`);
      todayEvents.forEach(event => {
        console.log(`     - ${event.name}: 預約數=${event.reservationCount}, 已簽到=${event.checkedInCount}`);
      });
    } else {
      console.log(`   ⚠️  今天沒有活動`);
    }

    // 6. 檢查歷史活動的簽到情況
    console.log('\n6. 檢查歷史活動的簽到情況...');
    const pastEventsStats = await sequelize.query(`
      SELECT 
        DATE(e.date) as eventDate,
        COUNT(DISTINCT e.id) as eventCount,
        COUNT(r.id) as totalReservations,
        SUM(CASE WHEN r.checkinStatus = '已簽到' THEN 1 ELSE 0 END) as checkedIn,
        SUM(CASE WHEN r.checkinStatus = '未簽到' THEN 1 ELSE 0 END) as notCheckedIn
      FROM Events e
      LEFT JOIN Reservations r ON e.id = r.eventId
      WHERE e.date < :today
        AND e.date >= '2025-08-01'
      GROUP BY DATE(e.date)
      ORDER BY DATE(e.date) DESC
      LIMIT 10
    `, {
      replacements: { today },
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`   過去活動的簽到統計（最近10天）:`);
    pastEventsStats.forEach(stat => {
      const checkinRate = stat.totalReservations > 0 
        ? ((stat.checkedIn / stat.totalReservations) * 100).toFixed(1)
        : 0;
      console.log(`     - ${stat.eventDate}: ${stat.eventCount}個活動, 預約=${stat.totalReservations}, 已簽到=${stat.checkedIn}, 簽到率=${checkinRate}%`);
    });

    // 7. 檢查是否有簽到時間但狀態不是已簽到的異常情況
    console.log('\n7. 檢查資料一致性...');
    const inconsistentData = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM Reservations
      WHERE checkinTime IS NOT NULL 
        AND checkinStatus != '已簽到'
    `, { type: sequelize.QueryTypes.SELECT });

    if (inconsistentData[0].count > 0) {
      console.log(`   ⚠️  發現 ${inconsistentData[0].count} 筆資料不一致（有簽到時間但狀態不是已簽到）`);
    } else {
      console.log(`   ✅ 資料一致性正常`);
    }

    console.log('\n✅ 檢查完成！');

    // 總結
    console.log('\n📝 總結:');
    const totalReservations = statusDistribution.reduce((sum, row) => sum + parseInt(row.count), 0);
    const checkedInCount = statusDistribution.find(r => r.checkinStatus === '已簽到')?.count || 0;
    const notCheckedInCount = statusDistribution.find(r => r.checkinStatus === '未簽到')?.count || 0;
    
    console.log(`   - 總預約數: ${totalReservations}`);
    console.log(`   - 已簽到: ${checkedInCount} (${((checkedInCount / totalReservations) * 100).toFixed(1)}%)`);
    console.log(`   - 未簽到: ${notCheckedInCount} (${((notCheckedInCount / totalReservations) * 100).toFixed(1)}%)`);
    
    if (checkedInCount === 0) {
      console.log(`\n   ⚠️  問題診斷:`);
      console.log(`   - 沒有任何已簽到的記錄`);
      console.log(`   - 可能原因:`);
      console.log(`     1. 簽到功能尚未使用（所有活動都還沒進行簽到操作）`);
      console.log(`     2. 簽到API限制：只能對當天的活動進行簽到`);
      console.log(`     3. 歷史活動無法補簽到（因為API限制）`);
      console.log(`\n   💡 建議:`);
      console.log(`   - 如果活動已經結束，需要補簽到，可以考慮:`);
      console.log(`     1. 修改簽到API，允許對過去的活動進行簽到（需要管理員權限）`);
      console.log(`     2. 或者使用匯入刷卡Excel功能來批量簽到`);
      console.log(`     3. 或者修改統計邏輯，將「有預約」也算作參與`);
    }

  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

// 執行檢查
checkCheckinFunctionality();


