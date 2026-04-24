// scripts/addRejectionReasonsFields.js
// 添加拒絕原因欄位到 english_test_registrations 表

const { sequelize } = require('../models');

async function addRejectionReasonsFields() {
  try {
    console.log('開始添加拒絕原因欄位...');

    // 添加 rejectionReasons 欄位（JSON 類型）
    await sequelize.query(`
      ALTER TABLE english_test_registrations
      ADD COLUMN rejectionReasons JSON NULL
      COMMENT '拒絕原因（陣列，可複選）'
      AFTER notes
    `);
    console.log('✅ 已添加 rejectionReasons 欄位');

    // 添加 rejectionOther 欄位（TEXT 類型）
    await sequelize.query(`
      ALTER TABLE english_test_registrations
      ADD COLUMN rejectionOther TEXT NULL
      COMMENT '拒絕原因「其他」的文字說明'
      AFTER rejectionReasons
    `);
    console.log('✅ 已添加 rejectionOther 欄位');

    console.log('✅ 所有欄位添加完成！');
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加欄位時發生錯誤:', error);
    
    // 如果是欄位已存在的錯誤，視為成功
    if (error.message && error.message.includes('Duplicate column name')) {
      console.log('⚠️  欄位可能已存在，跳過');
      process.exit(0);
    }
    
    process.exit(1);
  }
}

// 執行遷移
addRejectionReasonsFields();
