// tests/checkSurvey.test.js — 與 checkSurvey 實作對齊（eventId + Event、SurveySettings.findAll、產品化 gate 走 legacy mock）

const { checkSurvey } = require('../middlewares/checkSurvey');
const { EnglishTableSurveyResponse, EnglishClubSurveyResponse, SurveySettings, Event } = require('../models');

jest.mock('../utils/featureFlags', () => ({
  getFeatureFlag: jest.fn().mockResolvedValue(true),
}));

jest.mock('../utils/semester', () => ({
  getCurrentSemester: jest.fn(() => '114-1'),
  isValidSemester: jest.fn((s) => /^\d{3}-[12]$/.test(String(s || ''))),
}));

jest.mock('../services/surveyGateService', () => ({
  resolveGateContext: jest.fn().mockResolvedValue({ mode: 'legacy' }),
  hasCompletedForGate: jest.fn(),
}));

jest.mock('../models', () => ({
  Event: { findByPk: jest.fn() },
  EnglishTableSurveyResponse: { findOne: jest.fn() },
  EnglishClubSurveyResponse: { findOne: jest.fn() },
  SurveySettings: { findAll: jest.fn() },
}));

const etSetting = {
  surveyId: 'survey_1',
  surveyName: 'ET',
  isEnabled: true,
  isRequired: true,
  relatedEventTypes: ['English Table'],
  startDate: null,
  endDate: null,
};

describe('checkSurvey Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: { eventId: 1, studentId: 'B123456789' },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
    Event.findByPk.mockResolvedValue({ id: 1, eventType: 'English Table' });
  });

  describe('studentId 參數驗證', () => {
    it('當 studentId 為 undefined 時應該跳過檢查', async () => {
      req.body.studentId = undefined;
      await checkSurvey(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('當 studentId 為空字串時應該跳過檢查', async () => {
      req.body.studentId = '';
      await checkSurvey(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('問卷 Gate 邏輯（legacy survey_settings）', () => {
    it('當沒有 eventId 時應該跳過檢查', async () => {
      delete req.body.eventId;
      await checkSurvey(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(Event.findByPk).not.toHaveBeenCalled();
    });

    it('當找不到活動時應回 404', async () => {
      Event.findByPk.mockResolvedValue(null);
      await checkSurvey(req, res, next);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(next).not.toHaveBeenCalled();
    });

    it('當問卷設定列表為空時應該跳過檢查', async () => {
      SurveySettings.findAll.mockResolvedValue([]);
      await checkSurvey(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(EnglishTableSurveyResponse.findOne).not.toHaveBeenCalled();
    });

    it('當問卷不是必填時應該跳過檢查', async () => {
      SurveySettings.findAll.mockResolvedValue([{ ...etSetting, isRequired: false }]);
      await checkSurvey(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(EnglishTableSurveyResponse.findOne).not.toHaveBeenCalled();
    });

    it('當學生已填寫問卷時應該通過', async () => {
      SurveySettings.findAll.mockResolvedValue([etSetting]);
      EnglishTableSurveyResponse.findOne.mockResolvedValue({ id: 1 });
      await checkSurvey(req, res, next);
      expect(EnglishTableSurveyResponse.findOne).toHaveBeenCalledWith({
        where: { studentId: 'B123456789', semester: '114-1' },
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('當學生未填寫問卷時應該返回 409', async () => {
      SurveySettings.findAll.mockResolvedValue([etSetting]);
      EnglishTableSurveyResponse.findOne.mockResolvedValue(null);
      await checkSurvey(req, res, next);
      expect(EnglishTableSurveyResponse.findOne).toHaveBeenCalledWith({
        where: { studentId: 'B123456789', semester: '114-1' },
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ENGLISH_TABLE_SURVEY_REQUIRED',
          redirectUrl: '/survey/english_table_feedback_114_1',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('當活動類型為 English Club 時應該檢查 English Club 問卷', async () => {
      Event.findByPk.mockResolvedValue({ id: 1, eventType: 'English Club' });
      SurveySettings.findAll.mockResolvedValue([
        {
          surveyId: 'survey_2',
          surveyName: 'EC',
          isEnabled: true,
          isRequired: true,
          relatedEventTypes: ['English Club'],
          startDate: null,
          endDate: null,
        },
      ]);
      EnglishClubSurveyResponse.findOne.mockResolvedValue(null);
      await checkSurvey(req, res, next);
      expect(EnglishClubSurveyResponse.findOne).toHaveBeenCalledWith({
        where: { studentId: 'B123456789', semester: '114-1' },
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'ENGLISH_CLUB_SURVEY_REQUIRED',
          redirectUrl: '/survey/english_club_feedback_114_1',
        })
      );
    });

    it('當活動類型為其他時應該跳過檢查', async () => {
      Event.findByPk.mockResolvedValue({ id: 1, eventType: 'Job Talk' });
      await checkSurvey(req, res, next);
      expect(SurveySettings.findAll).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe('錯誤處理（fail-closed）', () => {
    it('當 survey_settings 查詢失敗時應回 500', async () => {
      SurveySettings.findAll.mockRejectedValue(new Error('Database error'));
      await checkSurvey(req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'SURVEY_CHECK_FAILED',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
