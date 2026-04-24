// 清理重複索引腳本
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: console.log
  }
);

async function cleanupDuplicateIndexes() {
  try {
    console.log('🧹 開始清理重複索引...\n');
    
    // 獲取所有表格
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n📋 處理表格: ${tableName}`);
      
      // 獲取表格的索引信息
      const indexes = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``, { 
        type: Sequelize.QueryTypes.SELECT 
      });
      
      // 按索引名稱分組
      const indexGroups = {};
      indexes.forEach(index => {
        if (!indexGroups[index.Key_name]) {
          indexGroups[index.Key_name] = [];
        }
        indexGroups[index.Key_name].push(index);
      });
      
      // 找出重複的索引（studentId_*, surveyId_* 等）
      const duplicateIndexes = Object.keys(indexGroups).filter(name => 
        name !== 'PRIMARY' && 
        (name.match(/studentId_\d+/) || name.match(/surveyId_\d+/) || name.match(/classId_\d+/))
      );
      
      if (duplicateIndexes.length > 0) {
        console.log(`  ⚠️  發現重複索引: ${duplicateIndexes.join(', ')}`);
        
        for (const indexName of duplicateIndexes) {
          try {
            console.log(`    🗑️  刪除索引: ${indexName}`);
            await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
            console.log(`    ✅ 成功刪除索引: ${indexName}`);
          } catch (error) {
            console.log(`    ❌ 刪除索引失敗: ${indexName} - ${error.message}`);
          }
        }
      } else {
        console.log(`  ✅ 沒有發現重複索引`);
      }
    }
    
    console.log('\n🎉 索引清理完成！');
    
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

// 安全模式：只顯示會刪除的索引，不實際執行
async function previewCleanup() {
  try {
    console.log('🔍 預覽模式：檢查會刪除的索引...\n');
    
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n📋 表格: ${tableName}`);
      
      const indexes = await sequelize.query(`SHOW INDEX FROM \`${tableName}\``, { 
        type: Sequelize.QueryTypes.SELECT 
      });
      
      const indexGroups = {};
      indexes.forEach(index => {
        if (!indexGroups[index.Key_name]) {
          indexGroups[index.Key_name] = [];
        }
        indexGroups[index.Key_name].push(index);
      });
      
      const duplicateIndexes = Object.keys(indexGroups).filter(name => 
        name !== 'PRIMARY' && 
        (name.match(/studentId_\d+/) || name.match(/surveyId_\d+/) || name.match(/classId_\d+/))
      );
      
      if (duplicateIndexes.length > 0) {
        console.log(`  ⚠️  會刪除的索引: ${duplicateIndexes.join(', ')}`);
      } else {
        console.log(`  ✅ 沒有重複索引`);
      }
    }
    
  } catch (error) {
    console.error('❌ 預覽失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

// 根據命令行參數決定執行模式
const args = process.argv.slice(2);
if (args.includes('--preview')) {
  previewCleanup();
} else {
  console.log('💡 使用 --preview 參數來預覽會刪除的索引');
  console.log('💡 直接執行會實際刪除重複索引\n');
  cleanupDuplicateIndexes();
}
