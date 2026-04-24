// src/constants/eventTypes.js
// 活動類型常數定義

export const EVENT_TYPES = {
  ENGLISH_TABLE: 'English Table',
  JOB_TALK: 'Job Talk',
  ENGLISH_CLUB: 'English Club',
  INTERNATIONAL_FORUM: 'International Forum'
};

export const EVENT_TYPE_LIST = Object.values(EVENT_TYPES);

export const EVENT_TYPE_ABBREVIATIONS = {
  [EVENT_TYPES.ENGLISH_TABLE]: 'ET',
  [EVENT_TYPES.JOB_TALK]: 'JT',
  [EVENT_TYPES.ENGLISH_CLUB]: 'EC',
  [EVENT_TYPES.INTERNATIONAL_FORUM]: 'IF'
};

export const DEFAULT_EVENT_TYPE = EVENT_TYPES.ENGLISH_TABLE;

export const getEventAbbreviation = (eventType) => {
  return EVENT_TYPE_ABBREVIATIONS[eventType] || eventType;
};

