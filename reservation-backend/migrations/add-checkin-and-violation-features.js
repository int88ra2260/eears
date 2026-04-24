// migrations/add-checkin-and-violation-features.js
// 新增簽到功能和違規管理功能的資料庫遷移

const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. 為 reservations 表新增簽到相關欄位
    const reservationsTableDescription = await queryInterface.describeTable('Reservations');
    
    if (!reservationsTableDescription.checkinStatus) {
      await queryInterface.addColumn('Reservations', 'checkinStatus', {
        type: DataTypes.ENUM('未簽到', '已簽到'),
        defaultValue: '未簽到',
        allowNull: false
      });
    }

    if (!reservationsTableDescription.checkinTime) {
      await queryInterface.addColumn('Reservations', 'checkinTime', {
        type: DataTypes.DATE,
        allowNull: true,
        comment: '簽到時間'
      });
    }

    if (!reservationsTableDescription.group) {
      await queryInterface.addColumn('Reservations', 'group', {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '學生分組'
      });
    }

    // 2. 創建 event_violations 表（如果不存在）
    const tables = await queryInterface.showAllTables();
    const tableName = 'event_violations';
    
    if (!tables.includes(tableName)) {
      await queryInterface.createTable(tableName, {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '活動ID',
        references: {
          model: 'Events',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '使用者ID',
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      violationType: {
        type: DataTypes.ENUM('擾亂秩序', '未遵守規定', '預約未到', '其他'),
        allowNull: false,
        comment: '違規類型'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '違規描述'
      },
      recordedBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '記錄者（管理員或工讀生）'
      },
      recordedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: '記錄時間'
      }
      });
    } else {
      console.log(`表 ${tableName} 已存在，跳過創建`);
    }

    // 3. 為 event_violations 表新增索引（如果不存在）
    try {
      await queryInterface.addIndex(tableName, ['eventId'], {
        name: 'event_violations_eventId_index'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex(tableName, ['userId'], {
        name: 'event_violations_userId_index'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        throw error;
      }
    }
    
    try {
      await queryInterface.addIndex(tableName, ['recordedAt'], {
        name: 'event_violations_recordedAt_index'
      });
    } catch (error) {
      if (!error.message.includes('Duplicate key name') && !error.message.includes('already exists')) {
        throw error;
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 回滾操作
    await queryInterface.dropTable('event_violations');
    await queryInterface.removeColumn('Reservations', 'group');
    await queryInterface.removeColumn('Reservations', 'checkinTime');
    await queryInterface.removeColumn('Reservations', 'checkinStatus');
  }
};
