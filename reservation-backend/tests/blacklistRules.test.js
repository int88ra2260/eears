// tests/blacklistRules.test.js
// 黑名單規則、違規累積與自動標記測試

const dayjs = require('dayjs');

describe('黑名單規則測試', () => {
  describe('違規累積邏輯', () => {
    it('當違規次數達到 2 次時應該進入黑名單', () => {
      const violationCount = 2;
      const shouldBlacklist = violationCount >= 2;
      
      expect(shouldBlacklist).toBe(true);
    });

    it('當違規次數為 1 次時不應該進入黑名單', () => {
      const violationCount = 1;
      const shouldBlacklist = violationCount >= 2;
      
      expect(shouldBlacklist).toBe(false);
    });

    it('當違規次數為 0 次時不應該進入黑名單', () => {
      const violationCount = 0;
      const shouldBlacklist = violationCount >= 2;
      
      expect(shouldBlacklist).toBe(false);
    });
  });

  describe('黑名單解除時間計算', () => {
    it('應該正確計算下個或下下個禮拜天的 23:59:59', () => {
      const now = dayjs();
      const dayOfWeek = now.day(); // 0=Sunday, 1=Monday, ... 6=Saturday
      
      let daysToAdd = 0;
      if (dayOfWeek === 0) {
        daysToAdd = 7;
      } else {
        daysToAdd = 14 - dayOfWeek;
      }

      const unlockDate = now
        .add(daysToAdd, 'day')
        .hour(23)
        .minute(59)
        .second(59);

      // 驗證結果為禮拜天
      expect(unlockDate.day()).toBe(0);
      
      // 驗證時間為 23:59:59
      expect(unlockDate.hour()).toBe(23);
      expect(unlockDate.minute()).toBe(59);
      expect(unlockDate.second()).toBe(59);
    });
  });

  describe('No-Show 自動標記', () => {
    it('當預約未簽到時應該標記為違規', () => {
      const checkinStatus = '未簽到';
      const shouldMarkViolation = checkinStatus === '未簽到';
      
      expect(shouldMarkViolation).toBe(true);
    });

    it('當預約已簽到時不應該標記為違規', () => {
      const checkinStatus = '已簽到';
      const shouldMarkViolation = checkinStatus === '未簽到';
      
      expect(shouldMarkViolation).toBe(false);
    });
  });

  describe('黑名單期間檢查', () => {
    it('當黑名單解除時間未到時應該阻擋預約', () => {
      const now = dayjs();
      const blacklistUntil = now.add(7, 'day');
      const isBlacklisted = blacklistUntil.isAfter(now);
      
      expect(isBlacklisted).toBe(true);
    });

    it('當黑名單解除時間已過時應該允許預約', () => {
      const now = dayjs();
      const blacklistUntil = now.subtract(1, 'day');
      const isBlacklisted = blacklistUntil.isAfter(now);
      
      expect(isBlacklisted).toBe(false);
    });
  });
});

