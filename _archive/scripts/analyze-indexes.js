// 分析資料庫索引
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'activity_reservation',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'NewStrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: 'mysql',
    logging: false
  }
);

async function analyzeIndexes() {
  try {
    console.log('🔍 分析資料庫索引...\n');
    
    // 獲取所有表格
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n📋 表格: ${tableName}`);
      console.log('─'.repeat(50));
      
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
      
      // 顯示索引信息
      Object.keys(indexGroups).forEach(indexName => {
        const indexInfo = indexGroups[indexName];
        const columns = indexInfo.map(info => info.Column_name).join(', ');
        const isUnique = indexInfo[0].Non_unique === 0 ? 'UNIQUE' : 'INDEX';
        const isPrimary = indexInfo[0].Key_name === 'PRIMARY' ? ' (PRIMARY)' : '';
        
        console.log(`  ${indexName}${isPrimary}: ${columns} [${isUnique}]`);
      });
      
      // 檢查重複索引
      const duplicateIndexes = Object.keys(indexGroups).filter(name => 
        name !== 'PRIMARY' && 
        (name.includes('studentId_') || name.includes('surveyId_'))
      );
      
      if (duplicateIndexes.length > 0) {
        console.log(`  ⚠️  發現重複索引: ${duplicateIndexes.join(', ')}`);
      }
    }
    
  } catch (error) {
    console.error('❌ 分析失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

analyzeIndexes();
