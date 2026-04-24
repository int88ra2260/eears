// scripts/syncSurveySettings.js
// 同步問卷設定：根據 surveys.json 更新資料庫中的問卷設定
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { SurveySettings } = require('../models');
const { sequelize } = require('../models');

async function syncSurveySettings() {
  try {
    await sequelize.authenticate();
    console.log('✅ 資料庫連線成功');

    // 讀取 surveys.json
    const surveysJsonPath = path.join(__dirname, '../../frontend/public/surveys.json');
    if (!fs.existsSync(surveysJsonPath)) {
      console.error('❌ 找不到 surveys.json 文件:', surveysJsonPath);
      process.exit(1);
    }

    const surveysData = JSON.parse(fs.readFileSync(surveysJsonPath, 'utf8'));
    const surveys = surveysData.surveys || [];

    console.log(`📋 找到 ${surveys.length} 個問卷設定需要同步`);

    // 定義問卷ID到活動類型的映射
    const surveyEventTypeMapping = {
      'english_table_feedback_114_1': 'English Table',
      'english_club_feedback_114_1': 'English Club'
    };

    for (const survey of surveys) {
      const surveyId = survey.id;
      const eventType = surveyEventTypeMapping[surveyId];

      if (!eventType) {
        console.log(`⚠️  跳過未定義映射的問卷: ${surveyId}`);
        continue;
      }

      console.log(`\n🔄 處理問卷: ${surveyId}`);

      // 查找是否已存在（無論 surveyId 是什麼）
      const existingSettings = await SurveySettings.findAll({
        where: {
          relatedEventTypes: {
            [require('sequelize').Op.like]: `%${eventType}%`
          }
        }
      });

      let setting = null;

      // 如果找到相關設定，更新它
      if (existingSettings.length > 0) {
        setting = existingSettings[0];
        console.log(`   📝 找到現有設定，將更新: ${setting.surveyId}`);
        
        // 更新設定
        await setting.update({
          surveyId: surveyId,
          surveyName: survey.title || `問卷 ${surveyId}`,
          description: survey.description || '',
          relatedEventTypes: [eventType],
          isEnabled: setting.isEnabled !== undefined ? setting.isEnabled : true,
          isRequired: setting.isRequired !== undefined ? setting.isRequired : true
        });
        console.log(`   ✅ 已更新設定`);
      } else {
        // 如果不存在，檢查是否已有相同 surveyId 的設定
        const existingById = await SurveySettings.findOne({
          where: { surveyId }
        });

        if (existingById) {
          console.log(`   📝 找到相同 surveyId 的設定，將更新`);
          setting = existingById;
          await setting.update({
            surveyName: survey.title || `問卷 ${surveyId}`,
            description: survey.description || '',
            relatedEventTypes: [eventType],
            isEnabled: setting.isEnabled !== undefined ? setting.isEnabled : true,
            isRequired: setting.isRequired !== undefined ? setting.isRequired : true
          });
          console.log(`   ✅ 已更新設定`);
        } else {
          // 創建新設定
          console.log(`   ➕ 創建新設定`);
          setting = await SurveySettings.create({
            surveyId: surveyId,
            surveyName: survey.title || `問卷 ${surveyId}`,
            description: survey.description || '',
            relatedEventTypes: [eventType],
            isEnabled: true,
            isRequired: true,
            notes: `自動同步自 surveys.json`
          });
          console.log(`   ✅ 已創建新設定`);
        }
      }

      console.log(`   📊 設定資訊:`);
      console.log(`      - Survey ID: ${setting.surveyId}`);
      console.log(`      - 名稱: ${setting.surveyName}`);
      console.log(`      - 啟用: ${setting.isEnabled ? '是' : '否'}`);
      console.log(`      - 必填: ${setting.isRequired ? '是' : '否'}`);
      console.log(`      - 相關活動: ${setting.relatedEventTypes ? JSON.stringify(setting.relatedEventTypes) : '無'}`);
    }

    console.log(`\n✅ 問卷設定同步完成！`);
    process.exit(0);
  } catch (error) {
    console.error('❌ 同步失敗:', error);
    process.exit(1);
  }
}

// 執行同步
syncSurveySettings();

