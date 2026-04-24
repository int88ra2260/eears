// 清理未使用欄位的腳本
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

// 定義系統中實際使用的欄位
const USED_COLUMNS = {
  'users': [
    'id', 'studentId', 'name', 'email', 'phone', 'department', 'isBlacklisted', 
    'blacklistUntil', 'createdAt', 'updatedAt'
  ],
  'events': [
    'id', 'name', 'description', 'date', 'startTime', 'endTime', 'location', 
    'maxParticipants', 'currentParticipants', 'eventType', 'createdAt', 'updatedAt'
  ],
  'reservations': [
    'id', 'eventId', 'userId', 'studentId', 'studentName', 'studentEmail', 
    'phone', 'department', 'timestamp', 'checkinStatus', 'checkinTime', 'group', 
    'createdAt', 'updatedAt'
  ],
  'classes': [
    'id', 'name', 'semester', 'department', 'teacherName', 'createdAt', 'updatedAt'
  ],
  'class_memberships': [
    'id', 'semester', 'classId', 'studentId', 'studentName', 'department', 
    'email', 'grade', 'createdAt', 'updatedAt'
  ],
  'teachers': [
    'id', 'name', 'email', 'username', 'password', 'isActive', 'department', 
    'phone', 'createdAt', 'updatedAt'
  ],
  'class_teachers': [
    'id', 'classId', 'teacherId', 'semester', 'isActive', 'createdAt', 'updatedAt'
  ],
  'settings': [
    'id', 'key', 'value', 'createdAt', 'updatedAt'
  ],
  'blacklist_records': [
    'id', 'userId', 'reason', 'recordedAt', 'createdAt', 'updatedAt'
  ],
  'survey_responses': [
    'id', 'studentId', 'studentName', 'studentEmail', 'surveyId', 'responses', 
    'timestamp', 'createdAt', 'updatedAt'
  ],
  'english_table_survey_responses': [
    'id', 'studentId', 'name', 'email', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 
    'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 
    'q17', 'q18', 'createdAt', 'updatedAt'
  ],
  'event_violations': [
    'id', 'eventId', 'userId', 'violationType', 'description', 'recordedBy', 
    'recordedAt', 'createdAt', 'updatedAt'
  ]
};

async function analyzeUnusedColumns() {
  try {
    console.log('🔍 分析未使用的欄位...\n');
    
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n📋 表格: ${tableName}`);
      
      // 獲取表格結構
      const columns = await sequelize.query(`DESCRIBE \`${tableName}\``, { 
        type: Sequelize.QueryTypes.SELECT 
      });
      
      const usedColumns = USED_COLUMNS[tableName] || [];
      const unusedColumns = columns
        .map(col => col.Field)
        .filter(col => !usedColumns.includes(col) && col !== 'id' && !col.includes('At'));
      
      if (unusedColumns.length > 0) {
        console.log(`  ⚠️  未使用的欄位: ${unusedColumns.join(', ')}`);
      } else {
        console.log(`  ✅ 所有欄位都在使用中`);
      }
    }
    
  } catch (error) {
    console.error('❌ 分析失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

async function cleanupUnusedColumns() {
  try {
    console.log('🧹 開始清理未使用的欄位...\n');
    
    const tables = await sequelize.query("SHOW TABLES", { type: Sequelize.QueryTypes.SELECT });
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n📋 處理表格: ${tableName}`);
      
      const columns = await sequelize.query(`DESCRIBE \`${tableName}\``, { 
        type: Sequelize.QueryTypes.SELECT 
      });
      
      const usedColumns = USED_COLUMNS[tableName] || [];
      const unusedColumns = columns
        .map(col => col.Field)
        .filter(col => !usedColumns.includes(col) && col !== 'id' && !col.includes('At'));
      
      if (unusedColumns.length > 0) {
        console.log(`  ⚠️  發現未使用欄位: ${unusedColumns.join(', ')}`);
        
        for (const columnName of unusedColumns) {
          try {
            console.log(`    🗑️  刪除欄位: ${columnName}`);
            await sequelize.query(`ALTER TABLE \`${tableName}\` DROP COLUMN \`${columnName}\``);
            console.log(`    ✅ 成功刪除欄位: ${columnName}`);
          } catch (error) {
            console.log(`    ❌ 刪除欄位失敗: ${columnName} - ${error.message}`);
          }
        }
      } else {
        console.log(`  ✅ 沒有未使用的欄位`);
      }
    }
    
    console.log('\n🎉 欄位清理完成！');
    
  } catch (error) {
    console.error('❌ 清理失敗:', error.message);
  } finally {
    await sequelize.close();
  }
}

// 根據命令行參數決定執行模式
const args = process.argv.slice(2);
if (args.includes('--preview')) {
  analyzeUnusedColumns();
} else {
  console.log('💡 使用 --preview 參數來預覽會刪除的欄位');
  console.log('💡 直接執行會實際刪除未使用的欄位\n');
  cleanupUnusedColumns();
}
