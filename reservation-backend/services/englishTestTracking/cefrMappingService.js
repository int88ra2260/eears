'use strict';

const EXAM_TYPES = ['BESTEP', 'TOEIC', 'TOEIC_SW', 'IELTS', 'TOEFL_IBT', 'GEPT'];
const SKILLS = ['listening', 'reading', 'speaking', 'writing'];
const CEFR_RANKS = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6
};

const SCORE_THRESHOLDS = {
  BESTEP: {
    listening: [
      { min: 130, cefr: 'C1' },
      { min: 100, cefr: 'B2' },
      { min: 70, cefr: 'B1' }
    ],
    reading: [
      { min: 130, cefr: 'C1' },
      { min: 100, cefr: 'B2' },
      { min: 70, cefr: 'B1' }
    ],
    speaking: [
      { min: 330, cefr: 'C1' },
      { min: 280, cefr: 'B2' }
    ],
    writing: [
      { min: 330, cefr: 'C1' },
      { min: 280, cefr: 'B2' }
    ]
  },
  TOEIC: {
    listening: [
      { min: 490, cefr: 'C1' },
      { min: 400, cefr: 'B2' }
    ]
  },
  TOEIC_SW: {},
  IELTS: {
    listening: [
      { min: 7, cefr: 'C1' },
      { min: 5.5, cefr: 'B2' }
    ],
    reading: [
      { min: 7, cefr: 'C1' },
      { min: 5.5, cefr: 'B2' }
    ],
    speaking: [
      { min: 7, cefr: 'C1' },
      { min: 5.5, cefr: 'B2' }
    ],
    writing: [
      { min: 7, cefr: 'C1' },
      { min: 5.5, cefr: 'B2' }
    ]
  },
  TOEFL_IBT: {
    listening: [
      { min: 22, cefr: 'C1' },
      { min: 17, cefr: 'B2' }
    ]
  },
  GEPT: {}
};

function normalizeExamType(input) {
  if (input == null) return null;
  const normalized = String(input).trim().replace(/\s+/g, '_').toUpperCase();
  return EXAM_TYPES.includes(normalized) ? normalized : null;
}

function normalizeSkill(input) {
  if (input == null) return null;
  const normalized = String(input).trim().toLowerCase();
  return SKILLS.includes(normalized) ? normalized : null;
}

/**
 * CEFR 比序用 rank（整數）。支援 Excel 常見的 A1+、B2+ 等：以去掉「+」的基底等級對照，
 * 與匯入層註解一致（B2+ 與 B2 同基底 rank，再以考試日期／attemptId 決勝）。
 */
function getCefrRank(cefr) {
  if (cefr == null) return null;
  let normalized = String(cefr).trim().toUpperCase();
  if (normalized.endsWith('+')) {
    normalized = normalized.slice(0, -1);
  }
  return CEFR_RANKS[normalized] || null;
}

const RANK_TO_CEFR = {
  1: 'A1',
  2: 'A2',
  3: 'B1',
  4: 'B2',
  5: 'C1',
  6: 'C2'
};

/**
 * 由數字 rank 反查 CEFR 標籤（與 CEFR_RANKS 對稱）
 * @param {number|string|null|undefined} rank
 * @returns {string|null}
 */
function getCefrFromRank(rank) {
  if (rank == null || rank === '') return null;
  const n = Number(rank);
  if (!Number.isFinite(n)) return null;
  const r = Math.round(n);
  return RANK_TO_CEFR[r] || null;
}

function parseRawScore(rawScore) {
  if (rawScore == null || rawScore === '') return null;
  const score = Number(rawScore);
  if (!Number.isFinite(score)) return null;
  return score;
}

function mapScoreToCefr(examType, skill, rawScore) {
  const normalizedExamType = normalizeExamType(examType);
  const normalizedSkill = normalizeSkill(skill);
  const score = parseRawScore(rawScore);

  const base = {
    examType: normalizedExamType,
    skill: normalizedSkill,
    rawScore: score,
    cefr: null,
    cefrRank: null,
    isMapped: false,
    reason: null
  };

  if (!normalizedExamType) {
    return { ...base, reason: 'UNSUPPORTED_EXAM_TYPE' };
  }

  if (!normalizedSkill) {
    return { ...base, reason: 'UNSUPPORTED_SKILL' };
  }

  if (score == null) {
    return { ...base, reason: 'INVALID_RAW_SCORE' };
  }

  if (normalizedExamType === 'GEPT') {
    return { ...base, reason: 'GEPT_NOT_AUTO_MAPPABLE' };
  }

  const examMappings = SCORE_THRESHOLDS[normalizedExamType] || {};
  const rules = examMappings[normalizedSkill];
  if (!Array.isArray(rules) || rules.length === 0) {
    return { ...base, reason: 'MAPPING_NOT_DEFINED' };
  }

  const matched = rules.find((rule) => score >= rule.min);
  if (!matched) {
    return { ...base, reason: 'BELOW_MIN_THRESHOLD' };
  }

  const cefr = matched.cefr;
  return {
    ...base,
    cefr,
    cefrRank: getCefrRank(cefr),
    isMapped: true,
    reason: 'MAPPED'
  };
}

module.exports = {
  EXAM_TYPES,
  SKILLS,
  CEFR_RANKS,
  SCORE_THRESHOLDS,
  normalizeExamType,
  getCefrRank,
  getCefrFromRank,
  mapScoreToCefr
};
