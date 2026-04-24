// tests/settings.test.js
const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { secretKey } = require('../middlewares/auth');

// 模擬測試用的 Express 應用
const app = express();
app.use(express.json());

// 模擬 Setting 模型
const mockSetting = {
  findOne: jest.fn(),
  findOrCreate: jest.fn(),
  create: jest.fn(),
  update: jest.fn()
};

// 模擬 models
jest.mock('../models', () => ({
  Setting: mockSetting
}));

// 引入路由
const settingsRouter = require('../routes/settingsRouter');
app.use('/api/settings', settingsRouter);

describe('Settings API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/settings/survey-required', () => {
    it('應該返回 survey_required 設定為 false', async () => {
      mockSetting.findOne.mockResolvedValue({ value: 'false' });

      const response = await request(app)
        .get('/api/settings/survey-required');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ enabled: false });
    });

    it('應該返回 survey_required 設定為 true', async () => {
      mockSetting.findOne.mockResolvedValue({ value: 'true' });

      const response = await request(app)
        .get('/api/settings/survey-required');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ enabled: true });
    });

    it('當設定不存在時應該返回 false', async () => {
      mockSetting.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/settings/survey-required');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ enabled: false });
    });
  });

  describe('PUT /api/settings/survey-required', () => {
    const adminToken = jwt.sign({ role: 'admin', user: 'test' }, secretKey);

    it('管理員應該能夠更新設定為 true', async () => {
      const mockSettingInstance = { update: jest.fn() };
      mockSetting.findOrCreate.mockResolvedValue([mockSettingInstance, false]);

      const response = await request(app)
        .put('/api/settings/survey-required')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: '設定已更新',
        enabled: true
      });
    });

    it('管理員應該能夠更新設定為 false', async () => {
      const mockSettingInstance = { update: jest.fn() };
      mockSetting.findOrCreate.mockResolvedValue([mockSettingInstance, false]);

      const response = await request(app)
        .put('/api/settings/survey-required')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: false });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: '設定已更新',
        enabled: false
      });
    });

    it('非管理員應該被拒絕', async () => {
      const userToken = jwt.sign({ role: 'user', user: 'test' }, secretKey);

      const response = await request(app)
        .put('/api/settings/survey-required')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ enabled: true });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: '需要管理員權限' });
    });

    it('未提供 token 應該被拒絕', async () => {
      const response = await request(app)
        .put('/api/settings/survey-required')
        .send({ enabled: true });

      expect(response.status).toBe(401);
    });

    it('無效的 enabled 值應該被拒絕', async () => {
      const response = await request(app)
        .put('/api/settings/survey-required')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ enabled: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'enabled 必須為布林值' });
    });
  });
});


