/**
 * 執行英語學習歷程中心 legacy 英檢資料 migration（若專案未使用 sequelize-cli）
 * node scripts/run-english-test-tracking-migration.js [down]
 */
require('dotenv').config();
const sequelize = require('../db');
const Sequelize = require('sequelize');
const migration = require('../migrations/20260224000001-create-english-test-tracking-tables.js');

async function main() {
  const queryInterface = sequelize.getQueryInterface();
  const runDown = process.argv.includes('down');
  try {
    if (runDown) {
      await migration.down(queryInterface, Sequelize);
      console.log('Migration down completed.');
    } else {
      await migration.up(queryInterface, Sequelize);
      console.log('Migration up completed.');
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
  process.exit(0);
}

main();
