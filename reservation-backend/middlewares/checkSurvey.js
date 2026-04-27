// middlewares/checkSurvey.js
const { EnglishTableSurveyResponse, EnglishClubSurveyResponse, SurveySettings, Event } = require('../models');
const { getFeatureFlag } = require('../utils/featureFlags');
const { Op } = require('sequelize');
const { resolveGateContext, hasCompletedForGate } = require('../services/surveyGateService');
const { getCurrentSemester } = require('../utils/semester');
const { logFallbackUsage } = require('../services/learningJourney/learningJourneyFallbackLogger');

/**
 * 通用問卷檢查中間件
 * 根據活動類型檢查學生是否已填寫對應的問卷
 */
async function checkSurvey(req, res, next) {
  try {
    // 檢查 Feature Flag：如果問卷 Gate 功能被關閉，直接跳過
    const surveyGateEnabled = await getFeatureFlag('SURVEY_GATE_ENABLED', true);
    if (!surveyGateEnabled) {
      return next();
    }

    const { studentId, eventId } = req.body;
    
    // 如果沒有學生ID，跳過檢查（不強制要求，因為可能不是預約流程）
    if (!studentId || studentId === undefined || studentId === null || String(studentId).trim() === '') {
      return next();
    }
    
    // 以 eventId 查詢資料庫中的活動類型，禁止使用前端傳入的 eventType
    if (!eventId) {
      return next();
    }

    const event = await Event.findByPk(eventId, { attributes: ['id', 'eventType'] });
    if (!event) {
      return res.status(404).json({
        message: '找不到活動資料',
        code: 'EVENT_NOT_FOUND'
      });
    }
    const eventType = event.eventType;

    /** 產品化：DB surveys + survey_rules（與 legacy survey_settings 擇一，不雙重強制） */
    let productCtx;
    try {
      productCtx = await resolveGateContext(eventType);
    } catch (e) {
      console.error('[checkSurvey] resolveGateContext 失敗:', e);
      return res.status(500).json({
        message: '問卷檢查失敗，請稍後再試',
        code: 'SURVEY_CHECK_FAILED',
      });
    }

    if (productCtx.mode === 'product') {
      const { survey, rule, surveyKey } = productCtx;

      if (!rule.isEnabled) {
        console.log(`[checkSurvey] 產品規則未啟用，略過 gate surveyKey=${surveyKey}`);
        return next();
      }

      const now = new Date();
      if (rule.startDate && new Date(rule.startDate) > now) {
        return next();
      }
      if (rule.endDate && new Date(rule.endDate) < now) {
        return next();
      }
      if (!rule.isRequired) {
        return next();
      }

      const trimmedStudentId = String(studentId).trim();
      if (!trimmedStudentId) {
        return next();
      }

      let completed;
      try {
        completed = await hasCompletedForGate({
          surveyId: survey.id,
          surveyKey,
          rule,
          studentId: trimmedStudentId,
          eventId,
        });
      } catch (e) {
        console.error('[checkSurvey] hasCompletedForGate 失敗:', e);
        return res.status(500).json({
          message: '問卷檢查失敗，請稍後再試',
          code: 'SURVEY_CHECK_FAILED',
        });
      }

      if (completed) {
        return next();
      }

      const surveyName = (rule.settingsJson && rule.settingsJson.surveyName) || survey.name || eventType;
      const errorCode =
        eventType === 'English Table'
          ? 'ENGLISH_TABLE_SURVEY_REQUIRED'
          : eventType === 'English Club'
            ? 'ENGLISH_CLUB_SURVEY_REQUIRED'
            : 'SURVEY_REQUIRED';

      return res.status(409).json({
        error: `請先完成${surveyName}問卷調查才能進行預約`,
        code: errorCode,
        redirectUrl: `/survey/${surveyKey}`,
        surveyId: surveyKey,
      });
    }

    // 根據活動類型動態查找相關的問卷設定（保留相容：無產品問卷資料時）
    logFallbackUsage({
      requestId: req.requestId,
      module: 'survey_gate',
      api: req.originalUrl,
      canonicalSource: 'surveys/survey_rules/survey_responses',
      fallbackSource: 'SurveySettings + legacy survey response tables',
      reason: `活動類型 ${eventType} 尚未解析到產品化 survey/rule，使用 legacy 問卷 gating`,
      severity: 'warning'
    });
    // 先獲取所有啟用的問卷設定，然後在代碼中過濾（因為 JSON 欄位查詢在不同資料庫中可能有差異）
    const allSurveySettings = await SurveySettings.findAll({
      where: {
        isEnabled: true
      }
    });
    
    console.log(`[checkSurvey] eventId: ${eventId}, 活動類型(DB): ${eventType}, 找到 ${allSurveySettings.length} 個啟用的問卷設定`);
    allSurveySettings.forEach(setting => {
      console.log(`  - Survey ID: ${setting.surveyId}, 相關活動: ${JSON.stringify(setting.relatedEventTypes)}`);
    });
    
    // 在代碼中過濾出與當前活動類型相關的問卷設定
    // 同時支援舊的 survey_1/survey_2 ID 格式
    const surveyIdMapping = {
      'survey_1': 'English Table',
      'survey_2': 'English Club',
      'english_table_feedback_114_1': 'English Table',
      'english_club_feedback_114_1': 'English Club'
    };
    
    const surveySetting = allSurveySettings.find(setting => {
      // 如果沒有相關活動類型，嘗試根據 surveyId 推斷
      if (!setting.relatedEventTypes) {
        const inferredType = surveyIdMapping[setting.surveyId];
        if (inferredType === eventType) {
          console.log(`  [checkSurvey] 設定 ${setting.surveyId} 沒有相關活動類型，但根據ID推斷為 ${inferredType}，匹配成功`);
          return true;
        }
        console.log(`  [checkSurvey] 設定 ${setting.surveyId} 沒有相關活動類型`);
        return false;
      }
      // 處理 JSON 陣列或字串
      let relatedTypes;
      try {
        relatedTypes = Array.isArray(setting.relatedEventTypes) 
          ? setting.relatedEventTypes 
          : (typeof setting.relatedEventTypes === 'string' ? JSON.parse(setting.relatedEventTypes) : []);
      } catch (e) {
        console.error(`  [checkSurvey] 解析 relatedEventTypes 失敗:`, e);
        // 解析失敗時，嘗試根據 surveyId 推斷
        const inferredType = surveyIdMapping[setting.surveyId];
        if (inferredType === eventType) {
          console.log(`  [checkSurvey] 解析失敗，但根據ID推斷為 ${inferredType}，匹配成功`);
          return true;
        }
        return false;
      }
      const matches = relatedTypes.includes(eventType);
      console.log(`  [checkSurvey] 設定 ${setting.surveyId} 的相關活動類型: ${JSON.stringify(relatedTypes)}, 匹配結果: ${matches}`);
      return matches;
    });
    
    // 如果沒有找到相關的問卷設定，跳過檢查
    if (!surveySetting) {
      console.log(`[checkSurvey] 未找到與活動類型 "${eventType}" 相關的問卷設定，跳過檢查`);
      return next();
    }
    
    console.log(`[checkSurvey] 找到匹配的問卷設定: ${surveySetting.surveyId}`);
    
    // 根據活動類型決定要使用的問卷模型和重定向URL
    let SurveyModel;
    let redirectUrl;
    
    // 將 surveyId 映射到實際的問卷ID（用於 surveys.json）
    const surveyIdToActualId = {
      'survey_1': 'english_table_feedback_114_1',
      'survey_2': 'english_club_feedback_114_1',
      'english_table_feedback_114_1': 'english_table_feedback_114_1',
      'english_club_feedback_114_1': 'english_club_feedback_114_1'
    };
    
    const actualSurveyId = surveyIdToActualId[surveySetting.surveyId] || surveySetting.surveyId;
    
    switch (eventType) {
      case 'English Table':
        SurveyModel = EnglishTableSurveyResponse;
        redirectUrl = `/survey/${actualSurveyId}`;
        break;
      case 'English Club':
        SurveyModel = EnglishClubSurveyResponse;
        redirectUrl = `/survey/${actualSurveyId}`;
        break;
      default:
        // 其他活動類型不需要問卷檢查
        return next();
    }
    
    const surveyName = surveySetting.surveyName || eventType;
    
    console.log(`[checkSurvey] 問卷ID映射: ${surveySetting.surveyId} -> ${actualSurveyId}, redirectUrl: ${redirectUrl}`);
    
    // 如果問卷設定不存在或未啟用，跳過檢查
    if (!surveySetting || !surveySetting.isEnabled) {
      return next();
    }
    
    // 檢查時間範圍
    const now = new Date();
    if (surveySetting.startDate && new Date(surveySetting.startDate) > now) {
      return next(); // 問卷尚未開始
    }
    
    if (surveySetting.endDate && new Date(surveySetting.endDate) < now) {
      return next(); // 問卷已結束
    }
    
    // 如果問卷不是必填，跳過檢查
    if (!surveySetting.isRequired) {
      return next();
    }
    
    // 檢查學生是否已填寫對應問卷
    // 確保 studentId 為有效字串
    const trimmedStudentId = String(studentId).trim();
    if (!trimmedStudentId) {
      return next(); // 如果 studentId 為空，跳過檢查
    }
    
    const semester = getCurrentSemester();
    const surveyResponse = await SurveyModel.findOne({
      where: { studentId: trimmedStudentId, semester },
    });
    
    console.log(`[checkSurvey] 學生 ${trimmedStudentId} 問卷填寫狀態: ${surveyResponse ? '已填寫' : '未填寫'}`);
    
    // 如果已填寫問卷，直接通過
    if (surveyResponse) {
      console.log(`[checkSurvey] 學生已填寫問卷，允許預約`);
      return next();
    }
    
    // 如果未填寫問卷，返回409狀態碼
    const errorCode = eventType === 'English Table' 
      ? 'ENGLISH_TABLE_SURVEY_REQUIRED' 
      : eventType === 'English Club'
      ? 'ENGLISH_CLUB_SURVEY_REQUIRED'
      : 'SURVEY_REQUIRED';
    
    console.log(`[checkSurvey] 學生未填寫問卷，返回錯誤: ${errorCode}, redirectUrl: ${redirectUrl}, surveyId: ${surveySetting.surveyId}`);
    
    return res.status(409).json({
      error: `請先完成${surveyName}問卷調查才能進行預約`,
      code: errorCode,
      redirectUrl: redirectUrl,
      surveyId: actualSurveyId  // 返回映射後的實際問卷ID
    });
    
  } catch (error) {
    console.error('[checkSurvey] error:', error);
    return res.status(500).json({
      message: '問卷檢查失敗，請稍後再試',
      code: 'SURVEY_CHECK_FAILED'
    });
  }
}

