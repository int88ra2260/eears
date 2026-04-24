/**
 * 輕量單元測試：公告常數與狀態字串穩定（不依賴 DB）
 */
const {
  ANNOUNCEMENT_STATUS,
  ANNOUNCEMENT_STATUS_LIST,
  ANNOUNCEMENT_CATEGORIES,
} = require('../constants/announcementConstants');

describe('announcementConstants', () => {
  test('status list 包含五態', () => {
    expect(ANNOUNCEMENT_STATUS_LIST).toContain('draft');
    expect(ANNOUNCEMENT_STATUS_LIST).toContain('scheduled');
    expect(ANNOUNCEMENT_STATUS_LIST).toContain('published');
    expect(ANNOUNCEMENT_STATUS_LIST).toContain('unpublished');
    expect(ANNOUNCEMENT_STATUS_LIST).toContain('archived');
  });

  test('分類白名單非空', () => {
    expect(ANNOUNCEMENT_CATEGORIES.length).toBeGreaterThan(0);
    expect(ANNOUNCEMENT_CATEGORIES).toContain('general');
  });
});
