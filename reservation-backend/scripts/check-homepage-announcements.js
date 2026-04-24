/**
 * 查詢首頁「最新公告」實際會顯示的前 N 筆（與 announcementService.listPublished 條件／排序一致）
 * 用法：cd reservation-backend && node scripts/check-homepage-announcements.js [N]
 */
require('dotenv').config();
const { Op } = require('sequelize');
const { sequelize, Announcement } = require('../models');
const { ANNOUNCEMENT_STATUS } = require('../constants/announcementConstants');

const n = Math.min(Math.max(parseInt(process.argv[2], 10) || 3, 1), 100);

async function run() {
  await sequelize.authenticate();
  const now = new Date();
  const rows = await Announcement.findAll({
    where: {
      deletedAt: null,
      status: ANNOUNCEMENT_STATUS.PUBLISHED,
      isPublished: true,
      publishedAt: { [Op.ne]: null },
      [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: now } }],
    },
    order: [
      ['isPinned', 'DESC'],
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: n,
    attributes: ['id', 'title', 'slug', 'status', 'isPublished', 'isPinned', 'publishedAt', 'createdAt', 'updatedAt'],
    raw: true,
  });
  console.log(
    `首頁邏輯下前 ${n} 筆（status=published、未刪除、未過期；排序 isPinned DESC, publishedAt DESC, id DESC）：\n`
  );
  rows.forEach((r, i) => {
    console.log(`${i + 1}. title=${JSON.stringify(r.title)}`);
    console.log(`   publishedAt=${r.publishedAt} isPinned=${r.isPinned} slug=${JSON.stringify(r.slug)} id=${r.id}`);
  });
  if (rows.length === 0) {
    console.log('（無符合條件的公告）');
  }
  await sequelize.close();
}

run().catch((e) => {
  console.error('查詢失敗:', e.message);
  process.exit(1);
});
