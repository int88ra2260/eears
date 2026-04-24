// migrations/add-database-indexes.js
const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const handleIndexError = (error) => {
      const msg = String(error?.message || '');
      if (!msg.includes('Duplicate key name') && !msg.includes('already exists')) {
        throw error;
      }
    };

    // 為 Users 表添加索引
    try {
      await queryInterface.addIndex('Users', ['studentId'], {
        name: 'idx_users_student_id',
        unique: true
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Users', ['email'], {
        name: 'idx_users_email'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Users', ['isBlacklisted', 'blacklistUntil'], {
        name: 'idx_users_blacklist'
      });
    } catch (error) {
      handleIndexError(error);
    }

    // 為 Events 表添加索引
    try {
      await queryInterface.addIndex('Events', ['date'], {
        name: 'idx_events_date'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Events', ['eventType'], {
        name: 'idx_events_type'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Events', ['date', 'startTime'], {
        name: 'idx_events_datetime'
      });
    } catch (error) {
      handleIndexError(error);
    }

    // 為 Reservations 表添加索引
    try {
      await queryInterface.addIndex('Reservations', ['eventId'], {
        name: 'idx_reservations_event_id'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Reservations', ['studentId'], {
        name: 'idx_reservations_student_id'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Reservations', ['studentEmail'], {
        name: 'idx_reservations_student_email'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Reservations', ['userId'], {
        name: 'idx_reservations_user_id'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Reservations', ['timestamp'], {
        name: 'idx_reservations_timestamp'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    // 複合索引 - 用於重複檢查
    // 先清理重複資料，只保留最早的記錄
    try {
      // 清理 eventId + studentId 的重複記錄
      await queryInterface.sequelize.query(`
        DELETE r1 FROM Reservations r1
        INNER JOIN Reservations r2 
        WHERE r1.id > r2.id 
        AND r1.eventId = r2.eventId 
        AND r1.studentId = r2.studentId
        AND r1.studentId IS NOT NULL
        AND r2.studentId IS NOT NULL
      `);
      
      // 清理 eventId + studentEmail 的重複記錄
      await queryInterface.sequelize.query(`
        DELETE r1 FROM Reservations r1
        INNER JOIN Reservations r2 
        WHERE r1.id > r2.id 
        AND r1.eventId = r2.eventId 
        AND r1.studentEmail = r2.studentEmail
        AND r1.studentEmail IS NOT NULL
        AND r2.studentEmail IS NOT NULL
      `);
    } catch (error) {
      console.warn('清理重複資料時發生錯誤（可能沒有重複資料）:', error.message);
    }
    
    try {
      await queryInterface.addIndex('Reservations', ['eventId', 'studentId'], {
        name: 'idx_reservations_event_student',
        unique: true
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('Reservations', ['eventId', 'studentEmail'], {
        name: 'idx_reservations_event_email',
        unique: true
      });
    } catch (error) {
      handleIndexError(error);
    }

    // 為 BlackListRecord 表添加索引
    try {
      await queryInterface.addIndex('blacklist_records', ['userId'], {
        name: 'idx_blacklist_user_id'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('blacklist_records', ['recordedAt'], {
        name: 'idx_blacklist_recorded_at'
      });
    } catch (error) {
      handleIndexError(error);
    }

    // 為 SurveyResponse 表添加索引
    try {
      await queryInterface.addIndex('SurveyResponses', ['studentId'], {
        name: 'idx_survey_student_id'
      });
    } catch (error) {
      handleIndexError(error);
    }
    
    try {
      await queryInterface.addIndex('SurveyResponses', ['timestamp'], {
        name: 'idx_survey_timestamp'
      });
    } catch (error) {
      handleIndexError(error);
    }

    // 為 Settings 表添加索引
    try {
      await queryInterface.addIndex('settings', ['key'], {
        name: 'idx_settings_key',
        unique: true
      });
    } catch (error) {
      handleIndexError(error);
    }
  },

  down: async (queryInterface, Sequelize) => {
    // 移除所有索引
    const indexes = [
      'idx_users_student_id',
      'idx_users_email', 
      'idx_users_blacklist',
      'idx_events_date',
      'idx_events_type',
      'idx_events_datetime',
      'idx_reservations_event_id',
      'idx_reservations_student_id',
      'idx_reservations_student_email',
      'idx_reservations_user_id',
      'idx_reservations_timestamp',
      'idx_reservations_event_student',
      'idx_reservations_event_email',
      'idx_blacklist_user_id',
      'idx_blacklist_recorded_at',
      'idx_survey_student_id',
      'idx_survey_timestamp',
      'idx_settings_key'
    ];

    for (const indexName of indexes) {
      try {
        await queryInterface.removeIndex('Users', indexName);
      } catch (e) {
        // 忽略不存在的索引錯誤
      }
      
      try {
        await queryInterface.removeIndex('Events', indexName);
      } catch (e) {
        // 忽略不存在的索引錯誤
      }
      
      try {
        await queryInterface.removeIndex('Reservations', indexName);
      } catch (e) {
        // 忽略不存在的索引錯誤
      }
      
      try {
        await queryInterface.removeIndex('blacklist_records', indexName);
      } catch (e) {
        // 忽略不存在的索引錯誤
      }
      
      try {
        await queryInterface.removeIndex('SurveyResponses', indexName);
      } catch (e) {
        // 忽略不存在的索引錯誤
      }
      
      try {
        await queryInterface.removeIndex('settings', indexName);
      } catch (e) {
        // 忽略不存在的索引錯誤
      }
    }
  }
};
