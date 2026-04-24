// 修正 event_violations 外鍵：從 event 改為參考 events 表（與 Event model 的 tableName 一致）
// 錯誤情境：event_violations.eventId 參考到 event(id)，但實際活動資料在 events 表，導致 FK 約束失敗
// （生產環境常見 CONSTRAINT 名稱如 event_violations_ibfk_13）

'use strict';

const TARGET_FK_NAME = 'event_violations_eventId_events_fk';

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'mysql') return;

    const tableName = 'event_violations';

    const [wrongFks] = await queryInterface.sequelize.query(`
      SELECT DISTINCT kcu.CONSTRAINT_NAME AS name, kcu.REFERENCED_TABLE_NAME AS refTable
      FROM information_schema.KEY_COLUMN_USAGE kcu
      INNER JOIN information_schema.TABLE_CONSTRAINTS tc
        ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND tc.TABLE_NAME = kcu.TABLE_NAME
        AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      WHERE kcu.TABLE_SCHEMA = DATABASE()
        AND kcu.TABLE_NAME = :tableName
        AND kcu.COLUMN_NAME = 'eventId'
        AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
    `, { replacements: { tableName } });

    for (const row of wrongFks) {
      const ref = (row.refTable || '').toLowerCase();
      if (ref !== 'events') {
        await queryInterface.removeConstraint(tableName, row.name);
        console.log(`✅ 已移除錯誤外鍵 ${row.name}（曾參考 ${row.refTable}）`);
      }
    }

    const [hasCorrect] = await queryInterface.sequelize.query(`
      SELECT kcu.CONSTRAINT_NAME AS name
      FROM information_schema.KEY_COLUMN_USAGE kcu
      INNER JOIN information_schema.TABLE_CONSTRAINTS tc
        ON tc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
        AND tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        AND tc.TABLE_NAME = kcu.TABLE_NAME
        AND tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
      WHERE kcu.TABLE_SCHEMA = DATABASE()
        AND kcu.TABLE_NAME = :tableName
        AND kcu.COLUMN_NAME = 'eventId'
        AND LOWER(kcu.REFERENCED_TABLE_NAME) = 'events'
      LIMIT 1
    `, { replacements: { tableName } });

    if (hasCorrect && hasCorrect.length > 0) {
      console.log(`✅ event_violations.eventId 已有指向 events 的外鍵（${hasCorrect[0].name}），略過新增`);
      return;
    }

    await queryInterface.addConstraint(tableName, {
      fields: ['eventId'],
      type: 'foreign key',
      name: TARGET_FK_NAME,
      references: { table: 'events', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
    console.log(`✅ 已新增外鍵 ${TARGET_FK_NAME} → events(id)`);
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== 'mysql') return;

    try {
      await queryInterface.removeConstraint('event_violations', TARGET_FK_NAME);
    } catch (e) {
      if (!String(e.message || '').includes('check that it exists')) throw e;
    }

    await queryInterface.addConstraint('event_violations', {
      fields: ['eventId'],
      type: 'foreign key',
      name: 'event_violations_eventId_event_fk',
      references: { table: 'event', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  }
};
