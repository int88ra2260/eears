// 再次確保 event_violations.eventId 外鍵指向 events（而非 event）
//
// 背景：專案中另有一檔 fix-event-violations-fk-to-events.js，但 Sequelize 依「檔名字典序」執行，
// 該檔可能早已寫入 SequelizeMeta，實際 DB 卻仍為舊外鍵（例如還原備份、手動改表、或早期 migration 未套用）。
// 此檔使用較晚的時間戳前綴，保證尚未執行過的環境會再跑一次；up() 為冪等。

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
        console.log(`✅ [ensure-fk-events] 已移除錯誤外鍵 ${row.name}（曾參考 ${row.refTable}）`);
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
      console.log(
        `✅ [ensure-fk-events] event_violations.eventId 已有指向 events 的外鍵（${hasCorrect[0].name}），略過新增`
      );
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
    console.log(`✅ [ensure-fk-events] 已新增外鍵 ${TARGET_FK_NAME} → events(id)`);
  },

  async down() {
    // 與資料正確性綁定，不提供自動回滾；若需還原請手動調整外鍵。
  }
};
