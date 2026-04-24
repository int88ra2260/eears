// scripts/addApprovedAtField.js
// 添加 approvedAt 欄位到 english_test_registrations 表

const sequelize = require('../db');

async function addApprovedAtField() {
  try {
    console.log('開始添加 approvedAt 欄位...');

    // 添加 approvedAt 欄位
    await sequelize.query(`
      ALTER TABLE english_test_registrations 
      ADD COLUMN approvedAt DATETIME NULL 
      COMMENT '被標記為「已通過」的時間'
    `).catch(err => {
      if (err.message.includes('Duplicate column name')) {
        console.log('approvedAt 欄位已存在，跳過添加');
      } else {
        throw err;
      }
    });

    // 對於現有的「已通過」資料，使用 updatedAt 作為 approvedAt 的初始值
    // 這是一個合理的近似值，因為這些資料在狀態變更時 updatedAt 會被更新
    await sequelize.query(`
      UPDATE english_test_registrations 
      SET approvedAt = updatedAt 
      WHERE status = 'approved' AND approvedAt IS NULL
    `);

    console.log('approvedAt 欄位添加完成！');
    console.log('已為現有的「已通過」資料設置初始 approvedAt 值');
    
    process.exit(0);
  } catch (error) {
    console.error('添加 approvedAt 欄位時發生錯誤:', error);
    process.exit(1);
  }
}

addApprovedAtField();
