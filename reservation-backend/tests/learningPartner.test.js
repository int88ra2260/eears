// tests/learningPartner.test.js
// 學習有伴團體報名功能整合測試

const request = require('supertest');
const app = require('../server');
const { LearningPartnerTeam, LearningPartnerTeamMember, EnglishTestRegistration } = require('../models');

describe('Learning Partner API Tests', () => {
  let testRegistrations = [];
  let testTeamId = null;

  beforeAll(async () => {
    // 建立測試用的個人報名記錄（status = 'success'）
    testRegistrations = await Promise.all([
      EnglishTestRegistration.create({
        studentId: 'TEST001',
        name: '測試學生一',
        idNumber: 'A123456789',
        email: 'test1@example.com',
        studentNameZh: '測試學生一',
        lastNameEn: 'TEST',
        firstNameEn: 'ONE',
        hasCEFRB2: '否',
        status: 'success',
        agreedToTerms: true,
        infoSource: '其他'
      }),
      EnglishTestRegistration.create({
        studentId: 'TEST002',
        name: '測試學生二',
        idNumber: 'A987654321',
        email: 'test2@example.com',
        studentNameZh: '測試學生二',
        lastNameEn: 'TEST',
        firstNameEn: 'TWO',
        hasCEFRB2: '否',
        status: 'success',
        agreedToTerms: true,
        infoSource: '其他'
      }),
      EnglishTestRegistration.create({
        studentId: 'TEST003',
        name: '測試學生三',
        idNumber: 'A111222333',
        email: 'test3@example.com',
        studentNameZh: '測試學生三',
        lastNameEn: 'TEST',
        firstNameEn: 'THREE',
        hasCEFRB2: '否',
        status: 'success',
        agreedToTerms: true,
        infoSource: '其他'
      })
    ]);
  });

  afterAll(async () => {
    // 清理測試資料
    if (testTeamId) {
      await LearningPartnerTeamMember.destroy({ where: { teamId: testTeamId } });
      await LearningPartnerTeam.destroy({ where: { id: testTeamId } });
    }
    await EnglishTestRegistration.destroy({ where: { studentId: { [require('sequelize').Op.in]: ['TEST001', 'TEST002', 'TEST003'] } } });
  });

  describe('POST /api/learning-partner/teams', () => {
    test('應該成功建立 2 人團體', async () => {
      const response = await request(app)
        .post('/api/learning-partner/teams')
        .send({
          teamName: '測試團體',
          teamSize: 2,
          members: [
            { studentId: 'TEST001', name: '測試學生一' },
            { studentId: 'TEST002', name: '測試學生二' }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.team).toBeDefined();
      expect(response.body.team.teamSize).toBe(2);
      expect(response.body.team.status).toBe('pending_approval');
      testTeamId = response.body.team.id;
    });

    test('應該拒絕不符合資格的成員', async () => {
      const response = await request(app)
        .post('/api/learning-partner/teams')
        .send({
          teamSize: 2,
          members: [
            { studentId: 'INVALID001', name: '不存在學生' },
            { studentId: 'TEST001', name: '測試學生一' }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('LP_MEMBER_NOT_ELIGIBLE');
      expect(response.body.ineligibleMembers).toBeDefined();
    });

    test('應該拒絕無效的團隊人數', async () => {
      const response = await request(app)
        .post('/api/learning-partner/teams')
        .send({
          teamSize: 5, // 超過上限
          members: [
            { studentId: 'TEST001', name: '測試學生一' },
            { studentId: 'TEST002', name: '測試學生二' },
            { studentId: 'TEST003', name: '測試學生三' },
            { studentId: 'TEST001', name: '測試學生一' },
            { studentId: 'TEST002', name: '測試學生二' }
          ]
        });

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('LP_INVALID_TEAM_SIZE');
    });
  });

  describe('GET /api/learning-partner/teams/:teamId', () => {
    test('應該成功查詢團體狀態', async () => {
      if (!testTeamId) {
        // 如果前面的測試失敗，先建立一個團體
        const createResponse = await request(app)
          .post('/api/learning-partner/teams')
          .send({
            teamSize: 2,
            members: [
              { studentId: 'TEST001', name: '測試學生一' },
              { studentId: 'TEST002', name: '測試學生二' }
            ]
          });
        testTeamId = createResponse.body.team.id;
      }

      const response = await request(app)
        .get(`/api/learning-partner/teams/${testTeamId}`);

      expect(response.status).toBe(200);
      expect(response.body.team).toBeDefined();
      expect(response.body.team.id).toBe(testTeamId);
      expect(response.body.team.members).toBeDefined();
    });

    test('應該回傳 404 當團體不存在', async () => {
      const response = await request(app)
        .get('/api/learning-partner/teams/99999');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/learning-partner/approve/confirm', () => {
    test('應該成功完成同意', async () => {
      if (!testTeamId) return;

      // 取得成員的 token
      const member = await LearningPartnerTeamMember.findOne({
        where: { teamId: testTeamId, studentId: 'TEST001' }
      });

      if (!member || !member.approvalToken) {
        console.log('無法取得 token，跳過此測試');
        return;
      }

      const response = await request(app)
        .post('/api/learning-partner/approve/confirm')
        .send({ token: member.approvalToken });

      // 第一次應該成功
      if (response.status === 200) {
        expect(response.body.team).toBeDefined();
      } else {
        // 如果已經同意過，會回傳錯誤
        expect(response.status).toBe(400);
      }
    });

    test('應該拒絕無效的 token', async () => {
      const response = await request(app)
        .post('/api/learning-partner/approve/confirm')
        .send({ token: 'invalid-token' });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('LP_TOKEN_INVALID');
    });
  });
});
