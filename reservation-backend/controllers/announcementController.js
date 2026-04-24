// 前台公告 API（公開讀取）
const announcementService = require('../services/announcementService');

async function list(req, res, next) {
  try {
    const { limit, page, keyword, q, category, tag, pinnedFirst } = req.query;
    const data = await announcementService.listPublicAnnouncements({
      limit,
      page,
      keyword,
      q,
      category,
      tag,
      pinnedFirst: pinnedFirst === undefined ? true : pinnedFirst,
    });
    return res.json(data);
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const row = await announcementService.getPublishedByParam(req.params.idOrSlug);
    if (!row) {
      return res.status(404).json({ error: '公告不存在或尚未發布' });
    }
    return res.json(row);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, getById };
