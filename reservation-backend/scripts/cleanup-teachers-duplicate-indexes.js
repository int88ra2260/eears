// scripts/cleanup-teachers-duplicate-indexes.js
// 清理 teachers 表中重複的索引

require('dotenv').config();
const { sequelize } = require('../models');

async function cleanupDuplicateIndexes() {
  try {
    console.log('🔍 檢查並清理 teachers 表的重複索引...\n');

    // 取得所有索引
    const [results] = await sequelize.query('SHOW INDEXES FROM teachers');
    
    // 按欄位分組索引
    const emailIndexes = [];
    const usernameIndexes = [];
    const otherIndexes = [];

    results.forEach(r => {
      if (r.Column_name === 'email' && r.Key_name !== 'PRIMARY') {
        emailIndexes.push(r.Key_name);
      } else if (r.Column_name === 'username' && r.Key_name !== 'PRIMARY') {
        usernameIndexes.push(r.Key_name);
      } else if (r.Key_name !== 'PRIMARY') {
        otherIndexes.push(r.Key_name);
      }
    });

    // 去重
    const uniqueEmailIndexes = [...new Set(emailIndexes)];
    const uniqueUsernameIndexes = [...new Set(usernameIndexes)];
    const uniqueOtherIndexes = [...new Set(otherIndexes)];

    console.log(`email 欄位的索引: ${uniqueEmailIndexes.length} 個`);
    console.log(`username 欄位的索引: ${uniqueUsernameIndexes.length} 個`);
    console.log(`其他索引: ${uniqueOtherIndexes.length} 個`);

    // 決定要保留的索引
    // 保留：teachers_email, teachers_username（如果存在）
    // 或者保留：email, username（如果 teachers_email 不存在）
    const keepEmailIndex = uniqueEmailIndexes.find(name => name === 'teachers_email') || 
                          uniqueEmailIndexes.find(name => name === 'email');
    const keepUsernameIndex = uniqueUsernameIndexes.find(name => name === 'teachers_username') || 
                              uniqueUsernameIndexes.find(name => name === 'username');

    console.log(`\n保留的 email 索引: ${keepEmailIndex || '無'}`);
    console.log(`保留的 username 索引: ${keepUsernameIndex || '無'}`);

    // 需要刪除的索引
    const indexesToDelete = [];
    
    uniqueEmailIndexes.forEach(name => {
      if (name !== keepEmailIndex && name !== 'idx_teachers_email') {
        indexesToDelete.push(name);
      }
    });

    uniqueUsernameIndexes.forEach(name => {
      if (name !== keepUsernameIndex && name !== 'idx_teachers_username') {
        indexesToDelete.push(name);
      }
    });

    console.log(`\n需要刪除的索引數量: ${indexesToDelete.length}`);
    
    if (indexesToDelete.length === 0) {
      console.log('✅ 沒有需要清理的索引');
      return;
    }

    console.log('\n開始刪除重複索引...');
    
    for (const indexName of indexesToDelete) {
      try {
        await sequelize.query(`DROP INDEX \`${indexName}\` ON \`teachers\``);
        console.log(`  ✅ 已刪除索引: ${indexName}`);
      } catch (error) {
        // 如果索引不存在，忽略錯誤
        if (!error.message.includes("doesn't exist") && !error.message.includes("Unknown key")) {
          console.log(`  ⚠️  刪除索引 ${indexName} 失敗: ${error.message}`);
        }
      }
    }

    // 確保有正確的索引
    console.log('\n確保有正確的索引...');
    
    // 檢查並創建 email 索引（如果不存在）
    const [emailIndexesAfter] = await sequelize.query(`
      SHOW INDEXES FROM teachers WHERE Column_name = 'email' AND Key_name != 'PRIMARY'
    `);
    
    if (emailIndexesAfter.length === 0) {
      try {
        await sequelize.query(`CREATE UNIQUE INDEX \`teachers_email\` ON \`teachers\`(\`email\`)`);
        console.log('  ✅ 已創建 email 索引');
      } catch (error) {
        console.log(`  ⚠️  創建 email 索引失敗: ${error.message}`);
      }
    }

    // 檢查並創建 username 索引（如果不存在）
    const [usernameIndexesAfter] = await sequelize.query(`
      SHOW INDEXES FROM teachers WHERE Column_name = 'username' AND Key_name != 'PRIMARY'
    `);
    
    if (usernameIndexesAfter.length === 0) {
      try {
        await sequelize.query(`CREATE UNIQUE INDEX \`teachers_username\` ON \`teachers\`(\`username\`)`);
        console.log('  ✅ 已創建 username 索引');
      } catch (error) {
        console.log(`  ⚠️  創建 username 索引失敗: ${error.message}`);
      }
    }

    // 檢查最終索引數量
    const [finalResults] = await sequelize.query('SHOW INDEXES FROM teachers');
    console.log(`\n✅ 清理完成！最終索引數量: ${finalResults.length}`);

  } catch (error) {
    console.error('❌ 清理過程中發生錯誤:', error);
  } finally {
    await sequelize.close();
  }
}

cleanupDuplicateIndexes();

