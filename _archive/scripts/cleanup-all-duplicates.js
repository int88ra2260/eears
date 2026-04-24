// 全面清理重複索引和約束
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

async function cleanupAllDuplicates() {
  try {
    console.log('🧹 開始全面清理重複索引和約束...\n');
    
    // 1. 清理重複索引
    console.log('📋 步驟 1: 清理重複索引');
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n  處理表格: ${tableName}`);
      
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
      
      // 找出重複的索引
      const duplicateIndexes = Object.keys(indexGroups).filter(name => 
        name !== 'PRIMARY' && 
        (name.match(/studentId_\d+/) || name.match(/surveyId_\d+/) || 
         name.match(/classId_\d+/) || name.match(/eventId_\d+/) ||
         name.match(/userId_\d+/) || name.match(/teacherId_\d+/))
      );
      
      if (duplicateIndexes.length > 0) {
        console.log(`    ⚠️  發現重複索引: ${duplicateIndexes.join(', ')}`);
        
        for (const indexName of duplicateIndexes) {
          try {
            console.log(`      🗑️  刪除索引: ${indexName}`);
            await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${indexName}\``);
            console.log(`      ✅ 成功刪除索引: ${indexName}`);
          } catch (error) {
            console.log(`      ❌ 刪除索引失敗: ${indexName} - ${error.message}`);
          }
        }
      } else {
        console.log(`    ✅ 沒有重複索引`);
      }
    }
    
    // 2. 清理重複約束
    console.log('\n📋 步驟 2: 清理重複約束');
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n  處理表格: ${tableName}`);
      
      try {
        // 獲取約束信息
        const constraints = await sequelize.query(`
          SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE 
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
          WHERE TABLE_SCHEMA = 'activity_reservation' 
          AND TABLE_NAME = '${tableName}'
          AND CONSTRAINT_TYPE = 'UNIQUE'
        `, { type: Sequelize.QueryTypes.SELECT });
        
        if (constraints.length > 0) {
          console.log(`    發現約束: ${constraints.map(c => c.CONSTRAINT_NAME).join(', ')}`);
          
          // 檢查是否有重複的約束名稱
          const duplicateConstraints = constraints.filter(c => 
            c.CONSTRAINT_NAME.match(/unique_event_student_\d+/) ||
            c.CONSTRAINT_NAME.match(/unique_event_email_\d+/) ||
            c.CONSTRAINT_NAME.match(/class_teachers_class_id_teacher_id_semester_\d+/)
          );
          
          if (duplicateConstraints.length > 0) {
            console.log(`    ⚠️  發現重複約束: ${duplicateConstraints.map(c => c.CONSTRAINT_NAME).join(', ')}`);
            
            for (const constraint of duplicateConstraints) {
              try {
                console.log(`      🗑️  刪除約束: ${constraint.CONSTRAINT_NAME}`);
                await sequelize.query(`ALTER TABLE \`${tableName}\` DROP INDEX \`${constraint.CONSTRAINT_NAME}\``);
                console.log(`      ✅ 成功刪除約束: ${constraint.CONSTRAINT_NAME}`);
              } catch (error) {
                console.log(`      ❌ 刪除約束失敗: ${constraint.CONSTRAINT_NAME} - ${error.message}`);
              }
            }
          }
        }
      } catch (error) {
        console.log(`    ❌ 處理約束失敗: ${error.message}`);
      }
    }
    
    console.log('\n🎉 全面清理完成！');
    
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

cleanupAllDuplicates();
