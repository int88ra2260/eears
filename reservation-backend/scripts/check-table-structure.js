// scripts/check-table-structure.js
// 檢查表結構

const { sequelize } = require('../models');

async function checkTableStructure() {
  try {
    await sequelize.authenticate();
    console.log('Checking table structures...\n');

    const columns = await sequelize.query('DESCRIBE reservations', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log('reservations table columns:');
    columns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });

    const oldColumns = await sequelize.query('DESCRIBE reservation', {
      type: sequelize.QueryTypes.SELECT
    });
    console.log('\nreservation table columns:');
    oldColumns.forEach(col => {
      console.log(`  ${col.Field} (${col.Type})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkTableStructure();
