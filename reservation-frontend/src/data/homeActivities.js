/**
 * 首頁活動總覽靜態資料（活動卡）
 * 可後續改為 API 或 CMS
 */
import { EVENT_TYPES } from '../constants/eventTypes';

export const HOME_ACTIVITIES = [
  {
    id: 'english-table',
    type: EVENT_TYPES.ENGLISH_TABLE,
    titleKey: 'activities.englishTable',
    introKey: 'activities.etDesc',
    cta: 'reserve', // reserve | learn
  },
  {
    id: 'english-club',
    type: EVENT_TYPES.ENGLISH_CLUB,
    titleKey: 'activities.englishClub',
    introKey: 'activities.ecDesc',
    cta: 'reserve',
  },
  {
    id: 'international-forum',
    type: EVENT_TYPES.INTERNATIONAL_FORUM,
    titleKey: 'activities.internationalForum',
    introKey: 'activities.ifDesc',
    cta: 'reserve',
  },
  {
    id: 'job-talk',
    type: EVENT_TYPES.JOB_TALK,
    titleKey: 'activities.jobTalk',
    introKey: 'activities.jtDesc',
    cta: 'learn',
  },
];
