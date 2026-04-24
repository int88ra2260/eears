const CEFR_RANK_MAP = Object.freeze({
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6
});

const DEFAULT_MAPPING_VERSION = 'ljs-v1';

function getCefrRank(level) {
  if (!level) return null;
  return CEFR_RANK_MAP[String(level).toUpperCase()] || null;
}

function compareBestScoreCandidate(left, right) {
  const leftRank = left && left.cefrRank !== undefined ? Number(left.cefrRank) : -1;
  const rightRank = right && right.cefrRank !== undefined ? Number(right.cefrRank) : -1;
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftRaw = left && left.rawScore !== undefined && left.rawScore !== null ? Number(left.rawScore) : -1;
  const rightRaw = right && right.rawScore !== undefined && right.rawScore !== null ? Number(right.rawScore) : -1;
  if (leftRaw !== rightRaw) {
    return leftRaw - rightRaw;
  }

  const leftDate = left && left.examDate ? new Date(left.examDate).getTime() : 0;
  const rightDate = right && right.examDate ? new Date(right.examDate).getTime() : 0;
  if (leftDate !== rightDate) {
    return leftDate - rightDate;
  }

  const leftId = left && left.id ? Number(left.id) : 0;
  const rightId = right && right.id ? Number(right.id) : 0;
  return leftId - rightId;
}

module.exports = {
  CEFR_RANK_MAP,
  DEFAULT_MAPPING_VERSION,
  getCefrRank,
  compareBestScoreCandidate
};
