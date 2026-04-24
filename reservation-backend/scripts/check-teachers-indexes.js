// scripts/check-teachers-indexes.js
// 檢查 teachers 表的索引數量

require('dotenv').config();
const { sequelize } = require('../models');

async function checkTeachersIndexes() {
  try {
    console.log('🔍 檢查 teachers 表的索引...\n');

    const [results] = await sequelize.query('SHOW INDEXES FROM teachers');
    
    console.log(`索引總數: ${results.length}`);
    console.log('\n索引列表:');
    
    const indexMap = new Map();
    results.forEach(r => {
      const keyName = r.Key_name;
      if (!indexMap.has(keyName)) {
        indexMap.set(keyName, []);
      }
      indexMap.get(keyName).push(r.Column_name);
    });

    indexMap.forEach((columns, keyName) => {
      const isUnique = results.find(r => r.Key_name === keyName && r.Non_unique === 0);
      console.log(`  - ${keyName} (${columns.join(', ')}) ${isUnique ? '[UNIQUE]' : ''}`);
    });

    if (results.length >= 64) {
      console.log('\n⚠️  警告：索引數量已達到或接近 MySQL 限制（64個）');
      console.log('   建議清理不必要的索引');
    } else {
      console.log(`\n✅ 索引數量正常（${results.length}/64）`);
    }

    console.log('\n✅ 檢查完成！');
  } catch (error) {
    console.error('❌ 檢查過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

checkTeachersIndexes();

