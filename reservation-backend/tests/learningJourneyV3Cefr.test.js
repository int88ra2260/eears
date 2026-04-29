/**
 * Phase 2.1：CEFR utilities（不依賴 DB）
 */
const { normalizeCefr, getCefrRank, getCefrFromRank } = require('../services/learningJourney/utils/cefr');

describe('learningJourney/utils/cefr', () => {
  test('normalizeCefr 接受常見空格與 + 級', () => {
    expect(normalizeCefr(' b2+')).toBe('B2');
    expect(normalizeCefr('A1')).toBe('A1');
    expect(normalizeCefr('XX')).toBeNull();
  });

  test('getCefrRank 對應 1～6', () => {
    expect(getCefrRank('A1')).toBe(1);
    expect(getCefrRank('B2')).toBe(4);
    expect(getCefrRank('bad')).toBeNull();
  });

  test('getCefrFromRank 反向對應', () => {
    expect(getCefrFromRank(4)).toBe('B2');
    expect(getCefrFromRank(99)).toBeNull();
  });
});
