/**
 * 活動類型 slug 對應（用於 /activities/:slug 分類頁）
 * 與 EventList 的 activeTab 及 eventTypes 一致
 * 注意：BESTEP 不再與 job-talk 共用，後端支援前請勿加入 bestep
 */
export const ACTIVITY_SLUGS = {
  'english-table': 'english-table',
  'english-club': 'english-club',
  'international-forum': 'international-forum',
  'job-talk': 'job-talk',
};

export const VALID_SLUGS = Object.keys(ACTIVITY_SLUGS);

export function slugToTab(slug) {
  return ACTIVITY_SLUGS[slug] || null;
}

export function isValidActivitySlug(slug) {
  return VALID_SLUGS.includes(slug);
}

/** slug → 翻譯 key（activities.xxx）用於分類頁標題 */
export const SLUG_TO_TITLE_KEY = {
  'english-table': 'activities.englishTable',
  'english-club': 'activities.englishClub',
  'international-forum': 'activities.internationalForum',
  'job-talk': 'activities.jobTalk',
};

export function getCategoryTitleKey(slug) {
  return SLUG_TO_TITLE_KEY[slug] || null;
}
