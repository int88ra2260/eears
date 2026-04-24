// scripts/addEnglishTestFields.js
// 新增培力英檢報名表缺少的欄位
const { sequelize } = require('../models');

async function addMissingFields() {
  try {
    console.log('開始新增缺少的資料庫欄位...');
    
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功');

    // 檢查並新增 examType 欄位
    try {
      await sequelize.query(`
        ALTER TABLE english_test_registrations 
        ADD COLUMN examType VARCHAR(10) NULL 
        COMMENT '報考項目：LRSW(聽說讀寫), LS(聽說), RW(讀寫), NON(不報考)'
        AFTER birthDate
      `);
      console.log('✅ 已新增 examType 欄位');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ examType 欄位已存在，跳過');
      } else {
        throw error;
      }
    }

    // 檢查並新增 examAssistanceOther 欄位
    try {
      await sequelize.query(`
        ALTER TABLE english_test_registrations 
        ADD COLUMN examAssistanceOther TEXT NULL 
        COMMENT '考試協助項目「其他」的文字說明'
        AFTER examAssistanceOptions
      `);
      console.log('✅ 已新增 examAssistanceOther 欄位');
    } catch (error) {
      if (error.message.includes('Duplicate column name')) {
        console.log('⚠️ examAssistanceOther 欄位已存在，跳過');
      } else {
        throw error;
      }
    }

    // 修改 hasTakenBESTEP 欄位為可選（如果還沒修改）
    try {
      await sequelize.query(`
        ALTER TABLE english_test_registrations 
        MODIFY COLUMN hasTakenBESTEP VARCHAR(10) NULL DEFAULT '否'
      `);
      console.log('✅ 已修改 hasTakenBESTEP 欄位為可選');
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ hasTakenBESTEP 欄位不存在，跳過');
      } else {
        console.log('⚠️ 修改 hasTakenBESTEP 欄位時發生錯誤（可能已修改）:', error.message);
      }
    }

    // 新增 Q3 各項成績欄位
    const scoreFields = [
      { name: 'listeningExamType', type: 'VARCHAR(100)', comment: '聽力測驗類別' },
      { name: 'listeningScore', type: 'VARCHAR(50)', comment: '聽力成績' },
      { name: 'readingExamType', type: 'VARCHAR(100)', comment: '閱讀測驗類別' },
      { name: 'readingScore', type: 'VARCHAR(50)', comment: '閱讀成績' },
      { name: 'speakingExamType', type: 'VARCHAR(100)', comment: '口說測驗類別' },
      { name: 'speakingScore', type: 'VARCHAR(50)', comment: '口說成績' },
      { name: 'writingExamType', type: 'VARCHAR(100)', comment: '寫作測驗類別' },
      { name: 'writingScore', type: 'VARCHAR(50)', comment: '寫作成績' }
    ];

    for (const field of scoreFields) {
      try {
        await sequelize.query(`
          ALTER TABLE english_test_registrations 
          ADD COLUMN ${field.name} ${field.type} NULL 
          COMMENT '${field.comment}'
          AFTER b2SkillType
        `);
        console.log(`✅ 已新增 ${field.name} 欄位`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`⚠️ ${field.name} 欄位已存在，跳過`);
        } else {
          throw error;
        }
      }
    }

    // 修改 idPhoto 欄位為可選（因為「不報考」時不需要證件照）
    try {
      await sequelize.query(`
        ALTER TABLE english_test_registrations 
        MODIFY COLUMN idPhoto VARCHAR(255) NULL 
        COMMENT '證件照檔案路徑（不報考時可為空）'
      `);
      console.log('✅ 已修改 idPhoto 欄位為可選');
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ idPhoto 欄位不存在，跳過');
      } else {
        console.log('⚠️ 修改 idPhoto 欄位時發生錯誤（可能已修改）:', error.message);
      }
    }

    // 修改 birthDate 欄位為可選（因為「不報考」時不需要完整資料）
    try {
      await sequelize.query(`
        ALTER TABLE english_test_registrations 
        MODIFY COLUMN birthDate DATE NULL 
        COMMENT '出生年月日（不報考時可為空）'
      `);
      console.log('✅ 已修改 birthDate 欄位為可選');
    } catch (error) {
      if (error.message.includes("doesn't exist")) {
        console.log('⚠️ birthDate 欄位不存在，跳過');
      } else {
        console.log('⚠️ 修改 birthDate 欄位時發生錯誤（可能已修改）:', error.message);
      }
    }

    console.log('\n✅ 所有欄位新增/修改完成！');
    
  } catch (error) {
    console.error('❌ 新增欄位時發生錯誤:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// 執行
addMissingFields();
