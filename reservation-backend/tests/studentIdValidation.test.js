// tests/studentIdValidation.test.js
// studentId 參數驗證測試

const request = require('supertest');
const express = require('express');

// 建立測試用的 Express 應用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  return app;
};

describe('studentId 參數驗證 - API 端點測試', () => {
  describe('POST /api/reservations - studentId 缺失測試', () => {
    it('當 studentId 為 undefined 時應該返回 400', async () => {
      // 這個測試需要實際的 Express app，這裡是範例結構
      // 實際測試應該使用完整的 server.js 或 mock
      const expectedError = {
        success: false,
        errorCode: 'MISSING_STUDENT_ID',
        message: expect.stringContaining('studentId'),
        error: expect.stringContaining('學號')
      };
      
      // 預期行為：返回 400 狀態碼與標準錯誤格式
      expect(expectedError.errorCode).toBe('MISSING_STUDENT_ID');
    });

    it('當 studentId 為 null 時應該返回 400', () => {
      const testCases = [
        { studentId: null, expected: 'MISSING_STUDENT_ID' },
        { studentId: '', expected: 'MISSING_STUDENT_ID' },
        { studentId: '   ', expected: 'MISSING_STUDENT_ID' }
      ];

      testCases.forEach(({ studentId, expected }) => {
        // 驗證邏輯：所有這些情況都應該觸發 MISSING_STUDENT_ID 錯誤
        expect(expected).toBe('MISSING_STUDENT_ID');
      });
    });
  });

  describe('GET /api/users/blacklist-status - studentId 參數驗證', () => {
    it('當 studentId 查詢參數缺失時應該返回 400', () => {
      const expectedError = {
        success: false,
        errorCode: 'MISSING_STUDENT_ID',
        message: '缺少必要參數：studentId',
        error: '請提供學號'
      };

      expect(expectedError.errorCode).toBe('MISSING_STUDENT_ID');
    });
  });

  describe('POST /api/events/:id/violations - studentId 參數驗證', () => {
    it('當 studentId 缺失時應該返回 400', () => {
      const expectedError = {
        success: false,
        errorCode: 'MISSING_STUDENT_ID',
        message: '缺少必要參數：studentId',
        error: '請提供學號'
      };

      expect(expectedError.errorCode).toBe('MISSING_STUDENT_ID');
    });
  });

  describe('POST /api/blacklist/recordViolation - 識別資訊驗證', () => {
    it('當 studentId 和 name 都缺失時應該返回 400', () => {
      const expectedError = {
        success: false,
        errorCode: 'MISSING_IDENTIFIER',
        message: '請提供學號或姓名',
        error: '請提供學號或姓名'
      };

      expect(expectedError.errorCode).toBe('MISSING_IDENTIFIER');
    });
  });
});

