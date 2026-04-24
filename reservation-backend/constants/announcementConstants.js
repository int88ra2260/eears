/**
 * 公告模組：狀態、分類、受眾等常數（前後端語意對齊用）
 * 前台 badge / 後台列表請沿用 ANNOUNCEMENT_STATUS_LABELS
 */

const ANNOUNCEMENT_STATUS = Object.freeze({
  DRAFT: 'draft',
  SCHEDULED: 'scheduled',
  PUBLISHED: 'published',
  UNPUBLISHED: 'unpublished',
  ARCHIVED: 'archived',
});

const ANNOUNCEMENT_STATUS_LIST = Object.freeze(Object.values(ANNOUNCEMENT_STATUS));

/** @type {Record<string, string>} */
const ANNOUNCEMENT_STATUS_LABELS = Object.freeze({
  draft: '草稿',
  scheduled: '已排程',
  published: '已發布',
  unpublished: '已下架',
  archived: '已封存',
});

/** 前台／後台分類白名單 */
const ANNOUNCEMENT_CATEGORIES = Object.freeze([
  'general',
  'activity',
  'policy',
  'system',
  'emergency',
]);

const ANNOUNCEMENT_CATEGORY_LABELS = Object.freeze({
  general: '一般',
  activity: '活動',
  policy: '政策',
  system: '系統',
  emergency: '緊急',
});

const AUDIENCE_TYPES = Object.freeze({
  ALL: 'all',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  ADMINS: 'admins',
});

const AUDIENCE_TYPE_LIST = Object.freeze(Object.values(AUDIENCE_TYPES));

const SEO_TITLE_MAX = 200;
const SEO_DESC_MAX = 500;
const COVER_ALT_MAX = 255;
const TAG_MAX = 20;
const TAG_ITEM_MAX = 40;
const CATEGORY_MAX = 64;

module.exports = {
  ANNOUNCEMENT_STATUS,
  ANNOUNCEMENT_STATUS_LIST,
  ANNOUNCEMENT_STATUS_LABELS,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  AUDIENCE_TYPES,
  AUDIENCE_TYPE_LIST,
  SEO_TITLE_MAX,
  SEO_DESC_MAX,
  COVER_ALT_MAX,
  TAG_MAX,
  TAG_ITEM_MAX,
  CATEGORY_MAX,
};