/**
 * 檢查English Table問卷中間件（向後相容）
 */
async function checkEnglishTableSurvey(req, res, next) {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return next();
    }
    
    const semester = getCurrentSemester();
    const surveyResponse = await EnglishTableSurveyResponse.findOne({
      where: { studentId, semester },
    });
    
    if (surveyResponse) {
      return next();
    }
    
    return res.status(409).json({
      error: '請先完成English Table問卷調查才能進行預約',
      code: 'ENGLISH_TABLE_SURVEY_REQUIRED',
      redirectUrl: '/survey/english_table_feedback_114_1'
    });
    
  } catch (error) {
    console.error('checkEnglishTableSurvey 中間件錯誤:', error);
    return next();
  }
}

/**
 * 檢查English Club問卷中間件
 */
async function checkEnglishClubSurvey(req, res, next) {
  try {
    const { studentId } = req.body;
    
    if (!studentId) {
      return next();
    }
    
    const semester = getCurrentSemester();
    const surveyResponse = await EnglishClubSurveyResponse.findOne({
      where: { studentId, semester },
    });
    
    if (surveyResponse) {
      return next();
    }
    
    return res.status(409).json({
      error: '請先完成English Club問卷調查才能進行預約',
      code: 'ENGLISH_CLUB_SURVEY_REQUIRED',
      redirectUrl: '/survey/english_club_feedback_114_1'
    });
    
  } catch (error) {
    console.error('checkEnglishClubSurvey 中間件錯誤:', error);
    return next();
  }
}

module.exports = {
  checkSurvey,
  checkEnglishTableSurvey,
  checkEnglishClubSurvey
};
