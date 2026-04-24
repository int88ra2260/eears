// migrations/add-indexes-to-english-test-registrations.js
// 為 english_test_registrations 表添加索引和唯一約束

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('開始為 english_test_registrations 添加索引和約束...');

      // 1. 檢查並添加唯一約束（如果不存在）
      try {
        await queryInterface.addConstraint('english_test_registrations', {
          fields: ['studentId'],
          type: 'unique',
          name: 'uk_student_id',
          transaction
        });
        console.log('✅ 唯一約束 uk_student_id 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  唯一約束 uk_student_id 已存在，跳過');
        } else {
          throw error;
        }
      }

      // 2. 複合索引：status + approvedSequence（已通過排序）
      try {
        await queryInterface.addIndex('english_test_registrations', {
          fields: ['status', 'approvedSequence'],
          name: 'idx_status_approved_sequence',
          transaction
        });
        console.log('✅ 索引 idx_status_approved_sequence 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  索引 idx_status_approved_sequence 已存在，跳過');
        } else {
          throw error;
        }
      }

      // 3. 時間索引：createdAt（預設排序）
      try {
        await queryInterface.addIndex('english_test_registrations', {
          fields: ['createdAt'],
          name: 'idx_created_at',
          transaction
        });
        console.log('✅ 索引 idx_created_at 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  索引 idx_created_at 已存在，跳過');
        } else {
          throw error;
        }
      }

      // 4. 查詢索引：studentId（雖然有唯一約束，但明確添加索引有助於查詢優化）
      try {
        await queryInterface.addIndex('english_test_registrations', {
          fields: ['studentId'],
          name: 'idx_student_id',
          unique: false, // 唯一約束已經存在，這裡只添加普通索引
          transaction
        });
        console.log('✅ 索引 idx_student_id 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  索引 idx_student_id 已存在，跳過');
        } else {
          throw error;
        }
      }

      // 5. 查詢索引：idNumber
      try {
        await queryInterface.addIndex('english_test_registrations', {
          fields: ['idNumber'],
          name: 'idx_id_number',
          transaction
        });
        console.log('✅ 索引 idx_id_number 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  索引 idx_id_number 已存在，跳過');
        } else {
          throw error;
        }
      }

      // 6. 狀態索引：status（統計查詢優化）
      try {
        await queryInterface.addIndex('english_test_registrations', {
          fields: ['status'],
          name: 'idx_status',
          transaction
        });
        console.log('✅ 索引 idx_status 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  索引 idx_status 已存在，跳過');
        } else {
          throw error;
        }
      }

      // 7. 測驗類型索引：examType（統計查詢優化）
      try {
        await queryInterface.addIndex('english_test_registrations', {
          fields: ['examType'],
          name: 'idx_exam_type',
          transaction
        });
        console.log('✅ 索引 idx_exam_type 已添加');
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
          console.log('⚠️  索引 idx_exam_type 已存在，跳過');
        } else {
          throw error;
        }
      }

      await transaction.commit();
      console.log('✅ 所有索引和約束添加完成！');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 添加索引和約束失敗:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('開始移除 english_test_registrations 的索引和約束...');

      // 移除索引（順序與添加相反）
      const indexes = [
        'idx_exam_type',
        'idx_status',
        'idx_id_number',
        'idx_student_id',
        'idx_created_at',
        'idx_status_approved_sequence'
      ];

      for (const indexName of indexes) {
        try {
          await queryInterface.removeIndex('english_test_registrations', indexName, { transaction });
          console.log(`✅ 索引 ${indexName} 已移除`);
        } catch (error) {
          console.warn(`⚠️  索引 ${indexName} 不存在或移除失敗:`, error.message);
        }
      }

      // 移除唯一約束
      try {
        await queryInterface.removeConstraint('english_test_registrations', 'uk_student_id', { transaction });
        console.log('✅ 唯一約束 uk_student_id 已移除');
      } catch (error) {
        console.warn('⚠️  唯一約束 uk_student_id 不存在或移除失敗:', error.message);
      }

      await transaction.commit();
      console.log('✅ 所有索引和約束移除完成！');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ 移除索引和約束失敗:', error);
      throw error;
    }
  }
};
