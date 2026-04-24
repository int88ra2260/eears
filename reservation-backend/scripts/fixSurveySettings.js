// scripts/fixSurveySettings.js
// 修復問卷設定：將 survey_1 和 survey_2 更新為正確的問卷ID
require('dotenv').config();
const { SurveySettings } = require('../models');
const { sequelize } = require('../models');

async function fixSurveySettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功\n');

    // 查找現有的問卷設定
    const allSettings = await SurveySettings.findAll();
    console.log(`📋 找到 ${allSettings.length} 個問卷設定\n`);

    // 定義修復映射
    const fixMappings = [
      {
        oldId: 'survey_1',
        newId: 'english_table_feedback_114_1',
        surveyName: 'English Table 問卷 (114-1)',
        description: '收集學生於 English Table 活動中的學習與口語表現經驗',
        relatedEventTypes: ['English Table']
      },
      {
        oldId: 'survey_2',
        newId: 'english_club_feedback_114_1',
        surveyName: 'English Club 問卷 (114-1)',
        description: '收集學生對 English Club 活動的滿意度與英語學習成效之回饋',
        relatedEventTypes: ['English Club']
      }
    ];

    for (const mapping of fixMappings) {
      console.log(`🔄 處理問卷: ${mapping.oldId} -> ${mapping.newId}`);
      
      // 查找舊ID的設定
      let setting = await SurveySettings.findOne({
        where: { surveyId: mapping.oldId }
      });

      if (setting) {
        console.log(`   📝 找到設定: ${mapping.oldId}`);
        
        // 檢查是否已存在新ID的設定
        const existingNew = await SurveySettings.findOne({
          where: { surveyId: mapping.newId }
        });

        if (existingNew) {
          console.log(`   ⚠️  新ID ${mapping.newId} 已存在，將更新現有設定`);
          // 更新現有設定
          await existingNew.update({
            surveyName: mapping.surveyName,
            description: mapping.description,
            relatedEventTypes: mapping.relatedEventTypes,
            isEnabled: setting.isEnabled, // 保留原啟用狀態
            isRequired: setting.isRequired // 保留原必填狀態
          });
          // 刪除舊設定
          await setting.destroy();
          console.log(`   ✅ 已更新並刪除舊設定`);
        } else {
          // 更新舊設定的ID和其他資訊
          await setting.update({
            surveyId: mapping.newId,
            surveyName: mapping.surveyName,
            description: mapping.description,
            relatedEventTypes: mapping.relatedEventTypes
          });
          console.log(`   ✅ 已更新問卷ID和資訊`);
        }
      } else {
        // 如果舊ID不存在，檢查新ID是否存在
        const existingNew = await SurveySettings.findOne({
          where: { surveyId: mapping.newId }
        });

        if (existingNew) {
          console.log(`   ✅ 新ID ${mapping.newId} 已存在，無需修復`);
        } else {
          console.log(`   ⚠️  未找到 ${mapping.oldId}，將創建新設定`);
          // 創建新設定
          await SurveySettings.create({
            surveyId: mapping.newId,
            surveyName: mapping.surveyName,
            description: mapping.description,
            relatedEventTypes: mapping.relatedEventTypes,
            isEnabled: true,
            isRequired: true,
            notes: '自動修復創建'
          });
          console.log(`   ✅ 已創建新設定`);
        }
      }

      // 顯示最終狀態
      const finalSetting = await SurveySettings.findOne({
        where: { surveyId: mapping.newId }
      });

      if (finalSetting) {
        console.log(`   📊 最終設定狀態:`);
        console.log(`      - Survey ID: ${finalSetting.surveyId}`);
        console.log(`      - 名稱: ${finalSetting.surveyName}`);
        console.log(`      - 啟用: ${finalSetting.isEnabled ? '是' : '否'}`);
        console.log(`      - 必填: ${finalSetting.isRequired ? '是' : '否'}`);
        console.log(`      - 相關活動: ${JSON.stringify(finalSetting.relatedEventTypes)}`);
      }
      console.log('');
    }

    console.log('✅ 問卷設定修復完成！');
    console.log('\n📝 請檢查後台管理 → 問卷設定頁面確認結果');
    process.exit(0);
  } catch (error) {
    console.error('❌ 修復失敗:', error);
    console.error('錯誤堆疊:', error.stack);
    process.exit(1);
  }
}

// 執行修復
fixSurveySettings();

