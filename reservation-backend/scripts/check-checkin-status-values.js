// scripts/check-checkin-status-values.js
// 檢查資料庫中 checkinStatus 的實際值

require('dotenv').config();
const { sequelize } = require('../models');

async function checkCheckinStatusValues() {
  try {
    console.log('🔍 檢查資料庫中 checkinStatus 的實際值...\n');

    const result = await sequelize.query(`
      SELECT DISTINCT checkinStatus, COUNT(*) as count
      FROM Reservations
      GROUP BY checkinStatus
      ORDER BY count DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('checkinStatus 值分布:');
    result.forEach(r => {
      const status = r.checkinStatus || '(NULL)';
      console.log(`  ${status}: ${r.count} 筆`);
    });

    // 檢查是否有其他可能的值
    const allStatuses = await sequelize.query(`
      SELECT checkinStatus
      FROM Reservations
      WHERE checkinStatus IS NOT NULL
      GROUP BY checkinStatus
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n所有非 NULL 的 checkinStatus 值:');
    allStatuses.forEach(r => {
      console.log(`  "${r.checkinStatus}" (長度: ${r.checkinStatus.length})`);
    });

    console.log('\n✅ 檢查完成！');
  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

checkCheckinStatusValues();

