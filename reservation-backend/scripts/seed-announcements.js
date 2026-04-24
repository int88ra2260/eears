/**
 * 種子：產品級公告範例（草稿／排程／已發布／下架／封存、分類與標籤）
 * 用法：node scripts/seed-announcements.js
 * 需先執行 migration：20260410180000-announcements-product-module.js
 */
require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize, Announcement } = require('../models');
const { ANNOUNCEMENT_STATUS } = require('../constants/announcementConstants');

const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

const rows = [
  {
    title: '【草稿】春季活動預告（尚未發布）',
    slug: 'spring-events-draft',
    summary: null,
    content: '此為草稿內容，正式發布前不會顯示於前台。',
    coverImage: null,
    coverImageAlt: null,
    isPublished: false,
    status: ANNOUNCEMENT_STATUS.DRAFT,
    publishedAt: null,
    scheduledPublishAt: null,
    category: 'activity',
    tags: ['活動', '預告'],
    isPinned: false,
    sortOrder: 0,
  },
  {
    title: '【已排程】下週系統維護通知',
    slug: 'scheduled-maintenance-notice',
    summary: '維護時段將另行公告。',
    content: '系統將於排程時間進行維護，期間可能短暫無法預約。',
    coverImage: null,
    isPublished: false,
    status: ANNOUNCEMENT_STATUS.SCHEDULED,
    publishedAt: null,
    scheduledPublishAt: future,
    category: 'system',
    tags: ['維護'],
    isPinned: false,
    sortOrder: 0,
  },
  {
    title: '【已發布】歡迎使用 EEARS 活動預約系統',
    slug: 'welcome-eears-system',
    summary: '系統已上線，歡迎師生使用線上預約與問卷功能。',
    content:
      '歡迎使用 EEARS 活動預約系統。\n\n您可於首頁瀏覽最新活動、完成問卷與管理個人預約。如有問題請洽管理員。',
    coverImage: null,
    isPublished: true,
    status: ANNOUNCEMENT_STATUS.PUBLISHED,
    publishedAt: new Date('2025-01-10T09:00:00+08:00'),
    scheduledPublishAt: null,
    category: 'general',
    tags: ['EEARS', '預約'],
    isPinned: true,
    sortOrder: 0,
    seoTitle: '歡迎使用 EEARS',
    seoDescription: '英語增能活動預約系統已上線。',
  },
  {
    title: '【已發布】寒假服務時間調整公告',
    slug: 'winter-break-hours',
    summary: '寒假期間諮詢窗口時間將略有調整，請留意。',
    content:
      '各位同學好，\n\n寒假期間（示例日期）諮詢服務改為每週二、四下午開放。造成不便敬請見諒。',
    coverImage: null,
    isPublished: true,
    status: ANNOUNCEMENT_STATUS.PUBLISHED,
    publishedAt: new Date('2025-02-01T10:00:00+08:00'),
    scheduledPublishAt: null,
    category: 'policy',
    tags: ['寒假'],
    isPinned: false,
    sortOrder: 0,
  },
  {
    title: '【已下架】舊版預約規則說明',
    slug: 'legacy-reservation-rules',
    summary: '歷史規則，已下架僅供稽核。',
    content: '本則曾於前台發布，目前已下架。',
    coverImage: null,
    isPublished: false,
    status: ANNOUNCEMENT_STATUS.UNPUBLISHED,
    publishedAt: new Date('2024-08-01T12:00:00+08:00'),
    unpublishedAt: new Date('2024-09-01T12:00:00+08:00'),
    scheduledPublishAt: null,
    category: 'policy',
    tags: ['歷史'],
    isPinned: false,
    sortOrder: 0,
  },
  {
    title: '【已封存】2023 年度公告彙整',
    slug: 'archived-2023-bulletin',
    summary: '封存資料，不顯示於前台。',
    content: '此公告已封存，僅後台可見。',
    coverImage: null,
    isPublished: false,
    status: ANNOUNCEMENT_STATUS.ARCHIVED,
    publishedAt: new Date('2023-12-01T10:00:00+08:00'),
    scheduledPublishAt: null,
    category: 'general',
    tags: [],
    isPinned: false,
    sortOrder: 0,
  },
  {
    title: '【置頂示例】重要：帳號安全與密碼政策',
    slug: 'account-security-policy',
    summary: '請定期更新密碼並勿分享帳號。',
    content:
      '為保障帳號安全，請定期更新密碼。若收到可疑連結請勿點擊，並通知管理員。\n\n本則為置頂測試資料。',
    coverImage: null,
    isPublished: true,
    status: ANNOUNCEMENT_STATUS.PUBLISHED,
    publishedAt: new Date('2024-12-01T08:00:00+08:00'),
    category: 'policy',
    tags: ['安全'],
    isPinned: true,
    sortOrder: 1,
  },
  {
    title: '【較舊】舊年度系統維護紀錄',
    slug: 'legacy-maintenance-2023',
    summary: '歷史公告保留測試。',
    content: '此為較早發布之測試公告，用於驗證列表排序與分頁。',
    coverImage: null,
    isPublished: true,
    status: ANNOUNCEMENT_STATUS.PUBLISHED,
    publishedAt: new Date('2023-06-15T14:00:00+08:00'),
    category: 'system',
    tags: [],
    isPinned: false,
    sortOrder: 0,
  },
];

async function run() {
  await sequelize.authenticate();
  for (const r of rows) {
    const [row, created] = await Announcement.findOrCreate({
      where: { slug: r.slug },
      defaults: {
        ...r,
        audienceType: 'all',
        shouldSendNotification: false,
        shouldSendEmail: false,
        viewCount: 0,
      },
    });
    if (!created) {
      await row.update({
        ...r,
        audienceType: 'all',
        shouldSendNotification: false,
        shouldSendEmail: false,
      });
    }
  }
  console.log('✅ seed-announcements 完成（依 slug findOrCreate）');
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
